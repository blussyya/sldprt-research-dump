'use strict';
// usage: node check.js file.SLDPRT  -> one JSON line. Checks every display vertex on cylinder/cone display faces.
const L=require('./lib');
const BAR=1e-9;           // stated bar, metres
const CHORD=1e-9;         // chord tolerance, metres
function run(file,loaded){
const out={file,bar:BAR};
try{
  const {d,M,j}=loaded||L.load(file);
  out.displayFaces=d.faces.length;out.nativeFaces=M.faces.length;
  // unit/frame check: display bbox vs native vertex bbox
  const bb=(pts)=>{const mn=[1e99,1e99,1e99],mx=[-1e99,-1e99,-1e99];for(const p of pts)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k]);}return [mn,mx];};
  const nv=[...M.vertices.values()].map(v=>v.p);
  const dv=[];for(const f of d.faces)for(let i=0;i<f.vertexCount;i++)dv.push([f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]]);
  if(nv.length&&dv.length){const a=bb(nv),b=bb(dv);out.nativeBBox=a;out.displayBBox=b;}
  // global map of float32 vertex keys -> set of face indices
  const key=(f,i)=>f.vertices[3*i]+','+f.vertices[3*i+1]+','+f.vertices[3*i+2];
  const owners=new Map();
  d.faces.forEach((f,fi)=>{for(let i=0;i<f.vertexCount;i++){const k=key(f,i);let s=owners.get(k);if(!s)owners.set(k,s=new Set());s.add(fi);}});
  const how={};let fitsClaim=0;const sb={fits2:0,chordAdj2:0,n:0,notBoundary:0,notShared:0,notChord:0,untested:0,fits:0,max:0};let offChordUntested=0,faces=0,verts=0,off=0,offShared=0,offBoundary=0,offChord=0,offChordAdj=0,offSharedChord=0,offNotChord=0,offNotShared=0,offNotBoundary=0,maxDist=0,maxDistNonOff=0,offBeyondSlack=0;
  let nonOffMax=0;const perFace=[];const offList=[];
  d.faces.forEach((f,fi)=>{
    const jj=j[fi];how[jj.how]=(how[jj.how]||0)+1;
    if(!jj.face)return;const s=jj.face.surface;
    if(s.type!=='cylinder'&&s.type!=='cone')return;
    faces++;
    const bset=new Set();let cyc=[];
    for(const c of f.boundaryCycles||[]){cyc.push(c.vertices);for(const v of c.vertices)bset.add(v);}
    const pos=i=>[f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]];
    // boundary by coordinate: the strips repeat a boundary vertex under several indices
    const bkeys=new Set([...bset].map(i=>key(f,i)));
    const bpts=[];{const seen=new Set();for(const i of bset){const k=key(f,i);if(!seen.has(k)){seen.add(k);bpts.push({i,p:pos(i)});}}}
    // adjacency neighbours in each cycle
    const nb=new Map();for(const cy of cyc){const n=cy.length;cy.forEach((v,k)=>{const a=cy[(k+n-1)%n],b=cy[(k+1)%n];if(!nb.has(v))nb.set(v,[]);nb.get(v).push([a,b]);});}
    let fOff=0,fMax=0;
    for(let i=0;i<f.vertexCount;i++){
      const q=pos(i),dist=L.distFace(s,q);verts++;
      if(dist>maxDist)maxDist=dist;if(dist>fMax)fMax=dist;
      if(dist>BAR){
        off++;fOff++;
        const isB=bkeys.has(key(f,i)),sh=owners.get(key(f,i)).size>1;
        let chord=false,chordAdj=false,chordAdj2=false;const tol2=CHORD+4*L.slack32(q);   // float32-aware tolerance, reported separately
        if(isB){
          for(const [a,b] of [...nb.entries()].filter(([vi])=>key(f,vi)===key(f,i)).flatMap(([,l])=>l))if(L.distSegment(q,pos(a),pos(b))<=CHORD&&(Math.hypot(...[0,1,2].map(k=>q[k]-pos(a)[k]))>1e-12)&&(Math.hypot(...[0,1,2].map(k=>q[k]-pos(b)[k]))>1e-12))chordAdj=true;
          for(const [a,b] of [...nb.entries()].filter(([vi])=>key(f,vi)===key(f,i)).flatMap(([,l])=>l))if(L.distSegment(q,pos(a),pos(b))<=tol2)chordAdj2=true;
          const n=bpts.length;
          if(chordAdj)chord=true;else if(n<=600){
            outer:for(let x=0;x<n;x++){const A=bpts[x];if(A.i===i)continue;if(Math.hypot(q[0]-A.p[0],q[1]-A.p[1],q[2]-A.p[2])<1e-12)continue;
              for(let y=x+1;y<n;y++){const B=bpts[y];if(B.i===i)continue;if(Math.hypot(q[0]-B.p[0],q[1]-B.p[1],q[2]-B.p[2])<1e-12)continue;
                if(L.distSegment(q,A.p,B.p)<=CHORD){chord=true;break outer;}}}
          }else chord=null;   // not tested: too many boundary points for the all-pairs search
        }
        if(isB&&sh&&chord)fitsClaim++;
        if(dist>BAR+L.slack32(q)){offBeyondSlack++;sb.n++;if(!isB)sb.notBoundary++;if(!sh)sb.notShared++;if(chord===false)sb.notChord++;if(chord===null)sb.untested++;if(isB&&sh&&chord)sb.fits++;if(isB&&sh&&(chord||chordAdj2))sb.fits2++;if(chordAdj2)sb.chordAdj2++;if(dist>sb.max)sb.max=dist;}
        if(isB)offBoundary++;else offNotBoundary++;
        if(sh)offShared++;else offNotShared++;
        if(chord)offChord++;else if(chord===null)offChordUntested++;else offNotChord++;
        if(chordAdj)offChordAdj++;
        if(sh&&chord)offSharedChord++;
        if(offList.length<2000)offList.push({face:fi,type:s.type,v:i,dist,boundary:isB,shared:sh,chord,chordAdj,slack:L.slack32(q)});
      }else if(dist>nonOffMax)nonOffMax=dist;
    }
    perFace.push({face:fi,rawId:f.metadata&&f.metadata.rawId,type:s.type,how:jj.how,vertexCount:f.vertexCount,boundaryVerts:bset.size,boundaryDistinctCoords:bkeys.size,off:fOff,maxDist:fMax});
  });
  Object.assign(out,{how,cylConeFaces:faces,verticesChecked:verts,off,offBoundary,offNotBoundary,offShared,offNotShared,offChordAnyPair:offChord,offNotChord,offChordUntested,offChordAdjacent:offChordAdj,offSharedAndChord:offSharedChord,offBeyondBarPlusFloat32Slack:offBeyondSlack,offFitsClaim:fitsClaim,beyondSlackSubset:sb,maxDist,maxDistAmongWithinBar:nonOffMax,perFace,offList:offList.slice(0,200)});
}catch(e){out.error=e.message;}
return out;}
module.exports={run};
if(require.main===module)console.log(JSON.stringify(run(process.argv[2])));
