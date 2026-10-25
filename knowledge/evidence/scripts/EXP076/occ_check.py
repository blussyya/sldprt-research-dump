#!/usr/bin/env python3
"""EXP-076, independent half: read our STEP files and SolidWorks' with OpenCascade.

For every controlled model:
  - is our file a valid single solid (BRepCheck_Analyzer)?
  - OpenCascade's own volume (BRepGProp) for ours and for SolidWorks' model.step
  - boolean difference in both directions, ours minus SolidWorks' and the reverse
The same checks run on the "naive" files (no vertex loops, boundary-less faces dropped).

  pip install cadquery-ocp
  python3 knowledge/evidence/scripts/EXP076/occ_check.py <outdir from write-and-check.js> [--write]
"""
import sys, os, json, glob
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp
from OCP.BRepAlgoAPI import BRepAlgoAPI_Cut, BRepAlgoAPI_Common
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_SOLID, TopAbs_FACE

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
OUT = sys.argv[1]

def load(p):
    r = STEPControl_Reader()
    if r.ReadFile(p) != IFSelect_RetDone: return None
    r.TransferRoots(); s = r.OneShape()
    return None if s.IsNull() else s
def count(s, t):
    seen = set(); e = TopExp_Explorer(s, t)
    while e.More(): seen.add(e.Current().__hash__()); e.Next()
    return len(seen)
def vol(s):
    p = GProp_GProps(); BRepGProp.VolumeProperties_s(s, p, 1e-10, True); return p.Mass()
def info(s):
    if s is None: return {"read": False}
    return {"read": True, "valid": bool(BRepCheck_Analyzer(s).IsValid()), "solids": count(s, TopAbs_SOLID), "faces": count(s, TopAbs_FACE), "volume": vol(s)}

rows = []
for f in sorted(glob.glob(os.path.join(OUT, "full", "*.step"))):
    era, model = os.path.basename(f)[:-5].split("_", 1)
    sw = os.path.join(ROOT, "test files new", era, model, "model.step")
    A, B, Nv = load(f), load(sw), load(os.path.join(OUT, "naive", os.path.basename(f)))
    row = {"model": era + "/" + model, "ours": info(A), "solidworks": info(B), "naive": info(Nv)}
    if A is not None and B is not None:
        row["oursMinusSolidworks"] = vol(BRepAlgoAPI_Cut(A, B).Shape())
        row["solidworksMinusOurs"] = vol(BRepAlgoAPI_Cut(B, A).Shape())
        row["commonVolume"] = vol(BRepAlgoAPI_Common(A, B).Shape())
    rows.append(row)
    o, s = row["ours"], row["solidworks"]
    print(f'{row["model"]:38} ours {"valid" if o.get("valid") else "INVALID"} solids {o.get("solids")} V {o.get("volume", 0):.9f}  SW V {s.get("volume", 0):.9f}  '
          f'cut {row.get("oursMinusSolidworks", float("nan")):.1e}/{row.get("solidworksMinusOurs", float("nan")):.1e}  naive {"valid" if row["naive"].get("valid") else "INVALID"}')

ok = lambda r: r["ours"].get("valid") and r["ours"].get("solids") == 1
summary = {
    "models": len(rows),
    "oursValidSingleSolid": sum(1 for r in rows if ok(r)),
    "naiveValidSingleSolid": sum(1 for r in rows if r["naive"].get("valid") and r["naive"].get("solids") == 1),
    "solidworksValid": sum(1 for r in rows if r["solidworks"].get("valid")),
    "booleanDifferenceZero": sum(1 for r in rows if r.get("oursMinusSolidworks") == 0 and r.get("solidworksMinusOurs") == 0),
    "occVolumeEqualRel1e12": sum(1 for r in rows if abs(r["ours"]["volume"] - r["solidworks"]["volume"]) <= 1e-12 * r["solidworks"]["volume"]),
    "occVolumeDiffers": [{"model": r["model"], "ours": r["ours"]["volume"], "solidworks": r["solidworks"]["volume"], "common": r.get("commonVolume")}
                         for r in rows if abs(r["ours"]["volume"] - r["solidworks"]["volume"]) > 1e-12 * r["solidworks"]["volume"]],
}
print(json.dumps(summary, indent=1))
if "--write" in sys.argv:
    json.dump({"experiment": "EXP-076", "date": "2026-10-03", "summary": summary, "rows": rows},
              open(os.path.join(os.path.dirname(__file__), "OCC_RESULTS.json"), "w"), indent=1)
