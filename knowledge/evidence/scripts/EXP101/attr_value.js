// Own attribute-value reader for one section payload (Parasolid transmit data, big-endian fields).
// Layout read from the bytes:
//   definition  0x4f: u16 type | u32 nameLen | u16 id | name (ASCII)
//   instance    0x50: u16 type | u32 count(=2) | u16 p1 | u16 p2 | u16 p3 | ...   p3 = definition id
//   list        0x51: ... (between instance and value)
//   value int   0x52: u16 type | u32 1 | u16 owner-ish ref | u32 value   (12 bytes)
// The value of a definition is the first 0x52 record after its instance record.
function findDef(p,name){
  const NAME=Buffer.from(name,'latin1');
  const k=p.indexOf(NAME);if(k<0)return null;
  const at=k-8;
  if(p.readUInt16BE(at)!==0x4f||p.readUInt32BE(at+2)!==NAME.length)return {err:'def header mismatch'};
  return {at,id:p.readUInt16BE(at+6)};
}
function instanceOf(p,id){
  // every 0x50 record with count 2 whose third pointer is the definition id
  const hits=[];
  for(let q=0;q+12<=p.length;q++){
    if(p[q]===0x00&&p[q+1]===0x50&&p.readUInt32BE(q+2)===2&&p.readUInt16BE(q+10)===id)hits.push(q);
  }
  return hits;
}
function intValueAfter(p,q,limit){
  for(let r=q+12;r+12<=Math.min(p.length,limit);r++){
    if(p[r]===0x00&&p[r+1]===0x52&&p.readUInt32BE(r+2)===1)return {at:r,ref:p.readUInt16BE(r+6),value:p.readUInt32BE(r+8)};
    if(p[r]===0x00&&p[r+1]===0x50)break;  // next instance starts; stop
  }
  return null;
}
function readAttr(p,name){
  const d=findDef(p,name);
  if(!d)return {status:'missing'};
  if(d.err)return {status:d.err};
  const inst=instanceOf(p,d.id);
  if(inst.length!==1)return {status:'instances '+inst.length,id:d.id};
  const v=intValueAfter(p,inst[0],d.at);
  if(!v)return {status:'no int value',id:d.id,inst:inst[0]};
  return {status:'ok',id:d.id,inst:inst[0],valueAt:v.at,ref:v.ref,value:v.value};
}
module.exports={readAttr,findDef,instanceOf};
