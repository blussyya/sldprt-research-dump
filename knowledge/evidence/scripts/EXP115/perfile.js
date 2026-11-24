// EXP-115: per file, how many faces the old boundaryCycles gives up on, and how many of those the
// sector walk resolves.
const S=require('/home/user/solidworks-converters/src'),{sectorCycles}=require('./sectors.js'),fs=require('fs');
for(const file of process.argv.slice(2)){let d;try{d=S.parse(fs.readFileSync(file));}catch(e){continue;}
  let amb=0,ok=0,err={};
  d.faces.forEach(f=>{if(f.boundaryCycles||!/Ambiguous/.test(f.boundaryError||''))return;amb++;try{sectorCycles(f);ok++;}catch(e){err[e.message]=(err[e.message]||0)+1;}});
  if(amb)console.log(require('path').basename(file).slice(0,34).padEnd(34),'ambiguous',amb,'resolved',ok,JSON.stringify(err));}
