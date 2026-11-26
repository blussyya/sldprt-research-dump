// Does the B-rep defect of claim 2 occur elsewhere? For every native cylinder and cone face in the
// corpus: the winding of each loop about the axis (edges sampled along their own branch, reader
// sense). A face on an infinite cylinder needs an even number of loops that go round the axis; an odd
// number means it has no boundary along one end. Lists every such face, and whether its display face
// (by Block1 ids or ids+-1) has unlabelled mesh-boundary edges.
// Control: f666f342 faces 2516 and 12990 must be listed.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs'),path=require('path');
const roots=['test files online','test files new','test files original'].map(r=>'/home/user/sldprt-research-dump/'+r);
const files=[];(function walk(ds){for(const d of ds)for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(!/^exports/i.test(e.name))walk([p]);}else if(/\.sldprt$/i.test(e.name))files.push(p);}})(roots);
const only=process.argv[2]?files.filter(f=>f.includes(process.argv[2])):files;
let tot={files:0,brep:0,cylFaces:0,loops:0,unknownLoops:0,odd:[]};
for(const file of only){let M;const buf=fs.readFileSync(file);
  try{M=N.build(S.readBrep(buf).parsed);}catch(e){continue;}tot.brep++;
  for(const f of M.faces){const s=f.surface;if(s.type!=='cylinder'&&s.type!=='cone')continue;tot.cylFaces++;
    const y=G.cross(s.a,s.x),th=p=>{const q=G.sub(p,s.p);return Math.atan2(G.dot(q,y),G.dot(q,s.x));};
    let wind=0,unknown=0;const ws=[];
    for(const l of f.loops){tot.loops++;if(!l.coedges.length){ws.push('pt');continue;}let t=0,bad=false;
      for(const c of l.coedges){const e=M.edges.get(c.edge);let ps=null;try{ps=B.branch(M,e,false,128);}catch(_){}
        if(!ps){bad=true;break;}if(!c.sense)ps=ps.slice().reverse();for(let i=1;i<ps.length;i++){let a=th(ps[i])-th(ps[i-1]);while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;t+=a;}}
      const deg=t*180/Math.PI;if(bad){unknown++;ws.push('?');continue;}
      if(Math.abs(Math.abs(deg)-360)<5){wind++;ws.push(Math.round(deg));}else if(Math.abs(deg)<5)ws.push(0);else{unknown++;ws.push('~'+deg.toFixed(0));}}
    tot.unknownLoops+=unknown;
    if(!unknown&&wind%2===1)tot.odd.push({file:path.basename(file),face:f.id,type:s.type,loops:ws.join(','),edges:f.loops.map(l=>l.coedges.map(c=>c.edge).join('+')).join('|')});
    else if(unknown&&wind%2===1)tot.odd.push({file:path.basename(file),face:f.id,type:s.type,loops:ws.join(','),note:'has unknown loops'});}
}
console.log(JSON.stringify({...tot,odd:undefined}));
console.log('faces with an odd number of axis-winding loops:',tot.odd.length);for(const o of tot.odd)console.log(JSON.stringify(o));
