# Close-up of blend 3369's spine on head_back: the model's display mesh nearby (grey), offset surface
# 3368 inside its knot range (blue) and past it on the flat extension (orange), and the spine's four
# stored chart points (black). python3 plot_region.py region.json mesh.stl out.png
import json,sys,struct,numpy as np,matplotlib;matplotlib.use('Agg');import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
d=json.load(open(sys.argv[1]));raw=open(sys.argv[2],'rb').read();n=struct.unpack('<I',raw[80:84])[0]
T=np.frombuffer(raw[84:84+n*50],dtype=np.dtype([('n','<3f4'),('v','<9f4'),('a','<u2')]))['v'].reshape(-1,3,3).astype(float)
C=np.array(d['chart']);c=C.mean(0)
# the STL may be in mm while the B-rep is in metres: match scales by bounding box size
s=1.0
if np.ptp(T.reshape(-1,3),0).max()>5: s=1e-3
T=T*s;near=T[np.linalg.norm(T.mean(1)-c,axis=1)<0.045]
I=np.array(d['inside']);B=np.array(d['beyond'])
views=[(25,-60),(70,-100)]
fig=plt.figure(figsize=(14,7))
for k,(el,az) in enumerate(views):
  ax=fig.add_subplot(1,2,k+1,projection='3d')
  ax.add_collection3d(Poly3DCollection(near*1e3,facecolor=(.75,.75,.75,.35),edgecolor=(.5,.5,.5,.15),lw=.2))
  for G,col,lab in ((I,'tab:blue','offset 3368, stored patch'),(B,'tab:orange','offset 3368, flat extension past the knot range')):
    for r in G[::3]:ax.plot(*(r*1e3).T,color=col,lw=.6)
    for r in G.transpose(1,0,2)[::3]:ax.plot(*(r*1e3).T,color=col,lw=.6)
    ax.plot([],[],color=col,label=lab)
  ax.plot(*(C*1e3).T,'k-o',ms=5,lw=1.5,label='spine: the 4 points stored in the file')
  ax.text(*(C[-1]*1e3),'  stored spine end\n  (past the edge)',fontsize=8)
  ax.set_xlabel('x mm');ax.set_ylabel('y mm');ax.set_zlabel('z mm');ax.view_init(el,az)
  if k==0:ax.legend(loc='upper left',fontsize=8)
fig.suptitle('head_back (82981f2a): blend 3369 spine. Grey = SolidWorks display mesh near it. The spine runs on offset 3368, a 7 mm offset\nof the model surface; that offset is not itself in the mesh. Edge of the stored patch: v = %.4f.'%d['knotEdgeV'],fontsize=10)
plt.tight_layout();plt.savefig(sys.argv[3],dpi=110);print('mesh tris near',len(near),'scale',s)
