'use strict';
const fs=require('fs');const P=require('../../../../package/src/parasolid/partition');
const all=P.streams(fs.readFileSync(process.argv[2]));
for(const k of process.argv.slice(3)){const n=Object.keys(all).find(x=>x.endsWith(k));console.log('--',k);console.log(n?all[n].toString('utf8'):'(none)');}
