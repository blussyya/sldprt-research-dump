#!/usr/bin/env python3
"""Structural parser for the LocalBodies stream, written from the byte layout found in the
corpus (not from the converter's reader).

Grammar (all integers little-endian):
  stream   := u32 entry_count  entry{entry_count}  must end exactly at len(stream)
  entry    := cstring  header  section+
  cstring  := FF FE FF  u8 n  (2*n bytes UTF-16LE)          (n < 0xFF; longer forms rejected here)
  header   := rec10 | u32 0, u32 section_count, rec10       (18 bytes)
  rec10    := u32 flag, u8 0, u32 (next section size + 5), u8 0
  section  := u32 S, GUID(16), u32 inflated, u32 deflated D, zlib[D], 8 zero bytes ; S = D + 32
  between sections of one entry: rec10 with flag 0 (size+5 field = next section S + 5)
Returns a dict with entries, or raises ParseError with the byte offset of the failure.
"""
import struct
import zlib

GUID = bytes.fromhex("231dd571da8148a2a85898b21b89ef99")  # bytes as they appear in the stream


class ParseError(Exception):
    def __init__(self, off, msg):
        super().__init__("offset %d: %s" % (off, msg))
        self.off = off


def _u32(b, o):
    if o + 4 > len(b):
        raise ParseError(o, "u32 past end")
    return struct.unpack_from("<I", b, o)[0]


def _u8(b, o):
    if o + 1 > len(b):
        raise ParseError(o, "u8 past end")
    return b[o]


def read_cstring(b, o):
    if b[o:o + 3] != b"\xff\xfe\xff":
        raise ParseError(o, "CString marker FF FE FF missing: %s" % b[o:o + 3].hex(" "))
    n = _u8(b, o + 3)
    if n == 0xFF:
        raise ParseError(o, "long CString length form not expected")
    raw = b[o + 4:o + 4 + 2 * n]
    if len(raw) != 2 * n:
        raise ParseError(o, "CString runs past end")
    return raw.decode("utf-16-le"), o + 4 + 2 * n


def read_rec10(b, o):
    """Return (flag, size_plus_5, next_offset) for a 10-byte record at o."""
    flag = _u32(b, o)
    z1 = _u8(b, o + 4)
    sp5 = _u32(b, o + 5)
    z2 = _u8(b, o + 9)
    if z1 != 0 or z2 != 0:
        raise ParseError(o, "rec10 zero bytes not zero (%d, %d)" % (z1, z2))
    return flag, sp5, o + 10


def read_section(b, o, expect_sp5=None):
    """Read one section frame at o. Returns dict and next offset."""
    S = _u32(b, o)
    if expect_sp5 is not None and S + 5 != expect_sp5:
        raise ParseError(o, "section size %d does not match header size+5 %d" % (S, expect_sp5))
    end = o + 4 + S
    if end > len(b):
        raise ParseError(o, "section runs past end of stream")
    guid = b[o + 4:o + 20]
    if guid != GUID:
        raise ParseError(o, "GUID mismatch: %s" % guid.hex())
    if end - 8 < o + 20 or b[end - 8:end] != b"\x00" * 8:
        raise ParseError(o, "section does not end with 8 zero bytes")
    # Body: one or more chunks, each u32 inflated, u32 D, zlib[D]. A single-chunk section is
    # the common case (S == D + 32). Chunks run from o+20 up to the 8-byte zero tail.
    pos = o + 20
    chunks = []
    body = []
    while pos < end - 8:
        inflated = _u32(b, pos)
        D = _u32(b, pos + 4)
        if pos + 8 + D > end - 8:
            raise ParseError(pos, "chunk runs into the zero tail")
        d = zlib.decompressobj()
        try:
            out = d.decompress(b[pos + 8:pos + 8 + D])
        except zlib.error as ex:
            raise ParseError(pos, "zlib error: %s" % ex)
        if not d.eof:
            raise ParseError(pos, "zlib stream not terminated inside D bytes")
        if len(out) != inflated:
            raise ParseError(pos, "inflated %d != declared %d" % (len(out), inflated))
        if d.unused_data:
            raise ParseError(pos, "zlib has %d unused bytes inside D" % len(d.unused_data))
        chunks.append(dict(offset=pos, inflated=inflated, D=D))
        body.append(out)
        pos += 8 + D
    if pos != end - 8:
        raise ParseError(pos, "chunks do not end on the zero tail")
    inflated_total = sum(c["inflated"] for c in chunks)
    D_total = sum(c["D"] for c in chunks)
    if S != 16 + sum(8 + c["D"] for c in chunks) + 8:
        raise ParseError(o, "S (%d) != 16 + chunks + 8" % S)
    return dict(offset=o, S=S, inflated=inflated_total, D=D_total, chunks=chunks,
                single_chunk=(len(chunks) == 1), body=b"".join(body)), end


