// is mesh boundary (edges in exactly one triangle) a subset of cut (nonzero id) segments? exact weld vs tolerance weld
const {S,files}=require('./lib');
function run(f,tol){
  const ids=new Map();const q=x=>tol?Math.round(x/tol):x;
  const w=i=>{const k=[0,1,2].map(j=>q(f.vertices[3*i+j])).join(',');if(!ids.has(k))ids.set(k,ids.size);return ids.get(k);};
  const pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;const cut=new Set(),cutAny=new Map();
  for(const e of f.edgeAnnotations){const a=w(e.vertices[0]),b=w(e.vertices[1]);if(a===b)continue;if(e.id)cut.add(pk(a,b));}
  const cnt=new Map();
  for(let t=0;t<f.triangleIndices.length;t+=3){const v=[0,1,2].map(j=>w(f.triangleIndices[t+j]));if(v[0]===v[1]||v[1]===v[2]||v[0]===v[2])continue;
    for(let j=0;j<3;j++){const k=pk(v[j],v[(j+1)%3]);cnt.set(k,(cnt.get(k)||0)+1);}}
  let openNotCut=0,cutNotOpen=0,cutTwo=0,over2=0;
  for(const [k,c] of cnt){if(c>2)over2++;if(c===1&&!cut.has(k))openNotCut++;if(c>=2&&cut.has(k))cutTwo++;}
  return {openNotCut,cutTwo,over2,badFace:openNotCut>0};
}
const out={};
for(const p of files()){const d=S.parse(p);const tag=/chainwheel/.test(p)?'chainwheel':/f666f342/.test(p)?'f666f342':(d.format.startsWith('legacy')?'otherLegacy':'modern');
  for(const f of d.faces){if(f.noEdgeTable)continue;
    for(const tol of [0,1e-7,1e-6,1e-5]){const r=run(f,tol);const o=out[tag+' tol='+tol]||(out[tag+' tol='+tol]={faces:0,facesWithOpenNotCut:0,openNotCut:0,faceOver2:0});
      o.faces++;if(r.badFace)o.facesWithOpenNotCut++;o.openNotCut+=r.openNotCut;if(r.over2)o.faceOver2++;}}}
console.log(out);
