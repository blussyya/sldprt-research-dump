'use strict';
// Own reader for the bytes after the bounding record. Uses the converter only to inflate the
// DisplayLists stream and to find face records (geometryEnd = start of the bounding record).
const S=require('/home/user/solidworks-converters/src');
const fs=require('fs');
function dlOf(file){
  const b=fs.readFileSync(file);
  const modern=S.container.modern;
  return {buf:b,dl:modern.findDisplayLists(b,S.inflateRaw,S.inflateZlib)};
}
function faceStarts(dl){
  const r=S.display.extractDisplayLists(new Uint8Array(dl.buffer,dl.byteOffset,dl.length),false);
  return r.faces.map(f=>f.geometryEnd);
}
const rd=dl=>({u:o=>(o+4<=dl.length&&o>=0)?dl.readUInt32LE(o):null,f:o=>(o+8<=dl.length&&o>=0)?dl.readDoubleLE(o):NaN});
function hdr(R,o,stride,kind){const h=[R.u(o),R.u(o+4),R.u(o+8),R.u(o+12)];return(h[0]===stride&&h[1]===kind&&h[2]===2)?h[3]:null;}
// skip one typed array: returns {n,end} or null
function skip(R,o,stride,kind){const n=hdr(R,o,stride,kind);return n===null?null:{n,end:o+16+stride*n};}
// Parse the id/tag block that follows pos/normal arrays. 'at' = offset of the u32 before the [12,100,2] positions.
function idBlock(R,at){
  const p=skip(R,at+4,12,100);if(!p)return null;const q=skip(R,p.end,12,100);if(!q)return null;
  let o=q.end;const sf=R.u(o);o+=4;
  if(sf===1){for(let i=0;i<2;i++){const a=skip(R,o,4,100);if(!a)return null;o=a.end;}}else if(sf!==0)return null;
  const res=[R.u(o),R.u(o+4),R.u(o+8)];o+=12;
  if(res.some(x=>x!==0))return {noBlock:true,res};
  const id=R.u(o),tag=R.u(o+28);
  return {id,tag,tagOff:o+28,idOff:o};
}
// classify layout from bytes only
function readFace(R,B){
  const w128=R.u(B+128);
  // layout A: [8,100,2,K] at +132
  const k=hdr(R,B+132,8,100);
  if(k!==null){const at=B+132+16+8*k; // after the array, then u32 flag
    return Object.assign({layout:'A',w128,K:k,flag:R.u(at)},idBlock(R,at)||{bad:true});}
  // layout B: float64 at +92 == 2*float64 at +84, array at +140
  const r=R.f(B+84),d=R.f(B+92);
  if(Math.abs(d-2*r)<=1e-12*Math.max(1,Math.abs(d))){const k2=hdr(R,B+140,8,100);
    if(k2!==null){const at=B+140+16+8*k2;return Object.assign({layout:'B',K:k2,flag:R.u(at)},idBlock(R,at)||{bad:true});}}
  // layout C: +128 is 0, +132 is 1, positions at +136
  if(w128===0&&R.u(B+132)===1&&hdr(R,B+136,12,100)!==null)
    return Object.assign({layout:'C',w128,flag:1},idBlock(R,B+132)||{bad:true});
  return {layout:'?',w128,w132:R.u(B+132)};
}
module.exports={S,dlOf,faceStarts,rd,readFace,idBlock,hdr,skip};
