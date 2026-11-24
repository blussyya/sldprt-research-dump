const {key}=require('./lib');
// simple rule loops: components when every vertex has degree 2; else null
function simpleLoops(f){
  const ids=new Map();const w=i=>{const k=key(f,i);if(!ids.has(k))ids.set(k,ids.size);return ids.get(k);};
  const pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;const seg=new Map();
  for(const e of f.edgeAnnotations)if(e.id){const a=w(e.vertices[0]),b=w(e.vertices[1]);if(a!==b)seg.set(pk(a,b),e.id);}
  const adj=new Map();for(const [k,id] of seg){const [a,b]=k.split('|').map(Number);for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push({to:y,id,k});}}
  if([...adj.values()].some(l=>l.length!==2))return null;
  const seenV=new Set(),loops=[];
  for(const s of adj.keys())if(!seenV.has(s)){const segs=[],idsq=[];let prev=null,cur=s;
    do{seenV.add(cur);const e=adj.get(cur).find(e=>e.k!==prev);segs.push(e.k);idsq.push(e.id);prev=e.k;cur=e.to;}while(cur!==s);
    loops.push({segs,ids:idsq});}
  return loops;
}
module.exports={simpleLoops};
