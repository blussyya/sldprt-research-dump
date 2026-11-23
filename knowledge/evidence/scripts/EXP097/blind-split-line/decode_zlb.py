#!/usr/bin/env python3
"""Decode a SW2011 DisplayLists__ZLB stream with zlib, from the raw wrapper bytes.

Layout (checked here, not assumed): 16-byte magic 23 1d d5 71 da 81 48 a2 a8 58 98 b2 1b 89 ef 99,
u32 inflated size at +16, u32 packed size at +20, zlib-wrapped deflate body (header 78 01) at +24 (packed bytes), 8 zero bytes.

Usage: python3 -I decode_zlb.py <raw_stream.bin> <out.bin>
"""
import struct
import sys
import zlib

MAGIC = bytes([0x23, 0x1D, 0xD5, 0x71, 0xDA, 0x81, 0x48, 0xA2, 0xA8, 0x58, 0x98, 0xB2, 0x1B, 0x89, 0xEF, 0x99])


def main():
    raw = open(sys.argv[1], "rb").read()
    assert raw[:16] == MAGIC, "magic mismatch"
    size, packed = struct.unpack_from("<II", raw, 16)
    assert packed == len(raw) - 32, "packed length %d != raw-32 %d" % (packed, len(raw) - 32)
    assert raw[-8:] == bytes(8), "trailer not zero"
    body = raw[24:24 + packed]
    out = zlib.decompress(body)
    assert len(out) == size, "inflated %d != declared %d" % (len(out), size)
    open(sys.argv[2], "wb").write(out)
    print("ok inflated=%d declared=%d packed=%d" % (len(out), size, packed))


if __name__ == "__main__":
    main()
