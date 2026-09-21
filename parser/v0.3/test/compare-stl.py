"""Independent binary STL comparison. Requires NumPy; no fitting/alignment.
Reports deterministic sampled bidirectional point-to-triangle distances, not Hausdorff proof.
"""
from pathlib import Path
import json,struct,hashlib,subprocess,sys
import numpy as np
ROOT=Path(__file__).resolve().parents[3]
code="""const fs=require('fs'),p=require('./parser/v0.3/src/parser-core'),z=require('zlib');let out=[];for(const n of fs.readdirSync('test files new/SW2011')){let file='test files new/SW2011/'+n+'/model.SLDPRT';if(!fs.existsSync(file))continue;let r=p.parseSLDPRT(fs.readFileSync(file),z.inflateRawSync,z.inflateSync);if(r.errors.length||r.rejected.length)throw Error(file);out.push({file,triangles:r.faces.flatMap(f=>{let a=[];for(let i=0;i<f.triangleIndices.length;i+=3)a.push([...f.triangleIndices.slice(i,i+3)].map(j=>[...f.vertices.slice(j*3,j*3+3)]));return a;})});}console.log(JSON.stringify(out));"""
models=json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT))
sha=lambda b:hashlib.sha256(b).hexdigest()
def stl(path):
 b=path.read_bytes();n=struct.unpack_from('<I',b,80)[0];assert len(b)==84+50*n,'not the expected binary STL'
 dt=np.dtype([('normal','<f4',(3,)),('vertices','<f4',(3,3)),('attr','<u2')])
 return np.frombuffer(b,dt,count=n,offset=84)['vertices'].astype(float)/1000

def distances(points,t):
 a,b,c=t[:,0],t[:,1],t[:,2];ab=b-a;ac=c-a;n=np.cross(ab,ac);n2=(n*n).sum(1)
 out=[]
 for batch in np.array_split(points,max(1,(len(points)+31)//32)):
  ap=batch[:,None,:]-a;dn=(ap*n).sum(2);projection=ap-dn[:,:,None]*n/np.maximum(n2,1e-300)[None,:,None]
  d00=(ab*ab).sum(1);d01=(ab*ac).sum(1);d11=(ac*ac).sum(1);den=d00*d11-d01*d01
  d20=(projection*ab).sum(2);d21=(projection*ac).sum(2)
  v=(d11*d20-d01*d21)/np.maximum(den,1e-300);w=(d00*d21-d01*d20)/np.maximum(den,1e-300)
  inside=(v>=0)&(w>=0)&(v+w<=1)&(n2>1e-30)
  ds=np.where(inside,dn*dn/np.maximum(n2,1e-300),np.inf)
  for x,y in [(a,b),(b,c),(c,a)]:
   edge=y-x;pe=batch[:,None,:]-x;u=np.clip((pe*edge).sum(2)/np.maximum((edge*edge).sum(1),1e-300),0,1)
   ds=np.minimum(ds,((pe-u[:,:,None]*edge)**2).sum(2))
  out.extend(np.sqrt(ds.min(axis=1)))
 return np.array(out)
def sample(t):
 p=np.concatenate([t.reshape(-1,3),t.mean(axis=1)]);return p[np.linspace(0,len(p)-1,min(256,len(p)),dtype=int)]
def area(t):return float(np.linalg.norm(np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0]),axis=1).sum()/2)
rows=[]
for m in models:
 path=ROOT/m['file'];ref=path.with_suffix('.STL');a=np.array(m['triangles']);b=stl(ref)
 da=distances(sample(a),b);db=distances(sample(b),a)
 ba=np.r_[a.min((0,1)),a.max((0,1))];bb=np.r_[b.min((0,1)),b.max((0,1))]
 # Explicit diagnostic hypothesis: export-origin shift rounded to 1 mm, no rotation or scaling fit.
 shift=np.round(((bb[:3]+bb[3:])-(ba[:3]+ba[3:]))/2*1000)/1000
 alignedA=distances(sample(a)+shift,b);alignedB=distances(sample(b)-shift,a)
 row=dict(candidateSTLTranslationMetres=shift.tolist(),translatedParserToSTLSampledMaxMetres=float(alignedA.max()),translatedSTLToParserSampledMaxMetres=float(alignedB.max()),file=m['file'],sha256=sha(path.read_bytes()),stlSHA256=sha(ref.read_bytes()),parserTriangles=len(a),stlTriangles=len(b),bboxMaxDifferenceMetres=float(abs(ba-bb).max()),parserAreaM2=area(a),stlAreaM2=area(b),parserToSTLSampledMaxMetres=float(da.max()),stlToParserSampledMaxMetres=float(db.max()))
 row['outerPlaneTriangles']=[dict(axis=k,coordinate=float(x),parser=int(np.all(abs(a[:,:,k]-x)<1e-8,axis=1).sum()),stl=int(np.all(abs(b[:,:,k]-x)<1e-8,axis=1).sum())) for k in range(3) for x in [ba[k],ba[k+3]]]
 rows.append(row);print(path.parent.name,'raw',format(max(da.max(),db.max()),'.6g'),'translated',format(max(alignedA.max(),alignedB.max()),'.6g'),flush=True)
result=dict(method='STL mm converted to m; no fit; up to 256 deterministic vertex/centroid samples in each direction; Euclidean point-to-triangle distance',numpyVersion=np.__version__,scriptSHA256=sha(Path(__file__).read_bytes()),rows=rows)
(Path(__file__).parent/'STL_RESULTS.json').write_text(json.dumps(result,indent=2)+'\n')

if '--render' in sys.argv:
 import matplotlib
 matplotlib.use('Agg')
 import matplotlib.pyplot as plt
 from mpl_toolkits.mplot3d.art3d import Poly3DCollection
 dest=Path(__file__).parent/'renders';dest.mkdir(exist_ok=True)
 for name in ['C04_cube_hole_5mm','C10_cube_shell_1mm']:
  m=next(m for m in models if name in m['file']);a=np.array(m['triangles']);b=stl((ROOT/m['file']).with_suffix('.STL'))
  fig=plt.figure(figsize=(14,7));lo=np.minimum(a.min((0,1)),b.min((0,1)));hi=np.maximum(a.max((0,1)),b.max((0,1)));ctr=(lo+hi)/2;size=max(hi-lo)*.65
  for row,tri in enumerate([a,b]):
   for col,(el,az) in enumerate([(30,45),(30,225),(-30,45),(90,0)]):
    ax=fig.add_subplot(2,4,row*4+col+1,projection='3d');ax.add_collection3d(Poly3DCollection(tri,facecolors='#73a6b6',edgecolors='#34444c',linewidths=.25));ax.set(xlim=(ctr[0]-size,ctr[0]+size),ylim=(ctr[1]-size,ctr[1]+size),zlim=(ctr[2]-size,ctr[2]+size));ax.set_box_aspect([1,1,1]);ax.view_init(el,az);ax.set_axis_off();ax.set_title(('Parser' if row==0 else 'STL')+f' · {el}/{az}')
  fig.suptitle(name+' · same coordinates and camera');fig.tight_layout();fig.savefig(dest/(name+'.png'),dpi=120);plt.close(fig)
