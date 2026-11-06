#!/usr/bin/env python3
"""Classify every corpus .sldprt by its first 8 bytes (no reader code used)."""
import os, collections
ROOTS = ["/home/user/dump-validation/test files original",
         "/home/user/dump-validation/test files new",
         "/home/user/dump-validation/test files online",
         "/home/user/dump-validation/package/samples"]
c = collections.Counter(); ex = {}
rows = []
for root in ROOTS:
    for dp, dn, fn in os.walk(root):
        for f in fn:
            if not f.lower().endswith(".sldprt"): continue
            p = os.path.join(dp, f)
            with open(p, "rb") as fh: head = fh.read(8)
            k = head.hex(" ")
            c[k] += 1; ex.setdefault(k, p); rows.append((p, k))
print("total", len(rows))
for k, n in c.most_common(): print(n, k, "| e.g.", ex[k])
