// For strict-off (dist>1e-9+f32 slack) boundary vertices that are NOT on a chord: how far from the nearest adjacent chord, and what sits there.
const L=require('./lib');const f0=process.argv[2];
const {d,M,j}=L.load(f0);const h=[];let n=0,interior=0,unshared=0;
const key=(f,i)=>f.vertices[3*i]+','+f.vertices[3*i+1]+','+f.vertices[3*i+2];
d.faces.forEach((f,fi)=>{const jj=j[fi];if(!jj.face||!['cylinder','cone'].includes(jj.face.surface.type))return;
  const s=jj.face.surface,pos=i=>[f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]];
  const nbr=new Map();for(const c of f.boundaryCycles||[]){const v=c.vertices,m=v.length;v.forEach((x,k)=>{nbr.set(key(f,x),[...(nbr.get(key(f,x))||[]),[v[(k+m-1)%m],v[(k+1)%m]]]);});}
  for(let i=0;i<f.vertexCount;i++){const q=pos(i),dist=L.distFace(s,q);if(dist<=1e-9+L.slack32(q))continue;n++;
    const nb=nbr.get(key(f,i));if(!nb){interior++;continue;}
    let best=1e9;for(const [a,b] of nb)best=Math.min(best,L.distSegment(q,pos(a),pos(b)));
    if(best>1e-9)h.push({dist,chordDist:best});}});
h.sort((a,b)=>a.chordDist-b.chordDist);
console.log(JSON.stringify({file:f0,strictOff:n,interior,boundaryNotOnAdjacentChord:h.length,chordDistPercentiles:[0,.25,.5,.75,1].map(p=>h.length?h[Math.min(h.length-1,Math.floor(p*h.length))].chordDist:null),
 ratio_chordDist_over_surfDist_median:h.length?h.map(x=>x.chordDist/x.dist).sort((a,b)=>a-b)[h.length>>1]:null}));
