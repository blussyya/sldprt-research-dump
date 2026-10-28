// Per control: volumes (mm^3) by every route, and OCP jobs for SolidWorks' STEP and ours
const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const I=require(D),N=require(D+'brep/native'),P=require(D+'brep/procedural'),Sp=require(D+'brep/split'),T=require(D+'brep/tessellate'),V=require(D+'brep/volume');
const fs=require('fs'),path=require('path');
const [root,out]=process.argv.slice(2);
function stlVol(b){let v=0;if(b.subarray(0,5).toString()==='solid'&&!/facet/.test(b.subarray(80,300).toString())===false){const t=b.toString().matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g);const p=[...t].map(m=>[+m[1],+m[2],+m[3]]);for(let i=0;i+2<p.length;i+=3)v+=tri(p[i],p[i+1],p[i+2]);return v;}
  const n=b.readUInt32LE(80);for(let k=0;k<n;k++){const o=84+50*k+12,q=j=>[0,1,2].map(c=>b.readFloatLE(o+12*j+4*c));v+=tri(q(0),q(1),q(2));}return v;}
function tri(A,B,C){return (A[0]*(B[1]*C[2]-B[2]*C[1])-A[1]*(B[0]*C[2]-B[2]*C[0])+A[2]*(B[0]*C[1]-B[1]*C[0]))/6;}
const rows=[],jobs=[];
for(const era of ['SW2011','SW2022'])for(const m of fs.readdirSync(path.join(root,era)).sort()){
  const d=path.join(root,era,m),f=path.join(d,'model.SLDPRT');if(!fs.existsSync(f)||!fs.existsSync(path.join(d,'model.step')))continue;
  const r={id:era+'/'+m};
  try{const R=P.resolve(N.build(I.readBrep(f).parsed));r.exact=V.volume(R).volume*1e9;
    for(const tol of [1e-5,1e-6]){const c=T.check(T.tessellate(Sp.split(R),{tolerance:tol}));r['tess'+tol]=c.volume*1e9;r['open'+tol]=c.openEdges+c.repeatedEdges;}}catch(e){r.err=e.message.slice(0,80);}
  try{const mm=I.meshModel(f);let v=0;for(const F of mm.faces)for(const [a,b,c] of F.triangles)v+=tri(F.vertices[a],F.vertices[b],F.vertices[c]);r.disp=v*1e9;}catch(e){}
  const stl=['model.STL','model.stl'].map(x=>path.join(d,x)).find(fs.existsSync);if(stl)r.swstl=stlVol(fs.readFileSync(stl));
  try{const s=I.toSTEP(f);const o=path.join(out,r.id.replace('/','_')+'.step');fs.writeFileSync(o,s.text);jobs.push({id:r.id,step:o,ref:path.join(d,'model.step')});}catch(e){r.stepErr=e.message.slice(0,60);}
  rows.push(r);}
fs.writeFileSync(path.join(out,'rows.json'),JSON.stringify(rows));fs.writeFileSync(path.join(out,'jobs.txt'),jobs.map(j=>JSON.stringify(j)).join('\n')+'\n');
console.log(rows.length,'controls',jobs.length,'jobs');
