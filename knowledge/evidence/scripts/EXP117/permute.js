// EXP-117: in chainwheel's control-0 single-triangle strips, which assignment of the strip's Block1
// words to the triangle's three edges makes every face's boundary graph close (every node degree 2)?
// The reader assigns words 1,2,3 to edges (v,v+1),(v,v+2),(v+1,v+2). Try all orders of words 0..3.
const S=require('/home/user/solidworks-converters/src'),fs=require('fs');
const d=S.parse(fs.readFileSync(process.argv[2]));
const perms=[];const P=(a,r=[])=>{if(r.length===3){perms.push(r);return;}for(const x of a)if(!r.includes(x))P(a,[...r,x]);};P([0,1,2,3]);
const res=[];
for(const pm of perms){let closed=0,faces=0;
  for(const f of d.faces){faces++;
    const key=i=>[0,1,2].map(k=>f.vertices[3*i+k]).join(',');
    const segs=[];let v=0,t=0;
    f.stripLengths.forEach((n,s)=>{const words=f.block1.slice(t,t+2*n-2);t+=2*n-2;
      if(f.stripControls[s]===0&&n===3){const edges=[[v,v+1],[v,v+2],[v+1,v+2]];edges.forEach((e,j)=>segs.push([e,words[pm[j]]]));}
      else{let w=1;segs.push([[v,v+1],words[w++]]);for(let i=2;i<n;i++){segs.push([[v+i-2,v+i],words[w++]]);segs.push([[v+i-1,v+i],words[w++]]);}}
      v+=n;});
    const deg=new Map();for(const [[a,b],id] of segs)if(id!==0){const A=key(a),B=key(b);if(A===B)continue;deg.set(A,(deg.get(A)||0)+1);deg.set(B,(deg.get(B)||0)+1);}
    if(deg.size&&[...deg.values()].every(x=>x===2))closed++;}
  res.push([pm.join(''),closed,faces]);}
res.sort((a,b)=>b[1]-a[1]);console.log('word order for edges (v,v+1),(v,v+2),(v+1,v+2) -> faces with every node degree 2');for(const r of res.slice(0,6))console.log('  ',r.join(' '));
