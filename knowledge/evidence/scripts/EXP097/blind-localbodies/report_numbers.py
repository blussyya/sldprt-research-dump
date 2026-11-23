#!/usr/bin/env python3
"""Recompute every number quoted in findings.md from the extracted streams.

Run after extract_localbodies.py (which writes manifest.json and the raw stream bytes to SCRATCH).
Uses only parse_localbodies (our grammar parser), the manifest, and the raw bytes.
"""
import collections, json, os, sys, zlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import parse_localbodies as P

SCR = "/tmp/claude-0/-home-user/c2f6f8eb-69df-510d-ae4a-5c22d3da6c6b/scratchpad/exp097"
m = json.load(open(os.path.join(SCR, "manifest.json")))
ATTR = b"BODY_IN_LIGHTWEIGHT_PERM"

print("== corpus ==")
print("sldprt files (three corpus folders + package samples):", len(m["files"]))
print("by container:", dict(collections.Counter(r["container"] for r in m["files"])))
print("LocalBodies streams:", len(m["streams"]), "in", len({s["file"] for s in m["streams"]}), "files")
print("leaf names:", dict(collections.Counter(s["stream"] for s in m["streams"])))
print("files in package/samples with LocalBodies:", sum(1 for s in m["streams"] if "package/samples" in s["file"]))
print("non-CFB non-modern files (not parsed):", len(m["other_magic"]))

print("\n== grammar parse ==")
tot = collections.Counter()
hdr = collections.Counter()
flag = collections.Counter()
chunk_stats = collections.Counter()
between_flags = collections.Counter()
xtra = []
cross = collections.Counter()  # (flag, attr_present) -> entries
per_entry = []
for s in m["streams"]:
    b = open(os.path.join(SCR, s["out"]), "rb").read()
    r = P.parse(b)
    tot["streams"] += 1
    tot["entries"] += len(r["entries"])
    tot["sections"] += r["counts"]["sections"]
    for e in r["entries"]:
        hdr[e["header"]] += 1
        flag[e["flag"]] += 1
        body = b"".join(sec["body"] for sec in e["sections"])
        present = ATTR in body
        cross[(e["flag"], present)] += 1
        per_entry.append((s["file"], e["name"], e["flag"], present, e["n_sections"]))
        if e["n_sections"] > 1:
            xtra.append((e["name"], e["n_sections"], e["header"], e["flag"]))
            between_flags.update([sec_flag for sec_flag in [0] * (e["n_sections"] - 1)])
        for sec in e["sections"]:
            chunk_stats["sections"] += 1
            if len(sec["chunks"]) == 1:
                chunk_stats["single_chunk"] += 1
            else:
                chunk_stats["multi_chunk"] += 1
                chunk_stats["multi_chunk_max"] = max(chunk_stats["multi_chunk_max"], len(sec["chunks"]))
            # chunk rule check: first chunk 1 MiB or the whole payload, later chunks 4096, last <= 4096
            infl = [c["inflated"] for c in sec["chunks"]]
            if len(infl) > 1:
                ok = infl[0] == 1048576 and all(x == 4096 for x in infl[1:-1]) and infl[-1] <= 4096
                chunk_stats["multi_chunk_rule_ok" if ok else "multi_chunk_rule_other"] += 1

print("streams parsed to exact end:", tot["streams"], "of", len(m["streams"]))
print("entries:", tot["entries"], " sections:", tot["sections"])
print("header forms:", dict(hdr), " (10 = 10-byte, 18 = 18-byte)")
print("flags:", dict(flag))
print("between-section records (flag 0 each):", sum(e[1] - 1 for e in xtra), "in", len(xtra), "multi-section entries")
print("multi-section entries (name, sections, header, flag):", xtra)
print("section chunking:", dict(chunk_stats))

print("\n== attribute check (presence only; value not decoded) ==")
print("(flag, attribute name present in body) -> entries:")
for k in sorted(cross):
    print("  ", k, cross[k])
print("entries with flag 1 and name present:", cross[(1, True)], "of", flag[1])
print("entries with name absent:", cross[(0, False)] + cross[(1, False)], "; of these flag 0:", cross[(0, False)])

print("\n== flag-1 entries ==")
for row in per_entry:
    if row[2] == 1:
        print("  ", row[1], "|", os.path.basename(row[0]), "| sections", row[4])
