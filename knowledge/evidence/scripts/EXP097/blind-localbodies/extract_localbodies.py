#!/usr/bin/env python3
"""Find every LocalBodies stream in the corpus with our own CFB and modern parsers.

Writes raw stream bytes to SCRATCH/<index>.bin and a manifest JSON to SCRATCH/manifest.json.
Non-CFB, non-modern magics are recorded as 'other-magic' and not parsed here.
"""
import os, sys, json, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cfb import CFB
import modern

SCRATCH = "/tmp/claude-0/-home-user/c2f6f8eb-69df-510d-ae4a-5c22d3da6c6b/scratchpad/exp097"
ROOTS = ["/home/user/dump-validation/test files original",
         "/home/user/dump-validation/test files new",
         "/home/user/dump-validation/test files online",
         "/home/user/dump-validation/package/samples"]

os.makedirs(SCRATCH, exist_ok=True)
manifest = dict(files=[], streams=[], other_magic=[], errors=[])
files = []
for root in ROOTS:
    for dp, dn, fn in os.walk(root):
        for f in fn:
            if f.lower().endswith(".sldprt"):
                files.append(os.path.join(dp, f))
files.sort()
idx = 0
for p in files:
    buf = open(p, "rb").read()
    rec = dict(path=p, size=len(buf), sha1=hashlib.sha1(buf).hexdigest()[:12])
    if buf[:8] == bytes([0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1]):
        rec["container"] = "cfb"
        try:
            cfb = CFB(buf)
            names = [q for q in cfb.paths if q.rsplit("/",1)[-1] == "LocalBodies"]
            for q in names:
                data = cfb.stream_by_path(q)
                manifest["streams"].append(dict(file=p, stream=q, container="cfb", size=len(data), out=f"{idx}.bin"))
                open(os.path.join(SCRATCH, f"{idx}.bin"), "wb").write(data); idx += 1
        except Exception as ex:
            manifest["errors"].append((p, "cfb: " + str(ex)))
    elif buf[4:8] == bytes([0,0,0,4]):
        rec["container"] = "modern"
        try:
            streams, st = modern.scan(buf)
            rec["scan"] = {k: v for k, v in st.items()}
            for name in sorted(streams):
                if name.rsplit("/",1)[-1] == "LocalBodies" or "localbodies" in name.lower():
                    data = streams[name]
                    manifest["streams"].append(dict(file=p, stream=name, container="modern", size=len(data), out=f"{idx}.bin"))
                    open(os.path.join(SCRATCH, f"{idx}.bin"), "wb").write(data); idx += 1
        except Exception as ex:
            manifest["errors"].append((p, "modern: " + str(ex)))
    else:
        rec["container"] = "other-magic"
        manifest["other_magic"].append(dict(file=p, magic=buf[:8].hex(" ")))
    manifest["files"].append(rec)
json.dump(manifest, open(os.path.join(SCRATCH, "manifest.json"), "w"), indent=1, ensure_ascii=False)
from collections import Counter
print("files:", len(files), Counter(r["container"] for r in manifest["files"]))
print("LocalBodies-like streams:", len(manifest["streams"]), Counter(s["container"] for s in manifest["streams"]))
print("names:", Counter(s["stream"] for s in manifest["streams"]))
print("other magic:", len(manifest["other_magic"]))
print("errors:", manifest["errors"])
crc = [(r["path"], r["scan"]["crc_fail"]) for r in manifest["files"] if r.get("scan", {}).get("crc_fail")]
print("modern CRC failures:", crc)
