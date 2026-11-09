// Builds the per-entry table: flag (byte 5 before the length field) against the decoded
// BODY_IN_LIGHTWEIGHT_PERM value (u32 BE, 4th-to-last field of the 0x52 node before the definition).
const fs=require('fs');const {entries}=require('./entries.js');
const d='work/lb/';const idx=JSON.parse(fs.readFileSync(d+'index.json'));
const NAME=Buffer.from('BODY_IN_LIGHTWEIGHT_PERM','latin1');
const rows=[];
for(const e of idx){
  const b=fs.readFileSync(d+e.file);
  entries(b).forEach((x,i)=>{
    const flag=b[x.lenPos-5];
    const flagHex=b.subarray(x.lenPos-5,x.lenPos).toString('hex');
    const p=x.s.payload;const k=p.indexOf(NAME);
    let value=null,ptr=null,defType=null,preType=null,preHex='';
    if(k>=0){
      const defStart=k-8;defType=p.readUInt16BE(defStart);
      const pre=p.subarray(defStart-12,defStart);preHex=pre.toString('hex');
      if(pre.readUInt16BE(0)===0x52&&pre.readUInt32BE(2)===1){value=pre.readUInt32BE(8);ptr=pre.readUInt16BE(6);preType=0x52;}
      else preType=pre.readUInt16BE(0);
    }
    rows.push({file:e.file,stream:e.stream,entry:i,flag,flagHex,hasAttr:k>=0,value,ptr,preType,defType,preHex,name:x.name,bytes:x.s.payload.length});
  });
}
fs.writeFileSync(process.argv[2]||'table.json',JSON.stringify(rows,null,1));
const t={};
for(const r of rows){const key='flag='+r.flag+' | attr='+(r.hasAttr?(r.value===null?'present, no int value (pre type 0x'+r.preType.toString(16)+')':'value='+r.value):'missing');t[key]=(t[key]||0)+1;}
console.log(rows.length);console.log(t);
