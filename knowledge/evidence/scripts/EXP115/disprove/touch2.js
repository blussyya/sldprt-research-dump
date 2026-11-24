const {S,files}=require('./lib');const {weld,fanWalk}=require('./fan');
const rows=require('fs').readFileSync('cause159_rows.tsv','utf8').trim().split('\n').map(l=>l.split('\t')).filter(r=>r[2]==='touch'&&!/chainwheel/.test(r[0]));
const byFile=new Map();for(const r of rows){if(!byFile.has(r[0]))byFile.set(r[0],[]);byFile.get(r[0]).push(+r[1]);}
const tally={};const per=[];
for(const p of files()){const short=p.replace(/.*test files /,'');if(!byFile.has(short))continue;const d=S.parse(p);
  for(const i of byFile.get(short)){const f=d.faces[i];const {w}=weld(f);const fw=fanWalk(f);
    const adj=new Map();for(const e of f.edgeAnnotations)if(e.id){const a=w(e.vertices[0]),b=w(e.vertices[1]);if(a===b)continue;const k=a<b?a+'|'+b:b+'|'+a;
      for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,new Map());adj.get(x).set(k,e.id);}}
    for(const [v,m] of adj)if(m.size===4){
      const ids=new Set(m.values()).size;const visiting=fw.loops.map(l=>l.verts.filter(x=>x===v).length).filter(c=>c>0);
      const k='ids='+ids+' loopVisits='+visiting.join('+')+' faceLoops='+fw.loops.length;tally[k]=(tally[k]||0)+1;}
  }}
console.log(tally);
