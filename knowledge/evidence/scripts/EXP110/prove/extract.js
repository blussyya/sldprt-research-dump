// EXP110 prove: per-face tail of the 132-byte bounds record (+92..+131), joined to native surface type/sense.
// usage: node extract.js out.jsonl listfile (one path per line)   (one file at a time; no procedural resolve)
const fs=require('fs');
const S=require('/home/user/solidworks-converters/src');
const N=require('/home/user/solidworks-converters/src/brep/native'),J=require('/home/user/solidworks-converters/src/brep/display-join');
const modern=require('/home/user/solidworks-converters/src/container/modern');
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>Math.hypot(a[0],a[1],a[2]);
const unit=a=>{const n=nrm(a);return n?[a[0]/n,a[1]/n,a[2]/n]:[NaN,NaN,NaN];};
const perp=(q,a)=>{const h=dot(q,a);return [q[0]-a[0]*h,q[1]-a[1]*h,q[2]-a[2]*h];};
const sc=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
// analytic surface normal (Parasolid orientation: away from axis / centre), then times face sense
function anaNormal(s,p){
  switch(s.type){
    case 'plane':return s.n;
    case 'cylinder':return unit(perp(sub(p,s.p),s.a));
    case 'cone':{const q=sub(p,s.p),r=unit(perp(q,s.a));const t=Math.tan(s.angle);return unit([r[0]-t*s.a[0],r[1]-t*s.a[1],r[2]-t*s.a[2]]);}
    case 'sphere':return unit(sub(p,s.c));
    case 'torus':{const q=sub(p,s.c),rad=perp(q,s.a),rho=nrm(rad);const rh=sc(rad,1/rho);const cc=sc(rh,s.R);return unit(sub(q,cc));}
  }
  return null;
}
function enclosing(ns){ // Badoiu-Clarkson style minimal enclosing cone axis; returns {v,halfAngle}
  let v=[0,0,0];for(const n of ns){v[0]+=n[0];v[1]+=n[1];v[2]+=n[2];}if(nrm(v)<1e-9*ns.length)v=unit(ns[0]);else v=unit(v);
  for(let k=1;k<=300;k++){let best=2,bn=null;for(const n of ns){const c=dot(n,v);if(c<best){best=c;bn=n;}}
    if(!bn)break;const w=unit([v[0]+(bn[0]-v[0])/(k+1),v[1]+(bn[1]-v[1])/(k+1),v[2]+(bn[2]-v[2])/(k+1)]);if(w.every(Number.isFinite))v=w;}
  let mc=2;for(const n of ns)mc=Math.min(mc,dot(n,v));return {v,minCos:mc};
}
const out=fs.createWriteStream(process.argv[2]);const FILES=fs.readFileSync(process.argv[3],"utf8").split("\n").filter(Boolean);
for(const f of FILES){
  const t0=Date.now();let rec={file:f};
  try{
    const b=fs.readFileSync(f);
    if(modern.isOLE2(b)){out.write(JSON.stringify({file:f,ole:true})+'\n');continue;}
    const d=S.parse(b);let j=null,M=null,berr=null;
    try{M=N.build(S.readBrep(b).parsed);j=J.join(d.faces,M);}catch(e){berr=e.message;}
    out.write(JSON.stringify({file:f,fileInfo:true,faces:d.faces.length,berr,format:d.format})+'\n');
    d.faces.forEach((fc,i)=>{
      if(!fc.bounds||fc.bounds.raw.length<132){out.write(JSON.stringify({file:f,i,nobounds:true,tag:fc.metadata&&fc.metadata.typeTag})+'\n');return;}
      const r=Buffer.from(fc.bounds.raw);
      const o={file:f,i,metaErr:fc.metadataError?String(fc.metadataError).slice(0,70):undefined,noEdge:!!fc.noEdgeTable,off:fc.offset,tag:fc.metadata&&fc.metadata.typeTag,rawId:fc.metadata&&fc.metadata.rawId,
        u92:r.readUInt32LE(92),u96:r.readUInt32LE(96),u100:r.readUInt32LE(100),u104:r.readUInt32LE(104),u108:r.readUInt32LE(108),u128:r.readUInt32LE(128),
        s:r.readFloatLE(112),v:[r.readFloatLE(116),r.readFloatLE(120),r.readFloatLE(124)],nv:fc.vertexCount};
      const nf=j&&j[i].face;o.how=j?j[i].how:'nojoin';
      if(nf){o.type=nf.surface.type;o.same=nf.sameSense;}
      // display normals
      const ns=[];const N3=fc.normals;if(N3)for(let k=0;k+2<N3.length;k+=3){const n=[N3[k],N3[k+1],N3[k+2]];if(n.every(Number.isFinite)){if(nrm(n)>0.5)ns.push(n);else o.zeroNormals=(o.zeroNormals||0)+1;}}
      o.nn=ns.length;
      if(ns.length){
        let mx=0,mn=2;for(const n of ns){const l=nrm(n);mx=Math.max(mx,Math.abs(l-1));}o.normUnitMaxDev=mx;
        const e=enclosing(ns);o.estMinCos=e.minCos;o.estV=e.v;
        const vv=o.v;o.vNorm=nrm(vv);
        // cone check vs display normals using stored v (unit-normalised) 
        const uv=unit(vv);let mc=2;for(const n of ns)mc=Math.min(mc,dot(unit(n),uv));o.minCosStoredV=mc;
        // analytic outward normals
        try{if(nf&&nf.surface.type!=='plane'&&anaNormal(nf.surface,[0,0,0])!==null&&fc.vertices){
          const sg=nf.sameSense?1:-1;let amc=2,agree=2,cnt=0;const an=[];
          for(let k=0;k<ns.length;k++){const p=[fc.vertices[3*k],fc.vertices[3*k+1],fc.vertices[3*k+2]];const a=anaNormal(nf.surface,p);if(!a||!a.every(Number.isFinite))continue;
            const aa=sc(a,sg);an.push(aa);agree=Math.min(agree,dot(unit(ns[k]),aa));amc=Math.min(amc,dot(aa,uv));cnt++;}
          o.anaCnt=cnt;o.anaAgreeMin=agree;o.anaMinCosStoredV=amc;
          if(an.length){const e2=enclosing(an);o.anaEstMinCos=e2.minCos;}
        }}catch(e){o.anaError=e.message;}
        if(nf&&nf.surface.type==='plane'){const sg=nf.sameSense?1:-1,a=sc(nf.surface.n,sg);let ag=2;for(const n of ns)ag=Math.min(ag,dot(unit(n),a));o.planeAgreeMin=ag;}
      }
      out.write(JSON.stringify(o)+'\n');
    });
  }catch(e){out.write(JSON.stringify({file:f,error:e.message,stack:String(e.stack).split('\n').slice(0,4).join(' / ')})+'\n');}
  console.error(f,Date.now()-t0,'ms');
}
out.end();
