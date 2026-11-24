'use strict';
// Own reader for the bytes after the face bounding record. Returns a plain object per face.
const L=require('./lib');
function classify(m,G){
  const A=m.hdr(G+132,8,100)!==null;
  const C=m.u(G+128)===0&&m.u(G+132)===1&&m.hdr(G+136,12,100)!==null;
  const B=m.hdr(G+140,8,100)!==null;
  const hits=[A&&'A',B&&'B',C&&'C'].filter(Boolean);
  return hits.length===1?hits[0]:(hits.length?'multi:'+hits.join(''):'none');
}
// walk from the u32 flag that precedes the positions array
function walk(m,p,shift){
  const o={};
  o.flag=m.u(p);
  const n=m.hdr(p+4+shift,12,100);if(n===null)return {err:'no positions'};
  let e=p+4+shift+16+12*n;
  const nn=m.hdr(e,12,100);if(nn!==n)return {err:'no normals'};
  e+=16+12*n;
  o.sf=m.u(e);e+=4;
  if(o.sf===1){for(let i=0;i<2;i++){const k=m.hdr(e,4,100);if(k===null)return {err:'scalar arr'};(o.sk=o.sk||[]).push(k);e+=16+4*k;}}
  else if(o.sf!==0)return {err:'sf='+o.sf};
  o.res=[m.u(e),m.u(e+4),m.u(e+8)];e+=12;
  o.idPos=e;
  o.id=m.u(e);o.dir=[m.f(e+4),m.f(e+12),m.f(e+20)];e+=28;
  o.tag=m.u(e);o.par=[];for(let i=0;i<8;i++)o.par.push(m.f(e+4+8*i));
  o.count=m.u(e+68);
  o.edges=[];for(let i=0;i<o.count&&i<10000;i++)o.edges.push([m.u(e+72+8*i),m.u(e+76+8*i)]);
  o.end=e+72+8*o.count;
  return o;
}
function readFace(m,G){
  const lay=classify(m,G);
  let w=null;
  if(lay==='A'){const k=m.hdr(G+132,8,100);w=walk(m,G+132+16+8*k,0);w.a8count=k;}
  else if(lay==='C')w=walk(m,G+132,0);
  else if(lay==='B'){const k=m.hdr(G+140,8,100);w=walk(m,G+140+16+8*k,0);w.a8count=k;}
  return {lay,w,u128:m.u(G+128)};
}
module.exports={classify,walk,readFace};
