#!/usr/bin/env python3
"""Survey: list every stream leaf name containing 'local' (case-insensitive) per file."""
import sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cfb import CFB
ROOTS = ["/home/user/dump-validation/test files original",
         "/home/user/dump-validation/test files new",
         "/home/user/dump-validation/test files online",
         "/home/user/dump-validation/package/samples"]
counts = collections.Counter()
per_file = []
errors = []
for root in ROOTS:
    for dp, dn, fn in os.walk(root):
        for f in fn:
            if not f.lower().endswith(".sldprt"):
                continue
            p = os.path.join(dp, f)
            try:
                cfb = CFB(open(p, "rb").read())
            except Exception as ex:
                errors.append((p, str(ex))); continue
            hits = [q for q in cfb.paths if "local" in q.rsplit("/", 1)[-1].lower()]
            for h in hits:
                counts[h.rsplit("/", 1)[-1]] += 1
            per_file.append((p, hits))
print("files parsed:", len(per_file), "errors:", len(errors))
for e in errors: print("ERR", e)
print("leaf names containing 'local':", dict(counts))
print("files with a LocalBodies-like stream:", sum(1 for _, h in per_file if h))
for p, h in per_file:
    if h: print(" ", [x for x in h], "|", p)
