#!/usr/bin/env python3
"""Independent DisplayLists face-record reader (raw bytes, no package code).

Grammar, from the record table in docs/format/displaylists.md (read once, then coded here):
  [4,8,2,S] u32[S] strip lengths L; [12,100,2,V] float32 positions; [12,100,2,V] normals;
  [4,8,2,N] u32 Block1; [4,8,2,S] u32 Block2; [1,8,2,N] u8 Block3; then 132-byte bounds.
  V = sum(L), each L >= 3, Block2[i] = 2L-2, N = sum(Block2).
  Block1 per strip: control word (1, or 0 on a 3-vertex strip), then 2L-3 edge IDs in the order
  (0,1), then for i=2..L-1: (i-2,i), (i-1,i).  Nonzero IDs are face-boundary edges.
  Triangles per strip: i even -> (i-2,i-1,i), i odd -> (i-1,i-2,i).

Modern files only: after the bounds, the surface record carries rawId (Parasolid FACE node id).

Usage: python3 -I dlparse.py <DisplayLists.bin> <out.json> <label>
Also writes a scan summary (candidate headers, accepted, rejected with reasons) into the JSON.
"""
import json
import math
import struct
import sys

SIG = bytes([4, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0])


def u32s(buf, off, n):
    return list(struct.unpack_from("<%dI" % n, buf, off))


def f32s(buf, off, n):
    return list(struct.unpack_from("<%df" % n, buf, off))


def header(buf, off, stride, kind):
    if off + 16 > len(buf):
        raise ValueError("header past end at %d" % off)
    h = struct.unpack_from("<4I", buf, off)
    if h[0] != stride or h[1] != kind or h[2] != 2:
        raise ValueError("bad header %s at %d" % (list(h), off))
    n = h[3]
    if off + 16 + stride * n > len(buf):
        raise ValueError("array past end at %d" % off)
    return n, off + 16 + stride * n


def parse_record(buf, off):
    rec = {"offset": off}
    S, p = header(buf, off, 4, 8)
    if S < 1:
        raise ValueError("no strips")
    L = u32s(buf, off + 16, S)
    if any(x < 3 for x in L):
        raise ValueError("strip shorter than 3")
    V = sum(L)
    nV, p_after_pos_hdr = header(buf, p, 12, 100)
    if nV != V:
        raise ValueError("positions %d != sum(L) %d" % (nV, V))
    verts = f32s(buf, p + 16, 3 * V)
    if not all(math.isfinite(x) for x in verts):
        raise ValueError("nonfinite position")
    p = p_after_pos_hdr
    nN, p = header(buf, p, 12, 100)
    if nN != V:
        raise ValueError("normals count")
    norms = f32s(buf, p - 12 * V, 3 * V)
    for i in range(0, 3 * V, 3):
        if abs(math.sqrt(norms[i] ** 2 + norms[i + 1] ** 2 + norms[i + 2] ** 2) - 1) > 1e-3:
            raise ValueError("non-unit normal")
    b1_off = p
    N, p = header(buf, p, 4, 8)
    block1 = u32s(buf, b1_off + 16, N)
    b2_off = p
    S2, p = header(buf, p, 4, 8)
    block2 = u32s(buf, b2_off + 16, S2)
    b3_off = p
    N3, p = header(buf, p, 1, 8)
    block3 = buf[b3_off + 16:b3_off + 16 + N3]
    expect2 = [2 * x - 2 for x in L]
    if block2 != expect2 or sum(block2) != N or N3 != N:
        raise ValueError("Block2/Block1/Block3 lengths disagree with strips")
    # Walk Block1 strip by strip and collect annotations and triangles.
    edges, tris, t, v = [], [], 0, 0
    controls = []
    for s, n in enumerate(L):
        ctl = block1[t]
        if ctl != 1 and not (ctl == 0 and n == 3):
            raise ValueError("unexpected control %d in strip %d" % (ctl, s))
        controls.append(ctl)
        t += 1
        pairs = [(v, v + 1)]
        for i in range(2, n):
            pairs.append((v + i - 2, v + i))
            pairs.append((v + i - 1, v + i))
        for a, b in pairs:
            edges.append({"strip": s, "a": a, "b": b, "id": block1[t]})
            t += 1
        for i in range(2, n):
            tris.append((v + i - 2, v + i - 1, v + i) if i % 2 == 0 else (v + i - 1, v + i - 2, v + i))
        v += n
    if t != N:
        raise ValueError("Block1 walk consumed %d of %d words" % (t, N))
    # Boundary check: nonzero IDs must give every boundary vertex exactly two boundary edges.
    deg = {}
    for e in edges:
        if e["id"]:
            deg[e["a"]] = deg.get(e["a"], 0) + 1
            deg[e["b"]] = deg.get(e["b"], 0) + 1
    rec["boundary_ok"] = bool(deg) and all(c == 2 for c in deg.values())
    rec.update({
        "strips": L, "controls": controls, "block1": block1, "block2": block2,
        "block3_nonzero": any(block3), "block1_offset": b1_off + 16,
        "vertices": [verts[3 * i:3 * i + 3] for i in range(V)],
        "normals": [norms[3 * i:3 * i + 3] for i in range(V)],
        "edges": edges, "triangles": tris, "end_offset": p,
    })
    return rec, p


def parse_metadata_rawid(buf, p):
    """Modern only: skip the 132-byte bounds, then read the surface record's rawId.

    Layout after the bounds (checked by the parse, returns None when it does not fit):
    [8,100,2,n] array, u32 flag, [12,100,2,n] x2, u32 scalar flag, (2 optional arrays),
    u32 x3 reserved, u32 rawId.
    """
    try:
        q = p + 132
        n, q = header(buf, q, 8, 100)
        q += 4
        n, q = header(buf, q, 12, 100)
        n, q = header(buf, q, 12, 100)
        sf = struct.unpack_from("<I", buf, q)[0]
        q += 4
        if sf == 1:
            for _ in range(2):
                n, q = header(buf, q, 4, 100)
        elif sf != 0:
            return None
        q += 12
        raw_id = struct.unpack_from("<I", buf, q)[0]
        return raw_id
    except (ValueError, struct.error):
        return None


def main():
    src, out_json, label = sys.argv[1], sys.argv[2], sys.argv[3]
    buf = open(src, "rb").read()
    hits = []
    i = buf.find(SIG)
    while i != -1:
        hits.append(i)
        i = buf.find(SIG, i + 1)
    faces, rejected = [], []
    for off in hits:
        try:
            rec, end = parse_record(buf, off)
            rec["rawId"] = parse_metadata_rawid(buf, end)
            faces.append(rec)
        except ValueError as e:
            rejected.append({"offset": off, "reason": str(e)})
    out = {"label": label, "file": src, "bytes": len(buf), "signature_hits": len(hits),
           "accepted": len(faces), "rejected": rejected, "faces": faces}
    with open(out_json, "w") as f:
        json.dump(out, f)
    print("%s: hits=%d accepted=%d rejected=%d boundary_ok=%d/%d rawIds=%s" % (
        label, len(hits), len(faces), len(rejected), sum(f["boundary_ok"] for f in faces), len(faces),
        [f["rawId"] for f in faces][:30]))


if __name__ == "__main__":
    main()
