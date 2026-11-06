const fs=require('fs');const P=require('/home/user/solidworks-converters/src/parasolid/partition.js');
const f=process.argv[2];const t=Date.now();const r=P.readBody(fs.readFileSync(f),{});
console.log(f.split('/').pop(),JSON.stringify(r.configuration),(Date.now()-t)+'ms');
