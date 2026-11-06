const fs=require('fs');
for(const f of fs.readdirSync('out2').filter(x=>x.endsWith('.json'))){
  const o=JSON.parse(fs.readFileSync('out2/'+f));
  console.log('\n'+f,'displayFaces',o.displayFaces,'boundsMissing',o.boundsMissing);
  for(const r of o.rows)console.log(' ',r.name.replace('Contents/',''),'faces',r.faces,'gap',r.gap===undefined?'-':r.gap.toExponential(2),'step',r.stepHash,r.stepLen,r.error||'','ms',r.ms);
}
