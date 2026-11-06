#!/usr/bin/env python3
"""Claim B, blind re-derivation: stream-entry headers in modern SLDPRT containers.

Written from the bytes, not from the package reader. Header layout used (all little-endian):
  h+0   u32 per-file value          h+4  u16 x3 = 20, 6, 8 (the 6-byte pattern scanned for)
  h+14  u32 CRC-32 of inflated data h+18 u32 compressed size
  h+22  u32 inflated size           h+26 u16 name length     h+28 u16 extra length
  h+30  name bytes, each rotated left by (byte 7 & 7) bits, then compressed data

Filters, applied in this order to every pattern hit:
  F0 header fits in file            F1 name length > 0 and name+data inside file
  F2 compressed size > 0            F3 name printable after rotation (0x20-0x7e)
  F4 inflates (raw DEFLATE by default) and output length == declared inflated size
  F5 CRC-32 of output == header CRC
A hit that passes F0-F5 with inflated size > 0 is a "valid nonempty" entry;
with inflated size == 0 it is a "valid empty" entry.

Usage:
  python3 -I claim_b_scan.py                 # corpus run, writes results next to this script
  python3 -I claim_b_scan.py --controls      # control runs, writes controls_claim_b.json
"""
import json
import os
import random
import struct
import sys
import zlib
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = "/home/user/dump-validation"
FOLDERS = ["test files original", "test files new", "test files online"]
PAT = bytes([20, 0, 6, 0, 8, 0])
PRINTABLE = set(range(0x20, 0x7F))


def rol(b, s):
    s &= 7
    if s == 0:
        return b
    return ((b << s) | (b >> (8 - s))) & 0xFF


def inflate(blob, mode):
    if mode == "raw":
        d = zlib.decompressobj(-15)
    else:  # zlib-wrapped (control)
        d = zlib.decompressobj(15)
    try:
        out = d.decompress(blob)
    except zlib.error:
        return None, False
    return out, d.eof


def scan(data, mode="raw", keep_entries=False):
    """Return counts for every filter stage, and (optionally) the entries that pass all filters."""
    n = len(data)
    key = data[7] & 7 if n > 7 else 0
    c = Counter()
    entries = []
    names_nonprint_crc_ok = []
    i = data.find(PAT)
    while i != -1:
        c["pattern_hits"] += 1
        h = i - 4
        i_next = i + 1
        if h < 0 or h + 30 > n:
            c["F0_fail"] += 1
            i = data.find(PAT, i_next)
            continue
        c["F0_pass"] += 1
        crc, csize, usize = struct.unpack_from("<III", data, h + 14)
        nlen, xlen = struct.unpack_from("<HH", data, h + 26)
        dstart = h + 30 + nlen
        dend = dstart + csize
        if nlen == 0 or dend > n:
            c["F1_fail"] += 1
            i = data.find(PAT, i_next)
            continue
        c["F1_pass"] += 1
        if csize == 0:
            c["F2_fail"] += 1
            i = data.find(PAT, i_next)
            continue
        c["F2_pass"] += 1
        raw_name = data[h + 30:dstart]
        name_bytes = bytes(rol(b, key) for b in raw_name)
        printable = all(b in PRINTABLE for b in name_bytes)
        blob = data[dstart:dend]
        out, eof = inflate(blob, mode)
        inflate_ok = out is not None and eof and len(out) == usize
        crc_ok = inflate_ok and (zlib.crc32(out) & 0xFFFFFFFF) == crc
        if not printable:
            c["nonprintable_name"] += 1
            if crc_ok:
                c["nonprintable_name_crc_ok"] += 1
                names_nonprint_crc_ok.append(name_bytes.hex())
            i = data.find(PAT, i_next)
            continue
        c["F3_pass"] += 1
        if not inflate_ok:
            c["F4_fail"] += 1
            i = data.find(PAT, i_next)
            continue
        c["F4_pass"] += 1
        if not crc_ok:
            c["F5_fail"] += 1
            i = data.find(PAT, i_next)
            continue
        c["F5_pass"] += 1
        name = name_bytes.decode("latin1")
        kind = "nonempty" if usize > 0 else "empty"
        c["valid_" + kind] += 1
        if keep_entries:
            entries.append({"offset": h, "name": name, "csize": csize, "usize": usize,
                            "crc": crc, "kind": kind, "xlen": xlen})
        i = data.find(PAT, i_next)
    return c, entries, names_nonprint_crc_ok


def corpus_files():
    out = []
    for folder in FOLDERS:
        base = os.path.join(CORPUS, folder)
        for root, _, files in os.walk(base):
            for f in files:
                if f.lower().endswith(".sldprt"):
                    out.append(os.path.join(root, f))
    return sorted(out)


def is_modern(data):
    return len(data) >= 8 and data[4:8] == bytes([0, 0, 0, 4]) and data[:4] != bytes([0xD0, 0xCF, 0x11, 0xE0])


