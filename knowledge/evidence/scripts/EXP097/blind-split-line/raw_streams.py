#!/usr/bin/env python3
"""Raw-byte stream extractor for SLDPRT files, written without the package's container code.

Two containers:
  * OLE2 compound file (SW2011 and older): walk the CFB header, FAT, mini FAT and directory.
  * Modern container (SW2015+): scan for the 6-byte pattern 14 00 06 00 08 00 (u16 20, 6, 8 at +4),
    rotate each name byte right by (file byte 7 & 7), inflate the raw DEFLATE body, and check the
    inflated size (+22) and CRC-32 (+14) against the stored values.

Usage: python3 -I raw_streams.py <file.SLDPRT> <out_dir>
Writes each named stream to out_dir/<name>.bin and prints a manifest line per stream.
"""
import os
import struct
import sys
import zlib

ENDOFCHAIN = 0xFFFFFFFE
FREESECT = 0xFFFFFFFF


def read_ole(buf):
    if buf[:8] != bytes([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]):
        raise ValueError("not an OLE2 file")
    sector_shift = struct.unpack_from("<H", buf, 30)[0]
    mini_shift = struct.unpack_from("<H", buf, 32)[0]
    ss = 1 << sector_shift
    mss = 1 << mini_shift
    n_fat = struct.unpack_from("<I", buf, 44)[0]
    dir_start = struct.unpack_from("<I", buf, 48)[0]
    cutoff = struct.unpack_from("<I", buf, 56)[0]
    minifat_start = struct.unpack_from("<I", buf, 60)[0]
    difat = list(struct.unpack_from("<109I", buf, 76))

    def sector(i):
        off = (i + 1) * ss
        return buf[off:off + ss]

    # FAT from the DIFAT entries in the header (enough for files of a few MB).
    fat = []
    for s in [x for x in difat if x not in (FREESECT, ENDOFCHAIN)][:n_fat]:
        fat.extend(struct.unpack("<%dI" % (ss // 4), sector(s)))

    def chain(start, table):
        out, seen, s = [], set(), start
        while s not in (ENDOFCHAIN, FREESECT):
            if s in seen or s >= len(table):
                raise ValueError("bad chain")
            seen.add(s)
            out.append(s)
            s = table[s]
        return out

    dir_bytes = b"".join(sector(s) for s in chain(dir_start, fat))
    entries = []
    for k in range(len(dir_bytes) // 128):
        e = dir_bytes[k * 128:(k + 1) * 128]
        name_len = struct.unpack_from("<H", e, 64)[0]
        name = e[:max(0, name_len - 2)].decode("utf-16-le", errors="replace")
        etype = e[66]
        start = struct.unpack_from("<I", e, 116)[0]
        size = struct.unpack_from("<Q", e, 120)[0]
        entries.append({"name": name, "type": etype, "start": start, "size": size})

    root = next(x for x in entries if x["type"] == 5)
    mini_stream = b"".join(sector(s) for s in chain(root["start"], fat))[:root["size"]]
    minifat = []
    if minifat_start not in (ENDOFCHAIN, FREESECT):
        mf_bytes = b"".join(sector(s) for s in chain(minifat_start, fat))
        minifat = list(struct.unpack("<%dI" % (len(mf_bytes) // 4), mf_bytes))

    streams = {}
    for e in entries:
        if e["type"] != 2:
            continue
        if e["size"] < cutoff:
            parts = []
            for s in chain(e["start"], minifat):
                parts.append(mini_stream[s * mss:(s + 1) * mss])
            data = b"".join(parts)[:e["size"]]
        else:
            data = b"".join(sector(s) for s in chain(e["start"], fat))[:e["size"]]
        streams[e["name"]] = data
    return streams


def read_modern(buf):
    if len(buf) < 30:
        return {}
    key = buf[7]
    magic = bytes([20, 0, 6, 0, 8, 0])
    out = {}
    pos = buf.find(magic)
    while pos != -1:
        sig = pos - 4
        if sig >= 0 and sig + 30 <= len(buf):
            crc = struct.unpack_from("<I", buf, sig + 14)[0]
            comp = struct.unpack_from("<I", buf, sig + 18)[0]
            inflated = struct.unpack_from("<I", buf, sig + 22)[0]
            name_len = struct.unpack_from("<H", buf, sig + 26)[0]
            extra_len = struct.unpack_from("<H", buf, sig + 28)[0]
            d0 = sig + 30 + name_len + extra_len
            if name_len and d0 + comp <= len(buf) and comp > 0:
                raw_name = buf[sig + 30:sig + 30 + name_len]
                name = "".join(chr(((b << (key & 7)) | (b >> (8 - (key & 7)))) & 0xFF) if (key & 7) else chr(b)
                               for b in raw_name)
                if name.isprintable() and name:
                    try:
                        d = zlib.decompressobj(-15).decompress(buf[d0:d0 + comp])
                    except zlib.error:
                        d = None
                    ok = d is not None and len(d) == inflated and zlib.crc32(d) == crc
                    if ok and name not in out:
                        out[name] = d
                    elif not ok:
                        out.setdefault("__rejected__:" + name, b"")
        pos = buf.find(magic, pos + 1)
    return out


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    buf = open(src, "rb").read()
    if buf[:4] == bytes([0xD0, 0xCF, 0x11, 0xE0]):
        kind = "ole2"
        streams = read_ole(buf)
    else:
        kind = "modern"
        streams = read_modern(buf)
    for name, data in streams.items():
        if name.startswith("__rejected__"):
            print("%s\trejected\t%s" % (kind, name))
            continue
        safe = name.replace("/", "_")
        with open(os.path.join(out_dir, safe + ".bin"), "wb") as f:
            f.write(data)
        print("%s\t%s\t%d" % (kind, name, len(data)))


if __name__ == "__main__":
    main()
