// Final cross-tab: flag (byte 5 before each entry's length field) against the BODY_IN_LIGHTWEIGHT_PERM value.
// Sections without a "ff fe ff" name header are continuation sections, not LocalBodies entries; they are excluded
// (the stream header count, 1, matches the entries kept).
const fs=require('fs');const {entries}=require('./entries.js');const {readAttr,instanceOf}=require('./attr_value.js');
const d='work/lb/';const idx=JSON.parse(fs.readFileSync(d+'index.json'));
const NAME=Buffer.from('BODY_IN_LIGHTWEIGHT_PERM','latin1');
function readWide(p){
  // Fallback for payloads whose definition header carries a 4-byte id field (lb11, lb27): type 0x4f at h-10, id u16 at h-4.
  const h=p.indexOf(NAME);if(h<0)return null;
  if(p.readUInt16BE(h-10)!==0x4f||p.readUInt32BE(h-8)!==NAME.length)return null;
  // wide-id payloads (4-byte ids): the definition id is the u32 before the name, and the 0x50 instance record
  // holds it within its first 20 bytes
  const id4=p.subarray(h-4,h);
  const hits=[];
  for(let q=0;q+24<=p.length;q++) if(p[q]===0&&p[q+1]===0x50&&p.readUInt32BE(q+2)===2&&p.subarray(q+6,q+24).indexOf(id4)>=0) hits.push(q);
  if(hits.length!==1) return {status:'instances '+hits.length};
  for(let r=hits[0]+12;r+12<=p.length;r++){ if(p[r]===0&&p[r+1]===0x52&&p.readUInt32BE(r+2)===1){
        // the pointer field is 2 or 4 bytes in these payloads: take the u32 whose end is followed by a record marker
        const mk=(a)=>a+1<p.length&&p[a]===0&&[0x4f,0x50,0x51,0x52,0x53,0x54].includes(p[a+1]);
        if(mk(r+12)) return {status:'ok',value:p.readUInt32BE(r+8),id:id4.toString('hex')};
        if(mk(r+14)) return {status:'ok',value:p.readUInt32BE(r+10),id:id4.toString('hex')};
        return {status:'value ambiguous'};
      } if(p[r]===0&&p[r+1]===0x50) break; }
  return {status:'no int value'};
}
const rows=[];let lb=0,streams=new Set(),headerSum=0;
const cross={};
for(const e of idx){
  const b=fs.readFileSync(d+e.file);streams.add(e.file);headerSum+=b.readUInt32LE(0);
  entries(b).forEach((x,i)=>{
    if(x.marker<0) return;               // continuation section, not an entry
    const flag=b[x.lenPos-5];
    let r=readAttr(x.s.payload,'BODY_IN_LIGHTWEIGHT_PERM');
    if(r.status!=='ok'){const w=readWide(x.s.payload); if(w) r=w;}
    const value=r.status==='ok'?String(r.value):r.status;
    const key='flag '+flag+' | attr '+value;
    cross[key]=(cross[key]||0)+1;
    rows.push({file:e.file,stream:e.stream,entry:i,name:x.name,flag,status:r.status,value:r.status==='ok'?r.value:null});
  });
}
fs.writeFileSync('final_rows.json',JSON.stringify(rows,null,1));
console.log('streams',idx.length,'files',new Set(idx.map(e=>e.file)).size,'entries',rows.length,'header-count sum',headerSum);
console.log(cross);
