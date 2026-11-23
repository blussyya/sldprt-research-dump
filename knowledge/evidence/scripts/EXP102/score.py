# EXP-102 disprove scorer. Independent of src/parasolid/select.js.
#
# Reference B-rep: each cube's model.step (SolidWorks STEP export), read with OpenCascade (OCP).
# Display: the SLDPRT display mesh as dumped by dump.js (metres), converted to mm to match the STEP.
#
# Two sides of the distance, both reported:
#   pos_dm: each display vertex -> nearest point of the B-rep (exact, OCC vertex-to-shape distance).
#           Catches display points that sit off the B-rep. The converter does this too.
#   pos_md: each B-rep mesh node (OCC triangulation, 1e-3 mm deflection) -> nearest display triangle.
#           Catches B-rep geometry the display does not show (a hole or fillet the mesh lacks).
#           The converter does NOT do this; its residual only goes display -> B-rep.
#   ang_md: normal angle at each B-rep node vs the normal of its nearest display triangle (either sign).
#           Separates a 1 mm chamfer from a 1 mm fillet at the same vertices.
#
# Score = max(pos_dm, pos_md) in mm; the ranking uses that, then ang_md p99 as tie-break.
import json, sys, numpy as np
from OCP.STEPControl import STEPControl_Reader
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE
from OCP.TopoDS import TopoDS
from OCP.BRep import BRep_Tool
from OCP.TopLoc import TopLoc_Location
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.BRepLProp import BRepLProp_SLProps
from OCP.BRepExtrema import BRepExtrema_DistShapeShape
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeVertex
from OCP.gp import gp_Pnt

EXP = '/home/user/dump-validation/knowledge/evidence/scripts/EXP102'
CORPUS = '/home/user/sldprt-research-dump/test files new/SW2011/'
DEFL = 1e-3  # mm, B-rep mesh deflection used for sample nodes


def load_step(name, k=6):
    """Returns (shape, samples, sample normals, mesh nodes, mesh triangles).
    Samples: a k-by-k barycentric grid in UV inside each mesh triangle, mapped onto the exact face surface.
    This reaches interior points of long thin mesh triangles (a cylinder's wall); mesh nodes alone do not."""
    r = STEPControl_Reader()
    r.ReadFile(CORPUS + name + '/model.step'); r.TransferRoots()
    s = r.OneShape()
    BRepMesh_IncrementalMesh(s, DEFL, False, 0.1, True)
    sp_, sn_, nodes, tris = [], [], [], []
    ex = TopExp_Explorer(s, TopAbs_FACE)
    while ex.More():
        f = TopoDS.Face(ex.Current())
        loc = TopLoc_Location()
        tri = BRep_Tool.Triangulation_s(f, loc)
        ad = BRepAdaptor_Surface(f)
        base = len(nodes)
        trsf = loc.Transformation()
        for i in range(1, tri.NbNodes() + 1):
            p = tri.Node(i).Transformed(trsf)
            nodes.append((p.X(), p.Y(), p.Z()))
        for i in range(1, tri.NbTriangles() + 1):
            a, b, c = tri.Triangle(i).Get()
            tris.append((base + a - 1, base + b - 1, base + c - 1))
            uv = [tri.UVNode(j) for j in (a, b, c)]
            for ii in range(k + 1):
                for jj in range(k + 1 - ii):
                    w0, w1, w2 = (k - ii - jj) / k, ii / k, jj / k
                    u = w0 * uv[0].X() + w1 * uv[1].X() + w2 * uv[2].X()
                    v = w0 * uv[0].Y() + w1 * uv[1].Y() + w2 * uv[2].Y()
                    pt = ad.Value(u, v)
                    props = BRepLProp_SLProps(ad, u, v, 1, 1e-9)
                    n = props.Normal() if props.IsNormalDefined() else None
                    sp_.append((pt.X(), pt.Y(), pt.Z()))
                    sn_.append((n.X(), n.Y(), n.Z()) if n is not None else (0.0, 0.0, 0.0))
        ex.Next()
    return s, np.array(sp_), np.array(sn_), np.array(nodes), np.array(tris)


def load_display(name, shift_mm=(0.0, 0.0, 0.0)):
    d = json.load(open(f'{EXP}/out/display/{name}.json'))
    V, N, T = [], [], []
    off = 0
    for f in d['faces']:
        v = np.array(f['vertices'], dtype=float).reshape(-1, 3) * 1000.0  # m -> mm
        n = np.array(f['normals'], dtype=float).reshape(-1, 3)
        nn = np.linalg.norm(n, axis=1); nn[nn == 0] = 1; n = n / nn[:, None]
        t = np.array(f['tris'], dtype=int).reshape(-1, 3) + off
        V.append(v); N.append(n); T.append(t); off += len(v)
    V = np.vstack(V) + np.array(shift_mm); N = np.vstack(N); T = np.vstack(T)
    return V, N, T


