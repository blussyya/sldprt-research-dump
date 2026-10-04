#!/usr/bin/env node
'use strict';
/* EXP-079: sketch geometry by record signature, to test the sketch grammar on every controlled
 * model before it goes into the sequential reader.
 *
 * Grammar so far (SW2022, from C00, C04, C07, C13, C14, C16, C19):
 *   sgSketch    u16 nPoints (including point 0), 12 bytes; then point 0 = the sketch's own record:
 *               attribute block, u16 kind (0x1e/0x1f), f64 x, f64 y, u16
 *   point k     u32 id, attribute block, kind, x, y, u16; a point tied to outside geometry (an
 *               object in its attribute block, e.g. the Origin) is written the same way
 *   segment     attribute block, u16 start, u16 end, u16 a, u16 b, f64 -1.0, u32 type
 *               (0 line, 1 arc; 0x20000 flags construction), and for arcs u16 centre
 *   start/end/centre are indices into the sketch's point list (0 = the sketch's own point).
 *
 * The attribute block always starts FF FF 1F 00 03 FF×8 and is 64 bytes when its one object
 * field is null; the scan only uses blocks whose object field is null or skips past it.
 */
const fs=require('fs'),path=require('path');
const P=require('../../../../package/src/parasolid/partition');
const SIG=Buffer.from('ffff1f0003ffffffffffffffff','hex');

function scan(b){
  const recs=[];
  for(let i=b.indexOf(SIG);i>=0;i=b.indexOf(SIG,i+1)){
    let after=i+64;   // block with a null object field
    if(b.readUInt16LE(i+35)!==0){   // object field set: find the block's 27-byte tail ending in 1.0, 0.0
      const tail=Buffer.from('000000000000f03f0000000000000000','hex');let t=b.indexOf(tail,i+37);if(t<0)continue;after=t+16;}
    const k=b.readUInt16LE(after);
    if(k===0x1e||k===0x1f){recs.push({kind:'point',at:i,id:b.readUInt32LE(i-4),x:b.readDoubleLE(after+2),y:b.readDoubleLE(after+10),ext:b.readUInt16LE(i+35)!==0,pre:b.subarray(i-14,i)});}
    else if(b.readDoubleLE(after+8)===-1){const type=b.readUInt32LE(after+16);
      recs.push({kind:'segment',at:i,s:b.readUInt16LE(after),e:b.readUInt16LE(after+2),a:b.readUInt16LE(after+4),type,centre:(type&0xffff)===1?b.readUInt16LE(after+20):null});}
  }
  // group into sketches: a sketch starts at a point record whose 14-byte prefix starts with nPoints and ends with u32 1
  const sketches=[];let cur=null;
  for(const r of recs){
    if(r.kind==='point'&&cur&&cur.points.length<cur.n){cur.points.push(r);continue;}
    if(r.kind==='point'){const n=r.pre.readUInt16LE(0);cur={n,points:[r],segments:[]};sketches.push(cur);continue;}
    if(cur)cur.segments.push(r);
  }
  return sketches;
}

const R='../../../../';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):/\.sldprt$/i.test(e.name)?[path.join(d,e.name)]:[]);
const only=process.argv[2]||'';
if(require.main===module)for(const f of walk(R+'test files new/SW2022')){if(!f.includes(only))continue;
  const all=P.streams(fs.readFileSync(f));const b=all['Contents/Config-0-ResolvedFeatures'];if(!b)continue;
  const sk=scan(b);console.log('==',path.basename(path.dirname(f)));
  for(const s of sk){if(s.n<2)continue;   // the Origin's sketch
    const pt=i=>s.points[i];const fmt=p=>p?`(${(p.x*1000).toFixed(3)},${(p.y*1000).toFixed(3)})`:'?';
    console.log('  sketch',s.n,'points:',s.points.map((p,i)=>i+fmt(p)+(p.ext?'*':'')).join(' '));
    for(const g of s.segments){const t=g.type&0xffff,c=g.type>>16?' construction':'';
      if(t===1){const C=pt(g.centre),A=pt(g.s),r=C&&A?Math.hypot(A.x-C.x,A.y-C.y)*1000:NaN;console.log(`    arc ${g.s}->${g.e} centre ${g.centre} ${fmt(C)} r ${r.toFixed(4)} mm${c}${g.s===g.e?' (full circle)':''}`);}
      else console.log(`    line ${g.s}->${g.e} ${fmt(pt(g.s))}->${fmt(pt(g.e))}${g.a?'':' (a=0)'}${c}`);}
  }
}
module.exports={scan};
