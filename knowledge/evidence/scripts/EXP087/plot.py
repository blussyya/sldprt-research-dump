import json,sys,numpy as np,matplotlib;matplotlib.use('Agg');import matplotlib.pyplot as plt
d=json.load(open(sys.argv[1]));P=np.array(d['pts']);Fi=np.array(d['fit']);Q=np.array(d['q'])
# frame: x along the chord of the stretch, y and z across it
o=P[0];x=P[-1]-P[0];x/=np.linalg.norm(x)
def dev(A):  # distance from each point to the dense fit polyline, and position along x
  out=[]
  for a in A:
    k=np.argmin(np.linalg.norm(Fi-a,axis=1));best=1e9
    for j in (k-1,k):
      if 0<=j<len(Fi)-1:
        b,c=Fi[j],Fi[j+1];u=np.clip(np.dot(a-b,c-b)/np.dot(c-b,c-b),0,1);best=min(best,np.linalg.norm(a-(b+u*(c-b))))
    out.append(best)
  return np.array(out)
fig,ax=plt.subplots(2,1,figsize=(9,7))
# top: shape, projected on the plane of the two largest spreads
C=np.vstack([Fi,Q,P])-o;_,_,V=np.linalg.svd(C,full_matrices=False);e1,e2=V[0],V[1]
for A,st,lab in ((Fi,'-','fit'),(Q,'.','exact (dense)'),(P,'o','pinned points')):
  ax[0].plot((A-o)@e1*1e3,(A-o)@e2*1e3,st,ms=3 if st=='.' else 6,label=lab,mfc='none' if st=='o' else None)
ax[0].set_xlabel('mm');ax[0].set_ylabel('mm');ax[0].legend();ax[0].set_title('spine of blend 3369 near the bad intervals');ax[0].axis('equal')
ax[1].semilogy((Q-o)@x*1e3,np.maximum(dev(Q),1e-14),'.',ms=3,label='exact point to fit')
ax[1].semilogy((P-o)@x*1e3,np.maximum(dev(P),1e-14),'o',mfc='none',label='pinned point to fit')
ax[1].axhline(1e-9,color='r',lw=.8,label='tolerance 1e-9 m');ax[1].set_xlabel('along chord, mm');ax[1].set_ylabel('m');ax[1].legend()
plt.tight_layout();plt.savefig(sys.argv[2],dpi=110)
print('pts',len(P),'q',len(Q),'max dev',dev(Q).max())
