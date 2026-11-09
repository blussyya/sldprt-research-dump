'use strict';
/* Does the vector state equal a normal cone built from the face's flat triangle normals?
 * Variants of v: area-weighted sum, unweighted sum. s: min dot of triangle normals with the stored v,
 * and with the variant v. Triangle orientation is flipped to agree with the vertex normals. */
const fs=require('fs'),path=require('path');
const S=require('/home/user/conv-dev/src/index');
const ROOT='/home/user/sldprt-research-dump/';
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.w[3]===1&&r.w[4]===1);
const by={};for(const r of rows)(by[r.file]=by[r.file]||[]).push(r);
const nz=a=>{const l=Math.hypot(...a);return l?a.map(x=>x/l):a;};
const res=[];
for(const [file,rs] of Object.entries(by)){
  const d=S.parse(path.join(ROOT,file));
  for(const r of rs){
    const f=d.faces[r.idx],P=f.vertices,Nn=f.normals,T=f.triangleIndices;
    const tris=[];
    for(let t=0;t<T.length;t+=3){
      const [a,b,c]=[T[t],T[t+1],T[t+2]];
      const e1=[P[3*b]-P[3*a],P[3*b+1]-P[3*a+1],P[3*b+2]-P[3*a+2]],e2=[P[3*c]-P[3*a],P[3*c+1]-P[3*a+1],P[3*c+2]-P[3*a+2]];
      let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];
      const area=Math.hypot(...n)/2;if(!(area>0))continue;
      const vn=[Nn[3*a]+Nn[3*b]+Nn[3*c],Nn[3*a+1]+Nn[3*b+1]+Nn[3*c+1],Nn[3*a+2]+Nn[3*b+2]+Nn[3*c+2]];
      if(n[0]*vn[0]+n[1]*vn[1]+n[2]*vn[2]<0)n=n.map(x=>-x);
      tris.push({n:nz(n),area});
    }
    if(!tris.length)continue;
    const v=r.fl.slice(6,9),s=r.fl[5];
    const sumW=[0,0,0],sumU=[0,0,0];for(const t of tris)for(let k=0;k<3;k++){sumW[k]+=t.n[k]*t.area;sumU[k]+=t.n[k];}
    const vW=nz(sumW),vU=nz(sumU);
    const minD=(u)=>Math.min(...tris.map(t=>t.n[0]*u[0]+t.n[1]*u[1]+t.n[2]*u[2]));
    const ang=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])));
    res.push({file,idx:r.idx,tag:r.tag,s,sMinStoredV:minD(v),sMinW:minD(vW),sMinU:minD(vU),angW:ang(v,vW),angU:ang(v,vU),
      flipW:ang(v,vW.map(x=>-x))});
  }
}
fs.writeFileSync(__dirname+'/tri-cone.json',JSON.stringify(res));
const cnt=(f,bar)=>res.filter(x=>f(x)<=bar).length;
console.log('records',res.length);
for(const bar of [1e-6,1e-5,1e-4,1e-3,1e-2])console.log(bar,
 'v==areaWeightedTriNormalSum',cnt(x=>x.angW,bar),'v==unweighted',cnt(x=>x.angU,bar),
 's==min(tri.v_stored)',cnt(x=>Math.abs(x.s-x.sMinStoredV),bar),'s==minW',cnt(x=>Math.abs(x.s-x.sMinW),bar),'s==minU',cnt(x=>Math.abs(x.s-x.sMinU),bar));
const w=res.filter(x=>x.tag===4002);
console.log('cyl-only',w.length,'v~W<1e-3',w.filter(x=>x.angW<1e-3).length,'s~minStored<1e-4',w.filter(x=>Math.abs(x.s-x.sMinStoredV)<1e-4).length);
console.log('v angle to W deg median',(res.map(x=>x.angW).sort((a,b)=>a-b)[res.length>>1])*180/Math.PI);
