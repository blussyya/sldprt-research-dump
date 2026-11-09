const S=require('/home/user/conv-dev/src/index');
const rows=require('fs').readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse)
 .filter(r=>r.w[3]===1&&r.w[4]===1&&r.tag===4002&&r.vc>=5&&r.vc<=8);
const dg=x=>x*180/Math.PI;let shown=0;const seen=new Set();
for(const r of rows){
  const d=S.parse('/home/user/sldprt-research-dump/'+r.file);const f=d.faces[r.idx];const v=r.fl.slice(6,9),s=r.fl[5];
  const a=[];for(let i=0;i<f.vertexCount;i++){const n=f.normals.slice(3*i,3*i+3);a.push(dg(Math.acos(Math.max(-1,Math.min(1,n[0]*v[0]+n[1]*v[1]+n[2]*v[2])))));}
  const key=a.map(x=>x.toFixed(2)).join(',')+s.toFixed(5);if(seen.has(key))continue;seen.add(key);
  console.log(r.file.split('/').pop().slice(0,22),r.idx,'vc',r.vc,'acos s',dg(Math.acos(s)).toFixed(3),'angles to v',a.map(x=>x.toFixed(2)).join(' '));
  if(++shown>14)break;
}
