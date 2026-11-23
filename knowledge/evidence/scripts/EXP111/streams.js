'use strict';
// Print stream names, sizes, ModelStamps time, and docProps core times for one file.
const fs=require('fs');const P=require('../../../../package/src/parasolid/partition');
const f=process.argv[2];const all=P.streams(fs.readFileSync(f));
for(const k of Object.keys(all))console.log(all[k].length,k);
const ms=Object.keys(all).find(k=>/ModelStamps$/.test(k));if(ms){const b=all[ms];console.log('ModelStamps',b.toString('hex'),new Date(b.readUInt32LE(0)*1000).toISOString());}
