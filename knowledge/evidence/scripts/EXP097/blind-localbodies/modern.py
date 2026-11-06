#!/usr/bin/env python3
"""Own parser for the modern SLDPRT container (2015+ files), stdlib only.

Layout used (ZIP-local-header-like, found by a 6-byte signature scan):
  +0   u32  per-file signature (not used here)
  +4   u16 20   +6 u16 6   +8 u16 8 (deflate)   <- scanned for
  +14  u32  CRC-32 of the inflated stream
  +18  u32  compressed size
  +22  u32  inflated size
  +26  u16  name length (bytes)      +28 u16 extra length (0)
  +30  name bytes, each rotated left by (file byte 7 & 7); then raw DEFLATE data

Decode rule for names: name byte = rotate_left(stored, key) with key = file byte 7 & 7.
A candidate is accepted when its inflated length equals the declared size and
(for printable names) its CRC-32 matches. Candidates that fail are counted, not hidden.
"""
import struct
import zlib

SIG = bytes([20, 0, 6, 0, 8, 0])


def _rotl(b, s):
    s &= 7
    if not s:
        return b
    return ((b << s) | (b >> (8 - s))) & 0xFF


def _crc32(data):
    return zlib.crc32(data) & 0xFFFFFFFF


def scan(buf):
    """Return (streams: dict name->bytes, stats: dict).

    stats: candidates, accepted, rejected_size, rejected_inflate, printable_crc_fail.
    First accepted occurrence of a name wins (same policy as the reader).
    """
    key = buf[7] & 7
    stats = dict(candidates=0, accepted=0, rejected_size=0, rejected_inflate=0,
                 nonprintable_names=0, crc_fail=[])
    streams = {}
    pos = buf.find(SIG)
    while pos != -1:
        stats["candidates"] += 1
        sig = pos - 4
        if sig >= 0 and sig + 30 <= len(buf):
            comp, = struct.unpack_from("<I", buf, sig + 18)
            usize, = struct.unpack_from("<I", buf, sig + 22)
            crc_decl, = struct.unpack_from("<I", buf, sig + 14)
            nlen, = struct.unpack_from("<I", buf, sig + 26)
            name_start = sig + 30
            data_start = name_start + nlen
            data_end = data_start + comp
            ok_shape = nlen <= 1024 and comp <= 50_000_000 and data_end <= len(buf) and comp > 0
            if ok_shape:
                raw_name = buf[name_start:name_start + nlen]
                name = "".join(chr(_rotl(c, key)) for c in raw_name)
                slice_ = buf[data_start:data_end]
                data = None
                try:
                    data = zlib.decompressobj(-15).decompress(slice_)
                    # decompressobj must consume the whole slice to count as a clean stream
                except zlib.error:
                    try:
                        data = zlib.decompress(slice_)
                    except zlib.error:
                        data = None
                if data is None:
                    stats["rejected_inflate"] += 1
                elif len(data) != usize:
                    stats["rejected_size"] += 1
                else:
                    printable = all(0x20 <= ord(c) <= 0x7E for c in name) and name != ""
                    if printable:
                        if _crc32(data) != crc_decl:
                            stats["crc_fail"].append(name)
                        elif name not in streams:
                            streams[name] = data
                            stats["accepted"] += 1
                    else:
                        stats["nonprintable_names"] += 1
        pos = buf.find(SIG, pos + 1)
    return streams, stats


if __name__ == "__main__":
    import sys
    b = open(sys.argv[1], "rb").read()
    s, st = scan(b)
    for k in sorted(s):
        print(len(s[k]), k)
    print(st)
