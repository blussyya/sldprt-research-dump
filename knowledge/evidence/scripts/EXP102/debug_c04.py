# EXP-102 debug: which C04 B-rep nodes are nearest the C18 display, and are any NaN.
import sys; sys.path.insert(0, "/home/user/dump-validation/knowledge/evidence/scripts/EXP102")
import numpy as np, score as S
Pc, Nc, Tc = S.load_step('C04_cube_hole_5mm')[1:]
V, N, T = S.load_display('C18_cube_split_line')
print('C04 nodes', len(Pc), 'tris', len(Tc), 'nodes with zero normal', int((np.linalg.norm(Nc,axis=1)==0).sum()))
print('C18 display verts', len(V), 'tris', len(T), 'box mm', V.min(0), V.max(0))
d, a = S.md_side(Pc, Nc, V, N, T)
print('md dist max', d.max(), 'nan count', int(np.isnan(d).sum()), 'argmax node', Pc[d.argmax()], 'median', np.median(d))
hole = np.where(np.hypot(Pc[:,0]-5, Pc[:,1]-5) < 2.6)[0]
print('nodes on hole radius', len(hole), 'their dist max', d[hole].max() if len(hole) else None, 'sample', Pc[hole[:3]].tolist(), d[hole[:3]].tolist())
A,B,C = V[T[:,0]],V[T[:,1]],V[T[:,2]]
test = S.point_tri_dist(np.array([[2.5,5.0,5.0],[5.0,5.0,5.0],[0.0,0.0,0.0]]), A,B,C)
print('point_tri_dist sanity (expect 2.5 at hole wall? 5 at centre, 0 at corner):', test.min(axis=1))
