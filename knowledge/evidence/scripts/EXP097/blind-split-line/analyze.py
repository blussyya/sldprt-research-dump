#!/usr/bin/env python3
"""Blind split-line test: does a face's Block1 change when only its neighbour changes?

Faces are identified from raw geometry (planar faces, axis-aligned normal, plane offset), not from
any package linking. Neighbours are found from shared nonzero Block1 edge IDs. The raw byte
search confirms that each Block1 word sequence occurs in the decoded DisplayLists stream.

Usage: python3 -I analyze.py <scratch_dir> <json_out>
"""
import json
import sys

SCR, OUT = sys.argv[1], sys.argv[2]
PAIRS = {
    "SW2011": {"after": "SW2011_C18_cube_split_line",
               "controls": ["SW2011_C22_cube_sw2011_native", "SW2011_C00_cube_10mm"]},
    "SW2022": {"after": "SW2022_C18_cube_split_line",
               "controls": ["SW2022_C24_cube_sw2022_native", "SW2022_C00_cube_10mm"]},
}
AX = "xyz"


def load(name):
    return json.load(open("%s/%s/faces.json" % (SCR, name)))


def raw(name):
    return open("%s/%s/DisplayLists.bin" % (SCR, name), "rb").read()


def label_faces(doc, lo, hi, tol):
    """Planar face -> (axis, sign, 'lo'|'hi', offset). Returns list of dicts."""
    out = []
    for f in doc["faces"]:
        mn = [sum(n[k] for n in f["normals"]) / len(f["normals"]) for k in range(3)]
        ax = max(range(3), key=lambda k: abs(mn[k]))
        sign = 1 if mn[ax] > 0 else -1
        coords = [v[ax] for v in f["vertices"]]
        planar = max(coords) - min(coords) < tol
        if not planar:
            out.append({"offset": f["offset"], "planar": False, "rawId": f.get("rawId")})
            continue
        c = sum(coords) / len(coords)
        side = "lo" if abs(c - lo[ax]) < tol else ("hi" if abs(c - hi[ax]) < tol else "interior")
        out.append({"offset": f["offset"], "planar": True, "axis": AX[ax], "sign": sign, "side": side,
                    "coord": c, "rec": f, "rawId": f.get("rawId")})
    return out


def find(labels, axis, sign, side):
    return [x for x in labels if x.get("planar") and x["axis"] == axis and x["sign"] == sign and x["side"] == side]


def edge_ids(f):
    return set(e["id"] for e in f["edges"] if e["id"])


def words_le(ws):
    return b"".join(int(w).to_bytes(4, "little") for w in ws)


def summary(f):
    return {"strips": f["strips"], "vertices": len(f["vertices"]), "block1": f["block1"],
            "block2": f["block2"], "block1_offset": f["block1_offset"], "rawId": f.get("rawId")}


