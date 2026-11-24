'use strict';
const L=require('./lib');const fs=require('fs'),path=require('path');
const root='/home/user/sldprt-research-dump';
const files=process.argv.slice(2);
const out=[];
for(const f of files){
  try{
    const {dl}=L.dlOf(f);const R=L.rd(dl);const st=L.faceStarts(dl);
    const c={};for(const B of st){const r=L.readFace(R,B);const k=r.layout+(r.noBlock?'-noblock':r.bad?'-bad':'');c[k]=(c[k]||0)+1;}
    out.push({f:path.relative(root,f),faces:st.length,c});
  }catch(e){out.push({f:path.relative(root,f),err:e.message});}
}
for(const o of out)console.log(JSON.stringify(o));
