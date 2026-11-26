// Claim 4: scan every .sldprt in the three corpus folders (skipping folders named exports*) for
// display faces with mesh-boundary edges (used by one triangle, exact-coordinate weld) that carry
// no Block1 id. Own boundary code (lib.js), not display.js's cycles.
// Controls: (a) f666f342 faces 75 and 448 must come out; (b) in every 50th face with labelled
// boundary edges, zero one labelled boundary segment's id in a copy and check the scan flags it.
// Also counts faces with no Block1 at all (plate4-style records), which the definition can't apply to.
const L=require('./lib'),S=require(L.R+'/src'),fs=require('fs'),path=require('path');
const roots=['test files online','test files new','test files original'].map(r=>'/home/user/sldprt-research-dump/'+r);
const files=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(/^exports/i.test(e.name))continue;walk(p);}else if(/\.sldprt$/i.test(e.name))files.push(p);}}
roots.forEach(walk);
const tot={files:files.length,parsed:0,faces:0,facesWithEdgeTable:0,noEdgeTableFaces:0,noEdgeTableFiles:[],hits:[],ctrlTried:0,ctrlFlagged:0,errors:[],byIndexUnl:0,reexportFiles:0,reexportFaces:0};
let k=0;
for(const file of files){
  let d;try{d=S.parse(fs.readFileSync(file));}catch(e){tot.errors.push(file+': '+e.message);continue;}
  if(!d.faces.length){tot.errors.push(path.basename(file)+': '+(d.errors||[]).join(';'));continue;}
  tot.parsed++;const rex=/re-exports/.test(file);if(rex)tot.reexportFiles++;
  d.faces.forEach((f,fi)=>{tot.faces++;if(rex)tot.reexportFaces++;
    if(f.noEdgeTable){tot.noEdgeTableFaces++;if(!tot.noEdgeTableFiles.includes(path.basename(file)))tot.noEdgeTableFiles.push(path.basename(file));return;}
    tot.facesWithEdgeTable++;
    const {E}=L.meshEdges(f);
    const unl=[...E].filter(([p,e])=>e.uses===1&&e.ids.every(x=>x===0));
    if(unl.length)tot.hits.push({file:path.relative('/home/user/sldprt-research-dump',file),face:fi,unl:unl.length,chains:L.chains(unl).map(c=>c.nodes.length+(c.closed?'c':'o')).join(',')});
    // control (b)
    const lab=[...E].filter(([p,e])=>e.uses===1&&e.ids.some(x=>x!==0));
    if(lab.length&&(k++%50===0)){tot.ctrlTried++;
      const target=lab[0][0];const g={...f,block1:Uint32Array.from(f.block1)};
      const {labels}=L.rebuild(f);const key=i=>L.vkey(f,i);
      // find the block1 word index of that segment: rebuild walks words in order, labels[] parallel to non-control words
      let w=0,li=0;const wordIdx=[];f.stripLengths.forEach((n,s)=>{w++;const cnt=2*n-3;for(let j=0;j<cnt;j++)wordIdx.push(w++);});
      labels.forEach((lb,i)=>{if(L.pk(key(lb[0]),key(lb[1]))===target)g.block1[wordIdx[i]]=0;});
      const r=L.meshEdges(g);if([...r.E].some(([p,e])=>e.uses===1&&e.ids.every(x=>x===0)&&p===target))tot.ctrlFlagged++;}
  });
}
console.log(JSON.stringify({...tot,hits:undefined},null,0));
console.log('hits',tot.hits.length);for(const h of tot.hits)console.log(JSON.stringify(h));
