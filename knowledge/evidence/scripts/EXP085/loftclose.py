import sys
from OCP.STEPControl import STEPControl_Reader
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE
from OCP.TopoDS import TopoDS
from OCP.BRep import BRep_Tool
from OCP.GeomAbs import GeomAbs_BSplineSurface, GeomAbs_Plane
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeFace, BRepBuilderAPI_MakeEdge, BRepBuilderAPI_MakeWire, BRepBuilderAPI_Sewing, BRepBuilderAPI_MakeSolid
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.TopoDS import TopoDS_Shell
from OCP.ShapeFix import ShapeFix_Solid
for fn in sys.argv[1:]:
    r=STEPControl_Reader();r.ReadFile(fn);r.TransferRoots();sh=r.OneShape()
    ex=TopExp_Explorer(sh,TopAbs_FACE);sides=[];planes=[]
    while ex.More():
        f=TopoDS.Face(ex.Current());ex.Next();a=BRepAdaptor_Surface(f)
        (sides if a.GetType()==GeomAbs_BSplineSurface else planes).append(f)
    top=max(planes,key=lambda f:BRepAdaptor_Surface(f).Plane().Location().Y())
    ytop=BRepAdaptor_Surface(top).Plane().Location().Y()
    sew=BRepBuilderAPI_Sewing(1e-6);isos=[]
    for f in sides:
        s=BRep_Tool.Surface_s(f);u0,u1,v0,v1=s.Bounds()
        sew.Add(BRepBuilderAPI_MakeFace(s,1e-9).Face())
        for v in (v0,v1):
            c=s.VIso(v);p=c.Value(0.5*(c.FirstParameter()+c.LastParameter()))
            if abs(p.Y()-ytop)<1e-9:isos.append(c)
        for u in (u0,u1):
            c=s.UIso(u)
    w=BRepBuilderAPI_MakeWire()
    edges=[BRepBuilderAPI_MakeEdge(c).Edge() for c in isos]
    # order edges into a loop
    from OCP.TopExp import TopExp
    from OCP.BRepLib import BRepLib_MakeWire
    mw=BRepLib_MakeWire()
    for e in edges: mw.Add(e)
    topf=BRepBuilderAPI_MakeFace(mw.Wire(),True).Face()
    for f in planes:
        if f is not top and not f.IsSame(top): sew.Add(f)
    sew.Add(topf);sew.Perform();shell=sew.SewedShape()
    from OCP.TopAbs import TopAbs_SHELL
    se=TopExp_Explorer(shell,TopAbs_SHELL);sl=TopoDS.Shell(se.Current())
    so=BRepBuilderAPI_MakeSolid(sl).Solid();fx=ShapeFix_Solid(so);fx.Perform();so=fx.Solid()
    p=GProp_GProps();BRepGProp.VolumeProperties_s(so,p,1e-12)
    print(fn[-30:],'isos',len(isos),'valid',BRepCheck_Analyzer(so).IsValid(),'free edges',sew.NbFreeEdges(),'volume %.9f'%abs(p.Mass()))
