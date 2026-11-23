const L=require('./lib'),path=process.argv[2];
const b=L.dlBytes(path),r=L.scan(b);let c={};
for(const x of r){const m=L.meta(b,x);const k=m.err||(m.res.every(v=>v===0)?'res0':'resNZ')+' tag'+(m.tag>=4001&&m.tag<=4010?'ok':m.tag);c[k]=(c[k]||0)+1;}
console.log(c);
