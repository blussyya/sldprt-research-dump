const L=require('./lib.js');
const name=process.argv[2];const {d,N,j,edgeByDisp}=L.load(L.PARTS[name]||name);
const cnt={};let nf=0;
d.faces.forEach((f,i)=>{const m=j[i];if(!m.face)return;const s=m.face.surface;if(s.type!=='cylinder'&&s.type!=='cone')return;
  nf++;const bset=new Set();for(const a of f.edgeAnnotations||[])for(const v of a.vertices)bset.add(v);
  let off=0,offB=0,offI=0,mx=0;
  for(let k=0;k<f.vertexCount;k++){const r=Math.abs(L.DJ.residual(s,L.vtx(f,k)));if(r>mx)mx=r;if(r>1e-7){off++;bset.has(k)?offB++:offI++;}}
  if(off)console.log(name,'face disp',m.face.displayId,s.type,'verts',f.vertexCount,'off',off,'boundary',offB,'interior',offI,'max',mx.toExponential(2),'how',m.how);
});
console.log(name,'cyl/cone faces',nf,'faces total',d.faces.length,'join',JSON.stringify(j.reduce((a,x)=>(a[x.how]=(a[x.how]||0)+1,a),{})));
