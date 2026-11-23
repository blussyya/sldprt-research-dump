const fs=require('fs');const P=require('/home/user/solidworks-converters/src/parasolid/partition.js');
const s=P.streams(fs.readFileSync(process.argv[2]));
const h=Buffer.from(s.Header2);
const str=[];let cur='';for(const c of h){if(c>=32&&c<127)cur+=String.fromCharCode(c);else{if(cur.length>=4)str.push(cur);cur=''}}
console.log(str.join(' | ').slice(0,1500));
// utf16
let u='',us=[];for(let i=0;i+1<h.length;i+=1){}
const t=h.toString('utf16le');console.log([...t.matchAll(/[\x20-\x7e]{4,}/g)].map(m=>m[0]).join(' | ').slice(0,1500));
