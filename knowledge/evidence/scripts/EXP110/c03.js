const S=require('/home/user/conv-dev/src/index');
const rows=require('fs').readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse);
const file='test files new/SW2022/C03_cube_fillet_1mm/model.SLDPRT';
const d=S.parse('/home/user/sldprt-research-dump/'+file);
const r=rows.find(r=>r.file===file&&r.idx===6);
console.log(JSON.stringify(r,null,0));
const f=d.faces[6];const v=r.fl.slice(6,9);
for(let i=0;i<f.vertexCount;i++){const p=[...f.vertices.slice(3*i,3*i+3)],n=[...f.normals.slice(3*i,3*i+3)];
 console.log(p.map(x=>x.toFixed(5)).join(','),'|',n.map(x=>x.toFixed(4)).join(','),'ang',(Math.acos(n[0]*v[0]+n[1]*v[1]+n[2]*v[2])*180/Math.PI).toFixed(2));}
console.log('s angle deg',Math.acos(r.fl[5])*180/Math.PI);
