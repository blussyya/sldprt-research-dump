const S=require('/home/user/conv-dev/src/index');
const rows=require('fs').readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse)
 .filter(r=>r.w[3]===1&&r.w[4]===1&&r.tag===4002&&r.nat&&r.nat.surf.type==='cylinder'&&r.vc<=14);
const dg=x=>x*180/Math.PI;const seen=new Set();let k=0;
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(const r of rows){
  const d=S.parse('/home/user/sldprt-research-dump/'+r.file);const f=d.faces[r.idx];const v=r.fl.slice(6,9),s=r.fl[5],a=r.nat.surf.a;
  const ang=[];
  for(let i=0;i<f.vertexCount;i++){const n=[...f.normals.slice(3*i,3*i+3)];const c=Math.acos(Math.max(-1,Math.min(1,n[0]*v[0]+n[1]*v[1]+n[2]*v[2])));
    const cr=cross(v,n);const sg=Math.sign(cr[0]*a[0]+cr[1]*a[1]+cr[2]*a[2])||1;ang.push(+(sg*dg(c)).toFixed(3));}
  const uniq=[...new Set(ang)].sort((x,y)=>x-y);
  const key=uniq.join()+s.toFixed(5);if(seen.has(key))continue;seen.add(key);
  console.log(r.file.split('/').pop().slice(0,16),r.idx,'vc',r.vc,'acos s',dg(Math.acos(s)).toFixed(3),'distinct normal angles from v:',uniq.join(' '));
  if(++k>22)break;}
