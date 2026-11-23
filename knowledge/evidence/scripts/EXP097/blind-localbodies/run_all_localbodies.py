#!/usr/bin/env python3
"""Run parse_localbodies.parse on every extracted LocalBodies stream and tally claim numbers."""
import json, os, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import parse_localbodies as P
SCR = "/tmp/claude-0/-home-user/c2f6f8eb-69df-510d-ae4a-5c22d3da6c6b/scratchpad/exp097"
m = json.load(open(os.path.join(SCR, "manifest.json")))
tot = collections.Counter(); hdr = collections.Counter(); flags = collections.Counter()
fails = []; per_stream = []
for s in m["streams"]:
    b = open(os.path.join(SCR, s["out"]), "rb").read()
    try:
        r = P.parse(b)
    except P.ParseError as ex:
        fails.append((s["file"], s["stream"], str(ex))); continue
    tot["streams_ok"] += 1
    tot["entries"] += len(r["entries"])
    tot["sections"] += r["counts"]["sections"]
    tot["entry_count_field_sum"] += r["entry_count"]
    for e in r["entries"]:
        hdr[e["header"]] += 1
        flags[e["flag"]] += 1
    per_stream.append(dict(file=s["file"], stream=s["stream"], entries=len(r["entries"]),
                           sections=r["counts"]["sections"], names=[e["name"] for e in r["entries"]],
                           headers=[e["header"] for e in r["entries"]], flags=[e["flag"] for e in r["entries"]],
                           nsec=[e["n_sections"] for e in r["entries"]], length=len(b)))
print("streams parsed ok:", tot["streams_ok"], "of", len(m["streams"]))
print("entries:", tot["entries"], "sections:", tot["sections"])
print("header kinds:", dict(hdr), "flags:", dict(flags))
print("failures:", fails)
json.dump(per_stream, open(os.path.join(SCR, "parsed.json"), "w"), ensure_ascii=False, indent=1)
