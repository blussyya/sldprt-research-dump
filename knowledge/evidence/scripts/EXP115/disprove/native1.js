const {S,files,ROOT}=require('./lib');const J=require('/home/user/solidworks-converters/src/brep/display-join');
const fs=require('fs');
const pick=process.argv[2];
for(const p of files().filter(p=>p.includes(pick))){
  const b=fs.readFileSync(p);console.log(p.replace(/.*test files /,''),'magic',b.slice(0,8).toString('hex'));
  const d=S.parse(p);console.log(' display',d.format,d.faces.length);
  try{const r=S.readBrep(p);const M=S.brep.model(r.parsed);
    const j=J.join(d.faces,M);const how={};j.forEach(x=>how[x.how]=(how[x.how]||0)+1);
    console.log(' native faces',M.faces.length,'edges',M.edges.size,'bodies',M.bodies.length,'join',how);
  }catch(e){console.log(' native ERR',e.message.slice(0,200));}
}
