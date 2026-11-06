#!/usr/bin/env python3
"""Controls for the blind split-line comparison.

C1 null:      two no-split cube builds (C00, C22/C24). Every cube face should match on all fields.
C2 positive:  split C18 against the no-split control. Faces whose boundary changes must differ.
C3 mutation:  flip one Block1 word of the y=0 face in a copy of the split stream. The comparator must
              report a difference there, otherwise its "same" verdict for y=0 means nothing.

Usage: python3 -I controls.py <scratch_dir> <json_out>
"""
import copy
import json
import sys

SCR, OUT = sys.argv[1], sys.argv[2]


def load(name):
    return json.load(open("%s/%s/faces.json" % (SCR, name)))


def keyed(doc):
    """Key each planar cube face by (axis, sign, side) from raw geometry, as in analyze.py."""
    lo = [min(v[k] for f in doc["faces"] for v in f["vertices"]) for k in range(3)]
    hi = [max(v[k] for f in doc["faces"] for v in f["vertices"]) for k in range(3)]
    tol = (max(hi) - min(lo)) * 1e-6
    out = {}
    for f in doc["faces"]:
        mn = [sum(n[k] for n in f["normals"]) / len(f["normals"]) for k in range(3)]
        ax = max(range(3), key=lambda k: abs(mn[k]))
        sign = 1 if mn[ax] > 0 else -1
        cs = [v[ax] for v in f["vertices"]]
        if max(cs) - min(cs) >= tol:
            out.setdefault("nonplanar", []).append(f)
            continue
        c = sum(cs) / len(cs)
        side = "lo" if abs(c - lo[ax]) < tol else ("hi" if abs(c - hi[ax]) < tol else "interior")
        out[("xyz"[ax], sign, side)] = f
    return out


def same(fa, fb):
    return {"strips": fa["strips"] == fb["strips"], "vertices": fa["vertices"] == fb["vertices"],
            "block1": fa["block1"] == fb["block1"], "block2": fa["block2"] == fb["block2"]}


def compare(base, after):
    kb, ka = keyed(base), keyed(after)
    rows = {}
    for key in sorted(set(kb) | set(ka), key=str):
        if key == "nonplanar":
            continue
        if key not in kb or key not in ka:
            rows[str(key)] = {"present_in": "base" if key in kb else "after"}
            continue
        rows[str(key)] = same(kb[key], ka[key])
    return rows


def main():
    res = {}
    res["C1_null_SW2011_C22_vs_C00"] = compare(load("SW2011_C22_cube_sw2011_native"), load("SW2011_C00_cube_10mm"))
    res["C1_null_SW2022_C24_vs_C00"] = compare(load("SW2022_C24_cube_sw2022_native"), load("SW2022_C00_cube_10mm"))
    res["C2_positive_SW2011_C18_vs_C22"] = compare(load("SW2011_C22_cube_sw2011_native"), load("SW2011_C18_cube_split_line"))
    res["C2_positive_SW2022_C18_vs_C24"] = compare(load("SW2022_C24_cube_sw2022_native"), load("SW2022_C18_cube_split_line"))
    # C3: mutation of one Block1 word on the y=0 face of the split model (copy in memory only)
    after = load("SW2011_C18_cube_split_line")
    mut = copy.deepcopy(after)
    target = keyed(mut)[("y", -1, "lo")]
    target["block1"][1] = target["block1"][1] + 1
    res["C3_mutation_SW2011_C18_y0_block1_word1_plus1_vs_C22"] = compare(load("SW2011_C22_cube_sw2011_native"), mut)
    json.dump(res, open(OUT, "w"), indent=1)
    for k, v in res.items():
        print(k)
        for face, r in v.items():
            print("   ", face, r)


if __name__ == "__main__":
    main()
