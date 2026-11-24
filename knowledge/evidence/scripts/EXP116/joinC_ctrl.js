// Control for joinC: the same join with every layout C face id shifted by +1.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),J=require(R+'/src/brep/display-join'),fs=require('fs');
const tot={faces:0,how:{},sameFace:0};
for(const f of process.argv.slice(2)){const buf=fs.readFileSync(f),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
  const real=J.join(d.faces,M);
  for(const x of d.faces)if(x.metadata&&x.metadata.layout==='C')x.metadata={...x.metadata,rawId:x.metadata.rawId+1};
  const shifted=J.join(d.faces,M);
  d.faces.forEach((x,i)=>{if(!(x.metadata&&x.metadata.layout==='C'))return;tot.faces++;const h=shifted[i].how;tot.how[h]=(tot.how[h]||0)+1;
    if(shifted[i].face&&real[i].face&&shifted[i].face===real[i].face)tot.sameFace++;});}
console.log('ids shifted by +1:',JSON.stringify(tot));
