// The Block1 words and Block3 bytes behind the unlabelled chain of faces 75 and 448: every chain
// segment has at least one Block1 annotation, and what the annotations and their Block3 bytes are.
// Control: the same for the labelled boundary segments.
const L=require('./lib');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);
for(const fi of [75,448]){const f=L.readFace(dl,conv.faces[fi].offset),M=L.meshEdges(f),K=M.K;
  // Block1 word index of each annotation: control word per strip, then the edges in order
  let t=0;const wordOf=[];f.strips.forEach((n,s)=>{t++;const cnt=f.b2[s]-1;for(let k=0;k<cnt;k++)wordOf.push(t++);});
  const ann=new Map();f.edges.forEach((e,i)=>{const a=K[e.a],b=K[e.b];const pk=a<b?a+'|'+b:b+'|'+a;if(!ann.has(pk))ann.set(pk,[]);ann.get(pk).push({id:e.id,b3:f.b3[wordOf[i]]});});
  for(const [name,sel] of [['chain',e=>e.ids.every(x=>!x)],['labelled (control)',e=>e.ids.some(x=>x)]]){const segs=M.boundary.filter(sel);const hist={};let noAnn=0;
    for(const s of segs){const a=ann.get(s.pk)||[];if(!a.length)noAnn++;for(const x of a){const k='id '+(x.id?'nonzero':'0')+' b3 '+x.b3;hist[k]=(hist[k]||0)+1;}}
    console.log('face',fi,name,'segments',segs.length,'without any annotation',noAnn,'annotations',JSON.stringify(hist));}
  const ctl={};for(const s of f.strips.keys()){}const b3all={};f.b3.forEach(x=>b3all[x]=(b3all[x]||0)+1);console.log('  all Block3 bytes of the face',JSON.stringify(b3all),'control words',JSON.stringify([...new Set(f.strips.map((n,s)=>f.b1[f.b2.slice(0,s).reduce((a,b)=>a+b,0)]))]));}
