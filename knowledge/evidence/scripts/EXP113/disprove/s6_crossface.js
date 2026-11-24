// For off-chord vertices: find the same coordinates in other display faces; report that face, its surface residual and its chord distance in ITS cycle.
const L=require('./lib.js');const name=process.argv[2],th=+process.argv[3]||3e-8;
const {d,N,j}=L.load(L.PARTS[name]||name);
const rs=require('fs').readFileSync('/tmp/claude-0/'+name+'_off.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.boundary&&r.chord>th);
const pos=new Map();
d.faces.forEach((f,fi)=>{const cyc=new Map();for(const cy of f.boundaryCycles||[]){const n=cy.vertices.length;cy.vertices.forEach((v,i)=>cyc.set(v,[cy.vertices[(i+n-1)%n],cy.vertices[(i+1)%n]]));}
  for(let k=0;k<f.vertexCount;k++){const key=L.vtx(f,k).join(',');if(!pos.has(key))pos.set(key,[]);pos.get(key).push({fi,k,nb:cyc.get(k)});}});
const seen=new Set();
for(const r of rs){const p=L.vtx(d.faces[r.fi],r.k),key=p.join(',');if(seen.has(key))continue;seen.add(key);
  const out=pos.get(key).filter(x=>x.fi!==r.fi).map(x=>{const f=d.faces[x.fi],m=j[x.fi];const res=m.face?L.DJ.residual(m.face.surface,p):null;
    let ch=null;if(x.nb)ch=L.segDist(p,L.vtx(f,x.nb[0]),L.vtx(f,x.nb[1])).d;
    return 'face'+(m.face?m.face.displayId:'?')+':'+(m.face?m.face.surface.type:'?')+' res='+(res===null?'n/a':res.toExponential(1))+' chord='+(ch===null?'noncycle':ch.toExponential(1))});
  console.log('face',r.face,'k',r.k,'res',r.res.toExponential(1),'| same coords in:',out.join(' ; ')||'none');}
