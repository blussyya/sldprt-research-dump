// per part: B-rep triangulation at 1e-5 m against the exact volume and the display mesh's volume (mm^3)
const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const I=require(D),N=require(D+'brep/native'),P=require(D+'brep/procedural'),Sp=require(D+'brep/split'),T=require(D+'brep/tessellate'),V=require(D+'brep/volume');
const fs=require('fs');
for(const f of process.argv.slice(2)){const t0=Date.now();try{
  const R=P.resolve(N.build(I.readBrep(fs.readFileSync(f)).parsed)),M=Sp.split(R);
  const exact=V.volume(R).volume,t=T.tessellate(M,{tolerance:1e-5}),c=T.check(t);
  let dv='-';try{const m=I.meshModel(fs.readFileSync(f));if(m.source==='display mesh'){let v=0;for(const F of m.faces)for(const [a,b,cc] of F.triangles){const A=F.vertices[a],B=F.vertices[b],C=F.vertices[cc];v+=(A[0]*(B[1]*C[2]-B[2]*C[1])-A[1]*(B[0]*C[2]-B[2]*C[0])+A[2]*(B[0]*C[1]-B[1]*C[0]))/6;}dv=((c.volume-v)/v).toExponential(2);}}catch(e){dv='err';}
  console.log(f.split('/').pop().slice(0,32).padEnd(32),'faces',M.faces.length,'tris',c.triangles,'open',c.openEdges,'rep',c.repeatedEdges,'vol',(c.volume*1e9).toFixed(4),'exact',exact===undefined?'?':(exact*1e9).toFixed(4),'vsDisp',dv,'rel',exact?((c.volume-exact)/exact).toExponential(2):'-',(Date.now()-t0)+'ms');
}catch(e){console.log(f.split('/').pop().slice(0,32).padEnd(32),'ERR',e.message.slice(0,120),e.stack.split('\n')[1]);}}
