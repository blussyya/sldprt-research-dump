# Old (SW2013) and new (SW2026) display meshes coloured by distance to the SW2026 STEP, seen from below.
import sys, struct, numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
def tris(p):
    d=open(p,'rb').read(); n=struct.unpack('<I',d[80:84])[0]
    return np.frombuffer(d[84:84+n*50],dtype=np.dtype([('n','<f4',3),('v','<f4',(3,3)),('a','<u2')]))['v'].astype(float)
fig,ax=plt.subplots(1,2,figsize=(14,7.5))
for a,(stl,csv,t) in zip(ax,[('../view/head_back_mesh.stl','dist.csv','original file (SW2013 display list)'),('head_back-2026_mesh.stl','dist-2026.csv','SW2026 re-save')]):
    T=tris(stl); D=np.loadtxt(csv,delimiter=','); c=np.zeros(len(T)); m=D[:,0]==1; c[D[m,1].astype(int)]=D[m,5]
    o=np.argsort(-T[:,:,2].mean(1))  # view from -z: draw high z first so low z lands on top
    pc=PolyCollection(T[o][:,:,:2],array=np.clip(c[o],0,0.3),cmap='inferno',edgecolors='none',clim=(0,0.3))
    a.add_collection(pc); a.set_xlim(-70,70); a.set_ylim(-20,100); a.set_aspect('equal'); a.set_title(t); a.set_xlabel('x mm'); a.set_ylabel('y mm')
    a.add_patch(plt.Rectangle((-29,28),58,22,fill=False,ec='cyan',lw=1.2))
fig.colorbar(pc,ax=ax,shrink=0.7,label='triangle-centre distance to SW2026 STEP (mm, clipped at 0.3)')
fig.suptitle('head_back, looking up from below (-z). Cyan box: the strip over 0.1 mm')
plt.savefig('deviation_from_below.png',dpi=110,bbox_inches='tight')