def _sections_after_header(b, o, sp5, n_sec):
    """Read the first section (size checked against sp5), then the following
    'rec10 flag 0 + section' pairs. If n_sec is given, read exactly n_sec sections."""
    sections = []
    sec, o = read_section(b, o, expect_sp5=sp5)
    sections.append(sec)
    while True:
        if n_sec is not None and len(sections) == n_sec:
            break
        if n_sec is None and o >= len(b):
            break
        try:
            f2, sp5b, o3 = read_rec10(b, o)
            if f2 != 0:
                if n_sec is not None:
                    raise ParseError(o, "between-section record has flag %d, not 0" % f2)
                break
            sec2, o4 = read_section(b, o3, expect_sp5=sp5b)
        except ParseError:
            if n_sec is not None:
                raise
            break
        sections.append(sec2)
        o = o4
    return sections, o


def _try_header(b, o, kind):
    """Try one header form at o. Returns (flag, n_sec, sections, next_offset) or raises."""
    if kind == 18:
        if _u32(b, o) != 0:
            raise ParseError(o, "18-byte header: first u32 not zero")
        n_sec = _u32(b, o + 4)
        if n_sec < 1:
            raise ParseError(o, "18-byte header: section count < 1")
        flag, sp5, o2 = read_rec10(b, o + 8)
        sections, o3 = _sections_after_header(b, o2, sp5, n_sec)
        if len(sections) != n_sec:
            raise ParseError(o, "18-byte header: %d sections declared, %d read" % (n_sec, len(sections)))
        return flag, n_sec, sections, o3
    flag, sp5, o2 = read_rec10(b, o)
    sections, o3 = _sections_after_header(b, o2, sp5, None)
    return flag, None, sections, o3


def parse(b):
    """Parse a whole LocalBodies stream. Returns dict with 'entries' and counters.

    For each entry both header forms are tried in full (header plus every section);
    the first form that parses without error is taken. Both-fail raises ParseError.
    """
    n_entries = _u32(b, 0)
    o = 4
    entries = []
    counts = dict(rec10_headers=0, rec18_headers=0, sections=0, rec10_between=0)
    for i in range(n_entries):
        start = o
        name, o_after_name = read_cstring(b, o)
        errs = []
        result = None
        for kind in (18, 10):
            try:
                result = (kind,) + _try_header(b, o_after_name, kind)
                break
            except ParseError as ex:
                errs.append("%d-byte: %s" % (kind, ex))
        if result is None:
            raise ParseError(start, "entry %d (%s) no header form parsed: %s" % (i, name, "; ".join(errs)))
        kind, flag, n_sec, sections, o = result
        counts["rec18_headers" if kind == 18 else "rec10_headers"] += 1
        counts["sections"] += len(sections)
        counts["rec10_between"] += len(sections) - 1
        entries.append(dict(index=i, offset=start, name=name, header=kind, flag=flag,
                            n_sections=len(sections), section_count_declared=n_sec,
                            sections=sections))
    if o != len(b):
        raise ParseError(o, "%d trailing bytes after last entry" % (len(b) - o))
    return dict(entry_count=n_entries, entries=entries, counts=counts, length=len(b))


if __name__ == "__main__":
    import sys
    r = parse(open(sys.argv[1], "rb").read())
    print(r["entry_count"], r["counts"])
    for e in r["entries"]:
        print(e["name"], e["header"], "flag", e["flag"], "sections", e["n_sections"])
