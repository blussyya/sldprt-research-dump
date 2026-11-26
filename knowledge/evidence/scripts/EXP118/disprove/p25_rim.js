// The rim of the hole: every mesh-boundary segment of every display face near the bore end whose
// midpoint has no other display face within TOL. Grouped by face and Block1 id.
// Control: away from the hole (another bore of the same size, picked by the caller) the same test
// should find no open segments.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const nfid=+(process.argv[2]||2516),arcId=+(process.argv[3]||1166),RAD=+(process.argv[4]||3e-3),TOL=1e-6;
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const ctr=M.edges.get(arcId).curve.c;
const V=(f,i)=>[f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]];
function ptTri(p,a,b,c){const ab=G.sub(b,a),ac=G.sub(c,a),ap=G.sub(p,a),d1=G.dot(ab,ap),d2=G.dot(ac,ap);if(d1<=0&&d2<=0)return G.dist(p,a);const bp=G.sub(p,b),d3=G.dot(ab,bp),d4=G.dot(ac,bp);if(d3>=0&&d4<=d3)return G.dist(p,b);const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return G.dist(p,G.add(a,G.mul(ab,v)));}const cp=G.sub(p,c),d5=G.dot(ab,cp),d6=G.dot(ac,cp);if(d6>=0&&d5<=d6)return G.dist(p,c);const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return G.dist(p,G.add(a,G.mul(ac,w)));}const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return G.dist(p,G.add(b,G.mul(G.sub(c,b),w)));}const den=1/(va+vb+vc),v=vb*den,w=vc*den;return G.dist(p,G.add(a,G.add(G.mul(ab,v),G.mul(ac,w))));}
const tris=[];d.faces.forEach((f,fi)=>{for(let t=0;t<f.triangleIndices.length;t+=3){const tr=[0,1,2].map(j=>V(f,f.triangleIndices[t+j]));if(tr.some(p=>G.dist(p,ctr)<RAD+1e-3))tris.push({fi,tr});}});
const open={};let checked=0;
d.faces.forEach((f,fi)=>{if(f.noEdgeTable)return;const {E}=L.meshEdges(f);for(const [p,e] of E){if(e.uses!==1)continue;const [a,b]=p.split('|').map(L.P),m=G.mul(G.add(a,b),0.5);if(G.dist(m,ctr)>RAD)continue;checked++;
  let best=Infinity;for(const t of tris){if(t.fi===fi)continue;const dd=ptTri(m,...t.tr);if(dd<best)best=dd;if(best<=TOL)break;}
  if(best>TOL){const k=fi+':'+(e.ids.find(x=>x)||0);open[k]=(open[k]||0)+1;}}});
console.log('bore',nfid,'boundary segments within',RAD*1000,'mm of the end-circle centre',checked,'open (no other face within 1e-6 m) by face:id',JSON.stringify(open));