def main():
    result = {}
    for family, cfg in PAIRS.items():
        after = load(cfg["after"])
        lo = [min(v[k] for f in after["faces"] for v in f["vertices"]) for k in range(3)]
        hi = [max(v[k] for f in after["faces"] for v in f["vertices"]) for k in range(3)]
        tol = (max(hi) - min(lo)) * 1e-6
        res = {"bbox_after": [lo, hi], "after": cfg["after"], "controls": {}}
        for base in [cfg["after"]] + cfg["controls"]:
            pass
        A = label_faces(after, lo, hi, tol)
        # before-split baseline(s): same geometry, no split
        bases = {}
        for b in cfg["controls"]:
            doc = load(b)
            lo_b = [min(v[k] for f in doc["faces"] for v in f["vertices"]) for k in range(3)]
            hi_b = [max(v[k] for f in doc["faces"] for v in f["vertices"]) for k in range(3)]
            bases[b] = (doc, label_faces(doc, lo_b, hi_b, tol), raw(b), doc)
        A_raw = raw(cfg["after"])
        res["after_faces"] = [{"planar": x.get("planar"), "axis": x.get("axis"), "sign": x.get("sign"),
                               "side": x.get("side"), "coord": x.get("coord"),
                               **({"summary": summary(x["rec"])} if x.get("planar") else {}),
                               "rawId": x.get("rawId")} for x in A]
        # Y=0 side (normal -y at lo), Y=max side (normal +y at hi), top (+z at hi), x-sides
        checks = {
            "y0_side": ("y", -1, "lo"), "y10_side": ("y", 1, "hi"),
            "x0_side": ("x", -1, "lo"), "x10_side": ("x", 1, "hi"),
            "top_plus_z": ("z", 1, "hi"), "bottom_minus_z": ("z", -1, "lo"),
        }
        res["checks"] = {}
        for cname, (ax, sg, sd) in checks.items():
            aa = find(A, ax, sg, sd)
            entry = {"after_count": len(aa)}
            for b, (doc, labs, braw, _) in bases.items():
                bb = find(labs, ax, sg, sd)
                e = {"base_count": len(bb)}
                if len(bb) == 1 and len(aa) >= 1:
                    fb = bb[0]["rec"]
                    e["base"] = summary(fb)
                    e["base_block1_raw_found_in_stream"] = braw.count(words_le(fb["block1"])) if fb["block1"] else None
                    e["base_block1_at_offset_equals_parsed"] = list(struct_unpack_words(braw, fb["block1_offset"], len(fb["block1"]))) == fb["block1"]
                    if len(aa) == 1:
                        fa = aa[0]["rec"]
                        e["after_block1_raw_found_in_stream"] = A_raw.count(words_le(fa["block1"])) if fa["block1"] else None
                        e["after_block1_at_offset_equals_parsed"] = list(struct_unpack_words(A_raw, fa["block1_offset"], len(fa["block1"]))) == fa["block1"]
                        e["after"] = summary(fa)
                        e["same_vertex_set"] = sorted(map(tuple, fb["vertices"])) == sorted(map(tuple, fa["vertices"]))
                        e["same_vertex_order"] = fb["vertices"] == fa["vertices"]
                        e["same_strips"] = fb["strips"] == fa["strips"]
                        e["same_block1"] = fb["block1"] == fa["block1"]
                        e["same_block2"] = fb["block2"] == fa["block2"]
                        e["base_edge_ids"] = sorted(edge_ids(fb))
                        e["after_edge_ids"] = sorted(edge_ids(fa))
                entry[b] = e
            res["checks"][cname] = entry
        # Neighbour test: the y=0 side face against every top-face piece, before and after.
        y0a = find(A, "y", -1, "lo")
        tops_a = find(A, "z", 1, "hi")
        res["top_after_pieces"] = []
        if y0a:
            ya = edge_ids(y0a[0]["rec"])
            for t in tops_a:
                tv = [v[1] for v in t["rec"]["vertices"]]
                res["top_after_pieces"].append({"rawId": t.get("rawId"), "y_range": [min(tv), max(tv)],
                                                "shared_edge_ids_with_y0": sorted(ya & edge_ids(t["rec"])),
                                                "block1": t["rec"]["block1"]})
        for b, (doc, labs, braw, _) in bases.items():
            y0b = find(labs, "y", -1, "lo")
            tb = find(labs, "z", 1, "hi")
            if y0b and tb:
                res.setdefault("top_base", {})[b] = {"rawId": tb[0].get("rawId"),
                                                     "shared_edge_ids_with_y0": sorted(edge_ids(y0b[0]["rec"]) & edge_ids(tb[0]["rec"]))}
        result[family] = res
    json.dump(result, open(OUT, "w"), indent=1, default=str)
    print("wrote", OUT)


def struct_unpack_words(buf, off, n):
    import struct
    return struct.unpack_from("<%dI" % n, buf, off) if n else ()


if __name__ == "__main__":
    main()
