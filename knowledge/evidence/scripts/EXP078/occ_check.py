#!/usr/bin/env python3
"""EXP-078, independent half: read every exact STEP written by exact-all.js with OpenCascade.

For each file: valid (BRepCheck_Analyzer), number of solids, OpenCascade's analytic volume
(BRepGProp at two tolerances) and the volume of OpenCascade's own triangulation at a fine
deflection. The triangulated volume is the check on OpenCascade itself: its analytic routine
is unstable on some surface types (EXP-076 C20, and the linear extrusions here).

  pip install cadquery-ocp
  python3 knowledge/evidence/scripts/EXP078/occ_check.py <outdir from exact-all.js> [--write]
"""
import sys, os, json, glob
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_SOLID, TopAbs_FACE, TopAbs_REVERSED
from OCP.BRep import BRep_Tool
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS

def count(s, t):
    seen = set(); e = TopExp_Explorer(s, t)
    while e.More(): seen.add(e.Current().__hash__()); e.Next()
    return len(seen)
def gprop(s, eps):
    g = GProp_GProps(); BRepGProp.VolumeProperties_s(s, g, eps, True); return g.Mass()
def mesh_volume(s, deflection):
    BRepMesh_IncrementalMesh(s, deflection, False, 0.1, True)
    V = 0.0; n = 0; e = TopExp_Explorer(s, TopAbs_FACE)
    while e.More():
        f = TopoDS.Face_s(e.Current()) if hasattr(TopoDS, 'Face_s') else TopoDS.Face(e.Current())
        loc = TopLoc_Location(); tri = BRep_Tool.Triangulation_s(f, loc)
        if tri is not None:
            rev = f.Orientation() == TopAbs_REVERSED; T = loc.Transformation()
            for i in range(1, tri.NbTriangles() + 1):
                a, b, c = tri.Triangle(i).Get()
                if rev: b, c = c, b
                x = [tri.Node(k).Transformed(T) for k in (a, b, c)]
                x = [(q.X(), q.Y(), q.Z()) for q in x]
                V += (x[0][0]*(x[1][1]*x[2][2]-x[1][2]*x[2][1]) - x[0][1]*(x[1][0]*x[2][2]-x[1][2]*x[2][0]) + x[0][2]*(x[1][0]*x[2][1]-x[1][1]*x[2][0])) / 6
                n += 1
        e.Next()
    return V, n

rows = []
for p in sorted(glob.glob(os.path.join(sys.argv[1], '*.step'))):
    r = STEPControl_Reader()
    if r.ReadFile(p) != IFSelect_RetDone: rows.append({'file': os.path.basename(p), 'read': False}); continue
    r.TransferRoots(); s = r.OneShape()
    row = {'file': os.path.basename(p), 'read': True, 'valid': bool(BRepCheck_Analyzer(s).IsValid()),
           'solids': count(s, TopAbs_SOLID), 'faces': count(s, TopAbs_FACE),
           'gprop1e-9': gprop(s, 1e-9), 'gprop1e-6': gprop(s, 1e-6)}
    for d in (0.01, 0.003):
        v, n = mesh_volume(s, d); row['mesh%g' % d] = v; row['triangles%g' % d] = n
    rows.append(row); print(json.dumps(row))
summary = {'files': len(rows), 'valid': sum(1 for r in rows if r.get('valid')), 'singleSolid': sum(1 for r in rows if r.get('solids') == 1)}
print(json.dumps(summary))
if '--write' in sys.argv:
    json.dump({'experiment': 'EXP-078', 'summary': summary, 'rows': rows}, open(os.path.join(os.path.dirname(__file__), 'OCC_RESULTS.json'), 'w'), indent=1)
