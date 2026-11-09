// Probe: for each LocalBodies entry, find the BODY_IN_LIGHTWEIGHT_PERM definition (type 0x4f,
// u32 name length 24, u16 id, ASCII name). Print the 12 bytes before the definition node.
const fs=require('fs');const {entries}=require('./entries.js');
const d='work/lb/';const idx=JSON.parse(fs.readFileSync(d+'index.json'));
const NAME=Buffer.from('BODY_IN_LIGHTWEIGHT_PERM','latin1');
const cnt={};const ex={};
for(const e of idx){
  const b=fs.readFileSync(d+e.file);
  for(const x of entries(b)){
    const p=x.s.payload;const k=p.indexOf(NAME);
    if(k<0){const key='nohit';cnt[key]=(cnt[key]||0)+1;continue;}
    const defStart=k-8;
    const type=p.readUInt16BE(defStart),ln=p.readUInt32BE(defStart+2);
    const pre=p.subarray(defStart-12,defStart);
    const key=(type.toString(16))+' len'+ln+' pre:'+pre.subarray(0,6).toString('hex');
    cnt[key]=(cnt[key]||0)+1; ex[key]=ex[key]||[e.file,pre.toString('hex').match(/../g).join(' ')];
  }
}
console.log(cnt);console.log(ex);
