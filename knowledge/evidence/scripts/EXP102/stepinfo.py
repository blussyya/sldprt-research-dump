# EXP-102: face types and volume of each cube's STEP export (the reference B-rep).
import sys
from OCP.STEPControl import STEPControl_Reader
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE
from OCP.TopoDS import TopoDS
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp
from OCP.BRepAdaptor import BRepAdaptor_Surface
base = '/home/user/sldprt-research-dump/test files new/SW2011/'
for n in sys.argv[1:]:
    r = STEPControl_Reader(); r.ReadFile(base + n + '/model.step'); r.TransferRoots(); s = r.OneShape()
    types = []; ex = TopExp_Explorer(s, TopAbs_FACE)
    while ex.More():
        f = TopoDS.Face(ex.Current()); a = BRepAdaptor_Surface(f)
        types.append(str(a.GetType()).replace('GeomAbs_', '')); ex.Next()
    p = GProp_GProps(); BRepGProp.VolumeProperties_s(s, p)
    print(n.ljust(30), 'faces', len(types), sorted(types), 'vol_mm3', round(p.Mass(), 6))
