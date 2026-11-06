# Distance from our display-list STL to SolidWorks' own STEP B-rep (OpenCascade, mm).
# Measures every STL vertex and every triangle centroid (chord sag shows at centroids).
# usage: python3 -I measure.py part.STEP mesh.stl out.csv [workers]
import sys, struct, numpy as np
from multiprocessing import Pool
step, stl, out = sys.argv[1:4]; W = int(sys.argv[4]) if len(sys.argv) > 4 else 4
def load():
    from OCP.STEPControl import STEPControl_Reader
    r = STEPControl_Reader(); r.ReadFile(step); r.TransferRoots(); return r.OneShape()
def work(chunk):
    from OCP.BRepExtrema import BRepExtrema_DistShapeShape
    from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeVertex
    from OCP.gp import gp_Pnt
    from OCP.TopAbs import TopAbs_FACE
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopoDS import TopoDS
    shape = load(); faces = []; e = TopExp_Explorer(shape, TopAbs_FACE)
    while e.More(): faces.append(TopoDS.Face(e.Current())); e.Next()
    res = []
    for kind, i, p in chunk:
        ds = BRepExtrema_DistShapeShape(BRepBuilderAPI_MakeVertex(gp_Pnt(*p)).Vertex(), shape)
        f = ds.SupportOnShape2(1); fi = next((k for k, F in enumerate(faces) if F.IsSame(f)), -1)
        res.append((kind, i, *p, ds.Value(), fi))
    return res
if __name__ == '__main__':
    d = open(stl, 'rb').read(); n = struct.unpack('<I', d[80:84])[0]
    tri = np.frombuffer(d[84:84 + n * 50], dtype=np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]))['v'].astype(float)
    V = np.unique(tri.reshape(-1, 3), axis=0); C = tri.mean(1)
    jobs = [(0, i, tuple(p)) for i, p in enumerate(V)] + [(1, i, tuple(p)) for i, p in enumerate(C)]
    chunks = [jobs[k::W * 8] for k in range(W * 8)]
    rows = [r for part in Pool(W).map(work, chunks) for r in part]
    a = np.array(rows); np.savetxt(out, a, delimiter=',', header='kind(0=vertex 1=centroid),i,x,y,z,dist_mm,step_face', fmt='%.10g')
    for k, name in ((0, 'vertices'), (1, 'centroids')):
        dd = a[a[:, 0] == k, 5]
        print(f'{name}: {len(dd)}  max {dd.max():.4g} mm  mean {dd.mean():.3g}  median {np.median(dd):.3g}  ' + '  '.join(f'>{t}:{(dd > t).sum()}' for t in (1e-3, 1e-2, 0.05, 0.1, 0.5)))