def run_corpus():
    files = corpus_files()
    total = Counter()
    per_file = []
    dup_files = []
    modern_n = 0
    for p in files:
        with open(p, "rb") as fh:
            data = fh.read()
        if not is_modern(data):
            continue
        modern_n += 1
        c, entries, _ = scan(data, "raw", keep_entries=True)
        total.update(c)
        nonempty = [e["name"] for e in entries if e["kind"] == "nonempty"]
        dups = sorted(k for k, v in Counter(nonempty).items() if v > 1)
        if dups:
            dup_files.append({"file": os.path.relpath(p, CORPUS), "names": dups})
        per_file.append({"file": os.path.relpath(p, CORPUS), "bytes": len(data),
                         "valid_nonempty": sum(e["kind"] == "nonempty" for e in entries),
                         "valid_empty": sum(e["kind"] == "empty" for e in entries),
                         "entries": entries})
    summary = {
        "modern_containers_in_corpus_folders": modern_n,
        "all_sldprt_files": len(files),
        "pattern_hits": total["pattern_hits"],
        "stage_counts": {k: total[k] for k in sorted(total) if k.startswith("F") or k.startswith("valid")
                         or k in ("nonprintable_name", "nonprintable_name_crc_ok")},
        "valid_nonempty": total["valid_nonempty"],
        "valid_empty": total["valid_empty"],
        "files_with_duplicate_nonempty_names": len(dup_files),
        "duplicate_detail": dup_files,
        "interpretation": {
            "compression": "raw DEFLATE via zlib.decompressobj(-15), eof required",
            "nonempty_payload": "compressed size > 0 (F2); empty entries are those with inflated size 0",
        },
    }
    with open(os.path.join(HERE, "claim_b_results.json"), "w") as fh:
        json.dump({"summary": summary, "per_file": per_file}, fh, indent=1)
    print(json.dumps({k: v for k, v in summary.items() if k != "duplicate_detail"}, indent=1))


def run_controls():
    out = {}
    # C1 raw-deflate vs zlib-wrapped inflation on the real corpus.
    files = corpus_files()
    blobs = []
    for p in files:
        with open(p, "rb") as fh:
            d = fh.read()
        if is_modern(d):
            blobs.append((p, d))
    zt = Counter()
    for p, d in blobs:
        c, _, _ = scan(d, "zlib")
        zt.update(c)
    out["C1_zlib_wrapped_inflation_on_corpus"] = {k: zt[k] for k in ("pattern_hits", "F3_pass", "F4_pass", "F5_pass", "valid_nonempty", "valid_empty")}
    # C2 corrupt one byte inside the first valid nonempty entry's compressed data: expect that entry lost.
    lost = Counter()
    checked = 0
    for p, d in blobs[:60]:
        c0, ents, _ = scan(d, "raw", keep_entries=True)
        target = next((e for e in ents if e["kind"] == "nonempty"), None)
        if target is None:
            continue
        pos = target["offset"] + 30 + len(os.path.basename(p)) * 0  # placeholder, recomputed below
        h = target["offset"]
        nlen = struct.unpack_from("<H", d, h + 26)[0]
        pos = h + 30 + nlen + target["csize"] // 2
        mut = bytearray(d)
        mut[pos] ^= 0x01
        c1, ents1, _ = scan(bytes(mut), "raw", keep_entries=True)
        checked += 1
        lost["valid_nonempty_before"] += c0["valid_nonempty"]
        lost["valid_nonempty_after"] += c1["valid_nonempty"]
        lost["target_still_present"] += any(e["offset"] == h for e in ents1)
    out["C2_one_bit_flip_in_compressed_data"] = {"files_checked": checked, **dict(lost)}
    # C3 random noise with planted pattern hits: the filters must reject everything.
    rng = random.Random(97)
    noise = Counter()
    for _ in range(40):
        size = rng.randrange(20000, 400000)
        buf = bytearray(rng.getrandbits(8) for _ in range(size))
        for _ in range(300):
            at = rng.randrange(0, size - 40)
            buf[at:at + 6] = PAT
            buf[at + 26:at + 30] = struct.pack("<I", rng.randrange(1, 40))
            buf[at + 18:at + 22] = struct.pack("<I", rng.randrange(1, 4000))
        c, _, _ = scan(bytes(buf), "raw")
        noise.update(c)
    out["C3_random_noise_with_planted_headers"] = {k: noise[k] for k in ("pattern_hits", "F0_pass", "F1_pass", "F2_pass", "F3_pass", "F4_pass", "F5_pass", "valid_nonempty", "valid_empty")}
    # C4 printable filter: entries that inflate and match CRC but have non-printable names.
    np_ok = Counter()
    for p, d in blobs:
        c, _, lst = scan(d, "raw")
        np_ok["nonprintable_name"] += c["nonprintable_name"]
        np_ok["nonprintable_name_crc_ok"] += c["nonprintable_name_crc_ok"]
    out["C4_printable_name_filter"] = dict(np_ok)
    # C5 empty entries: confirm the empty class is exactly csize>0, usize==0, CRC 0.
    emp = Counter()
    for p, d in blobs:
        _, ents, _ = scan(d, "raw", keep_entries=True)
        for e in ents:
            if e["kind"] == "empty":
                emp["n"] += 1
                emp["crc_zero"] += (e["crc"] == 0)
                emp["csize_le_8"] += (e["csize"] <= 8)
    out["C5_empty_entries"] = dict(emp)

    # C6 duplicate-name detector, positive control: a file concatenated with itself must show every
    # nonempty name as duplicated. Confirms the duplicate check can fire.
    dup_pos = {"files": 0, "nonempty_names": 0, "names_flagged_duplicate": 0}
    for p, d in blobs[:40]:
        _, ents, _ = scan(d, "raw", keep_entries=True)
        orig = [e["name"] for e in ents if e["kind"] == "nonempty"]
        _, ents2, _ = scan(d + d, "raw", keep_entries=True)
        doubled = [e["name"] for e in ents2 if e["kind"] == "nonempty"]
        flagged = [k for k, v in Counter(doubled).items() if v > 1]
        dup_pos["files"] += 1
        dup_pos["nonempty_names"] += len(orig)
        dup_pos["names_flagged_duplicate"] += len(set(flagged) & set(orig))
    out["C6_duplicate_check_positive_control_doubled_files"] = dup_pos
    with open(os.path.join(HERE, "controls_claim_b.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    if "--controls" in sys.argv:
        run_controls()
    else:
        run_corpus()
