'use strict';
// Flag vs planarity judged from the mesh itself (all stored normals equal, vertices on one plane), per file.
const {S,files,strips}=require('./lib');
function planar(f){const n=f.normals,v=f.vertices,c=f.vertexCount;
 for(let i=1;i<c;i++){if(n[3*i]*n[0]+n[3*i+1]*n[1]+n[3*i+2]*n[2]<1-1e-5)return false;}
 let d0=n[0]*v[0]+n[1]*v[1]+n[2]*v[2];
 for(let i=1;i<c;i++){if(Math.abs(n[0]*v[3*i]+n[1]*v[3*i+1]+n[2]*v[3*i+2]-d0)>2e-6)return false;}return true;}
const rows=[],tot={};
for(const file of files()){const d=S.parse(file);const o={PF:0,PU:0,CF:0,CU:0};
 for(const f of d.faces){if(f.noEdgeTable)continue;const k=(planar(f)?'P':'C')+(f.block3[0]===1?'F':'U');o[k]++;}
 if(o.PF+o.CF)rows.push({file:file.split('/').slice(-2).join('/'),...o});
 const allflag=o.PF+o.CF>0;}
console.table(rows);
const s=rows.reduce((a,r)=>{for(const k of ['PF','PU','CF','CU'])a[k]+=r[k];return a;},{PF:0,PU:0,CF:0,CU:0});console.log(s);
