const {S,files}=require('./lib');const J=require('/home/user/solidworks-converters/src/brep/display-join');
const {weld}=require('./fan');const {simpleLoops}=require('./simpleloops');const {fanWalk}=require('./fan');
const rows=require('fs').readFileSync('cause159_rows.tsv','utf8').trim().split('\n').map(l=>l.split('\t')).filter(r=>r[2]==='touch'&&!/chainwheel/.test(r[0]));
const byFile=new Map();for(const r of rows){if(!byFile.has(r[0]))byFile.set(r[0],[]);byFile.get(r[0]).push(+r[1]);}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
for(const p of files()){const short=p.replace(/.*test files /,'');if(!byFile.has(short))continue;
  const d=S.parse(p);let M,j;try{const r=S.readBrep(p);M=S.brep.model(r.parsed);j=J.join(d.faces,M);}catch(e){console.log(short,'no native');}
  for(const i of byFile.get(short)){const f=d.faces[i];const {w,pts}=weld(f);
    const adj=new Map();for(const e of f.edgeAnnotations)if(e.id){const a=w(e.vertices[0]),b=w(e.vertices[1]);if(a===b)continue;const k=a<b?a+'|'+b:b+'|'+a;
      for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,new Map());adj.get(x).set(k,e.id);}}
    const fw=fanWalk(f);
    for(const [v,m] of adj)if(m.size===4){
      const P=[f.vertices[3*pts[v]],f.vertices[3*pts[v]+1],f.vertices[3*pts[v]+2]];
      const loopsVisiting=fw.loops.map((l,li)=>l.verts.filter(x=>x===v).length).map((c,li)=>c?li+':'+c:null).filter(Boolean);
      let nat='no native';
      if(M&&j[i].face){const nf=j[i].face;const set=new Set();const info=[];
        for(const id of new Set(m.values())){const ce=nf.loops.flatMap(l=>l.coedges).map(c=>M.edges.get(c.edge)).find(e=>e.displayId===id);
          if(!ce){info.push(id+':?');continue;}
          if(!ce.v){info.push(id+':ring');continue;}
          const near=ce.v.filter(x=>x!==null).map(x=>({x,dd:dist(M.vertices.get(x).p,P)})).sort((a,b)=>a.dd-b.dd)[0];
          info.push(id+':v'+near.x+'@'+near.dd.toExponential(1));set.add(near.x);}
        nat='distinct native verts '+set.size+' | '+info.join(' ')+' | loops(native) '+nf.loops.length;}
      console.log(short.slice(0,40),'face',i,'vertex',v,'incident ids',[...new Set(m.values())].join(','),'fan loops visiting',loopsVisiting.join(' '),'|',nat);
      break;}
  }}
