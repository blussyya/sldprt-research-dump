'use strict';
// Which Block3 byte sits at each strip control, by strip index and strip length.
const {S,files,strips,CORPUS}=require('./lib');const fs=require('fs'),path=require('path');
const h={first:{},later:{}},byN={},perFace={},errs=[];let nfaces=0,nz=0;
for(const file of files()){let d;try{d=S.parse(file);}catch(e){errs.push([file,e.message]);continue;}
 for(const f of d.faces){if(f.noEdgeTable)continue;nfaces++;const st=strips(f);
  if(f.block3.some(x=>x))nz++;
  const key=st.map(x=>x.b3ctl).join('');
  st.forEach(x=>{const k=x.s===0?'first':'later';h[k][x.b3ctl]=(h[k][x.b3ctl]||0)+1;
   const kn=(x.s===0?'F':'L')+':'+Math.min(x.n,9)+':'+x.b3ctl;byN[kn]=(byN[kn]||0)+1;});
  if(st.length>1||f.block3.some(x=>x)){const pat=st.length===1?'single:'+st[0].b3ctl:(st[0].b3ctl+'|'+[...new Set(st.slice(1).map(x=>x.b3ctl))].join(','));perFace[pat]=(perFace[pat]||0)+1;}
 }}
console.log(JSON.stringify({faces:nfaces,facesWithNonzero:nz,h,perFace,byN,errs:errs.length},null,1));
