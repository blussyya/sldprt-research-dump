# EXP-102: API probe for the OCP scorer (mesh nodes, UV, normals, vertex distance).
from OCP.STEPControl import STEPControl_Reader
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE
from OCP.TopoDS import TopoDS
from OCP.BRep import BRep_Tool
from OCP.TopLoc import TopLoc_Location
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.BRepLProp import BRepLProp_SLProps
from OCP.BRepExtrema import BRepExtrema_DistShapeShape as BRepExtrema_DistShapeToShape
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeVertex
from OCP.gp import gp_Pnt
r = STEPControl_Reader(); r.ReadFile('/home/user/sldprt-research-dump/test files new/SW2011/C04_cube_hole_5mm/model.step'); r.TransferRoots(); s = r.OneShape()
BRepMesh_IncrementalMesh(s, 1e-3, False, 0.1, True)
ex = TopExp_Explorer(s, TopAbs_FACE); n = 0
while ex.More() and n < 2:
    f = TopoDS.Face(ex.Current()); loc = TopLoc_Location()
    tri = BRep_Tool.Triangulation_s(f, loc)
    print('face', n, 'nodes', tri.NbNodes(), 'tris', tri.NbTriangles(), 'hasUV', tri.HasUVNodes(), 'loc identity', loc.IsIdentity())
    p = tri.Node(1); uv = tri.UVNode(1)
    sp = BRepLProp_SLProps(BRepAdaptor_Surface(f), uv.X(), uv.Y(), 1, 1e-9)
    print('  node1', p.X(), p.Y(), p.Z(), 'normal defined', sp.IsNormalDefined(), sp.Normal().X(), sp.Normal().Y(), sp.Normal().Z())
    ex.Next(); n += 1
v = BRepBuilderAPI_MakeVertex(gp_Pnt(0.0, 0.0, 0.0)).Vertex()
d = BRepExtrema_DistShapeToShape(v, s); d.Perform()
print('dist vertex origin to shape (mm):', d.Value(), 'solutions', d.NbSolution())