def point_tri_dist(P, A, B, C):
    """Closest point on each triangle (A,B,C) to each point P. Shapes: P (n,3), A/B/C (m,3). Returns (n,m) distances."""
    n, m = P.shape[0], A.shape[0]
    p = P[:, None, :]; a = A[None]; b = B[None]; c = C[None]
    p = np.broadcast_to(p, (n, m, 3)); a = np.broadcast_to(a, (n, m, 3))
    b = np.broadcast_to(b, (n, m, 3)); c = np.broadcast_to(c, (n, m, 3))
    dot = lambda x, y: np.sum(x * y, axis=-1)
    ab, ac, ap = b - a, c - a, p - a
    d1, d2 = dot(ab, ap), dot(ac, ap)
    bp = p - b; d3, d4 = dot(ab, bp), dot(ac, bp)
    cp = p - c; d5, d6 = dot(ab, cp), dot(ac, cp)
    vc = d1 * d4 - d3 * d2; vb = d5 * d2 - d1 * d6; va = d3 * d6 - d5 * d4
    with np.errstate(divide='ignore', invalid='ignore'):
        vAB = (d1 / (d1 - d3))[..., None]; wAC = (d2 / (d2 - d6))[..., None]
        wBC = ((d4 - d3) / ((d4 - d3) + (d5 - d6)))[..., None]
        denom = (1.0 / (va + vb + vc))[..., None]
    vv = (vb[..., None] * denom); ww = (vc[..., None] * denom)
    cands = [
        (((d1 <= 0) & (d2 <= 0)), a),
        (((d3 >= 0) & (d4 <= d3)), b),
        (((vc <= 0) & (d1 >= 0) & (d3 <= 0)), a + ab * vAB),
        (((d6 >= 0) & (d5 <= d6)), c),
        (((vb <= 0) & (d2 >= 0) & (d6 <= 0)), a + ac * wAC),
        (((va <= 0) & ((d4 - d3) >= 0) & ((d5 - d6) >= 0)), b + (c - b) * wBC),
    ]
    q = a + ab * vv + ac * ww  # inside
    conds = [c_[..., None] for c_, _ in cands]; vals = [v for _, v in cands]
    out = np.select([*conds, np.ones_like(conds[0], dtype=bool)], [*vals, q])
    return np.linalg.norm(out - p, axis=-1)


def md_side(Pb, Nb, V, N, T, chunk=400):
    """B-rep nodes -> nearest display triangle: distance (mm) and normal angle (rad, either sign)."""
    A, B, C = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
    tn = N[T[:, 0]] + N[T[:, 1]] + N[T[:, 2]]
    tn /= np.linalg.norm(tn, axis=1)[:, None]
    dist = np.empty(len(Pb)); ang = np.empty(len(Pb))
    for s in range(0, len(Pb), chunk):
        D = point_tri_dist(Pb[s:s + chunk], A, B, C)
        D = np.where(np.isnan(D), np.inf, D)
        k = D.argmin(axis=1)
        dist[s:s + chunk] = D[np.arange(D.shape[0]), k]
        nb = Nb[s:s + chunk]
        ok = np.linalg.norm(nb, axis=1) > 0
        cosv = np.abs(np.sum(nb * tn[k], axis=1))
        a = np.arccos(np.clip(cosv, 0, 1))
        a[~ok] = np.nan
        ang[s:s + chunk] = a
    return dist, ang


def dm_side(shape, V):
    """Display vertices -> B-rep, exact OCC vertex-to-shape distance (mm)."""
    out = np.empty(len(V))
    for i, p in enumerate(V):
        v = BRepBuilderAPI_MakeVertex(gp_Pnt(*map(float, p))).Vertex()
        d = BRepExtrema_DistShapeShape(v, shape); d.Perform()
        out[i] = d.Value()
    return out


def score(display_name, cand_name, shift=(0.0, 0.0, 0.0), dm=True):
    s, Pc, Nc, _, _ = load_step(cand_name)
    V, N, T = load_display(display_name, shift)
    md, ang = md_side(Pc, Nc, V, N, T)
    res = {'cand': cand_name, 'pos_md_max_mm': float(md.max()), 'pos_md_p99_mm': float(np.percentile(md, 99)),
           'ang_md_max_rad': float(np.nanmax(ang)), 'ang_md_p99_rad': float(np.nanpercentile(ang, 99))}
    if dm:
        dd = dm_side(s, V)
        res['pos_dm_max_mm'] = float(dd.max())
    res['score_mm'] = max(res['pos_md_max_mm'], res.get('pos_dm_max_mm', 0.0))
    return res


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'pair':  # display name, candidate name
        print(json.dumps(score(sys.argv[2], sys.argv[3])))
