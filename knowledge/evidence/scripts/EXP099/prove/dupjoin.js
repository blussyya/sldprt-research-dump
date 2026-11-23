// Claim 2: display faces sharing a face id belong to different bodies / partition sections of the native B-rep.
// Per part: (a) group good display records by id, (b) group native faces by the id the section wrote (section_node_id),
// (c) check the native faces of one id sit in pairwise different (section, body), and counts match,
// (d) geometric join: a display face's bbox must contain the loop vertices of its native face.
const fs=require('fs'),L=require('./lib'),S=require('/home/user/solidworks-converters/src');
const f=process.argv[2];const b=L.dlBytes(f);
const disp=[];
for(const x of L.scan(b)){const m=L.meta(b,x);if(m.err||!m.res.every(v=>v===0)||!(m.tag>=4001&&m.tag<=4010))continue;
  const g=m.ge,mn=[60,68,76].map(k=>b.readDoubleLE(g+k)),mx=[36,44,52].map(k=>b.readDoubleLE(g+k));disp.push({off:x.off,id:m.id,tag:m.tag,mn,mx});}
const r=S.parasolid.partition.readBody(fs.readFileSync(f),{});const p=r.parsed;
const by=new Map(p.nodes.map(n=>[n.index,n]));const hid=new Set(p.hidden||[]);
const bodyOfFace=n=>{const s=by.get(n.values.shell)||by.get(n.values.front_shell);return s?s.values.body:0;};
const pt=vi=>{const v=by.get(vi);if(!v||!v.values.point)return null;const q=by.get(v.values.point);return q&&q.values.pvec;};
const nat=[];
for(const n of p.nodes.filter(n=>n.type===14)){
  const sid=n.values.section_node_id!==undefined?n.values.section_node_id:n.values.node_id,body=bodyOfFace(n);
  const vs=[];for(let l=n.values.loop,g=0;l&&g<1e5;l=by.get(l).values.next,g++){const first=by.get(l).values.fin;let x=first,k=0;
    do{const fin=by.get(x);const a=pt(fin.values.vertex);if(a)vs.push(a);x=fin.values.forward;}while(x!==first&&++k<1e6);}
  nat.push({sid,sec:n.values.merge_section||0,body,hidden:hid.has(body),vs});}
const sanity=['units'];
// group
const D=new Map(),N=new Map();for(const d of disp)(D.get(d.id)||D.set(d.id,[]).get(d.id)).push(d);
for(const n of nat)(N.get(n.sid)||N.set(n.sid,[]).get(n.sid)).push(n);
const T=1e-6;const inside=(d,n,scale)=>n.vs.length>0&&n.vs.every(v=>v.every((c,k)=>c>=d.mn[k]*scale-T&&c<=d.mx[k]*scale+T));
// unit scale: display bbox vs native bbox over all vertices
let res0,sc=1;{const dv=disp.flatMap(d=>d.mx),nv=nat.flatMap(n=>n.vs.flat());const a=Math.max(...dv.map(Math.abs)),c=Math.max(...nv.map(Math.abs));res0=c/a;}
const res={file:f.split('/').pop(),displayGood:disp.length,nativeFaces:nat.length,hiddenFaces:nat.filter(n=>n.hidden).length,sections:p.sections||1,bodies:new Set(nat.map(n=>n.sec+':'+n.body)).size,unitRatioMaxAbs_informationOnly:res0,scaleUsed:1};
// (a)(b)(c)
let groups=0,gOK=0,gCountMismatch=0,gSameBody=0,gSingleBody=0,facesInDup=0;const bad=[];
for(const [id,ds] of D){if(ds.length<2)continue;groups++;facesInDup+=ds.length;
  const ns=(N.get(id)||[]).filter(n=>!n.hidden),keys=new Set(ns.map(n=>n.sec+':'+n.body));
  const distinct=keys.size===ns.length&&ns.length>0,countOK=ns.length===ds.length;
  if(distinct)gOK++;if(!countOK)gCountMismatch++;if(!distinct){gSameBody++;if(bad.length<5)bad.push({id,disp:ds.length,nat:ns.length,keys:[...keys]});}
}
Object.assign(res,{dupGroups:groups,dupDisplayFaces:facesInDup,groupsWithNativeFacesInPairwiseDifferentBodies:gOK,groupsNativeCountNotEqualDisplayCount:gCountMismatch,groupsFailingDistinct:gSameBody,badSample:bad});
// uniqueness control: within one (section,body), is any native id repeated?  (must be 0 if ids are per-body unique)
{const seen=new Map();let rep=0;for(const n of nat){const k=n.sec+':'+n.body+':'+n.sid;if(seen.has(k))rep++;seen.set(k,1);}res.nativeIdRepeatsWithinOneBody=rep;}
// (d) geometric join
let jn=0,jok=0,ctrl=0,ctrlOk=0,ambiguous=0;
for(const [id,ds] of D){const ns=(N.get(id)||[]).filter(n=>!n.hidden);if(ds.length<2)continue;
  for(const d of ds){if(!ns.some(n=>n.vs.length))continue;jn++;if(ns.some(n=>inside(d,n,1/sc)))jok++;}
  // assignment test: is there a perfect matching display<->native by containment? greedy by fewest options
  }
res.geom={testableDisplayFacesInDupGroups_nativeFaceHasLoopVertices:jn,withAContainedNativeFaceOfSameId:jok,tolMetres:T};
// control: pair each dup display face with a native face of a DIFFERENT id
const allN=nat.filter(n=>!n.hidden&&n.vs.length);let seed=12345;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
for(const [id,ds] of D){if(ds.length<2)continue;for(const d of ds){for(let t=0;t<5;t++){const n=allN[Math.floor(rnd()*allN.length)];if(n.sid===id)continue;ctrl++;if(inside(d,n,1/sc))ctrlOk++;}}}
res.geomControlWrongId={pairs:ctrl,contained:ctrlOk};
console.log(JSON.stringify(res,null,1));
