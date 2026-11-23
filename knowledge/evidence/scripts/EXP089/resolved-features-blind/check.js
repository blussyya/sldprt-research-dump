'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../../..');
const P=require(path.join(root,'package/src/parasolid/partition'));
const X=require(path.join(root,'package/src/parasolid/xt'));
const N=require(path.join(root,'../solidworks-converters/src/brep/native'));
const S=require(path.join(root,'../solidworks-converters/src'));
const {load}=require(path.join(root,'knowledge/evidence/scripts/EXP079/load'));
const guid=Buffer.from('231dd571da8148a2a85898b21b89ef99','hex');

function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(/\.sldprt$/i.test(e.name))out.push(p);
}return out;}
function sectionRows(stream){
  const b=Buffer.from(stream),out=[];
  for(let p=b.indexOf(guid);p>=0;p=b.indexOf(guid,p+1)){
    if(p<4)continue;const start=p-4,size=b.readUInt32LE(start),end=start+4+size;
    if(end>b.length||size<32)continue;
    const q=P.sections(b.subarray(start,end),0);if(q.error||q.out.length!==1)continue;
    const parsed=X.parse(q.out[0].body,true);if(parsed.error)continue;
    let model;try{model=N.build(parsed);}catch(_){model=null;}
    out.push({start,size,end,kind:q.out[0].kind,inflated:q.out[0].body.length,parsed,model,
      outer:{size:start>=5?b.readUInt32LE(start-5):null,flag:start>=1?b[start-1]:null,
        tail:end+4<=b.length?b.subarray(end,end+4).toString('hex'):null}});
  }
  return out;
}
function one(file){
  const raw=fs.readFileSync(file),streams=P.streams(raw);let tree=null,treeError=null;
  try{tree=load(file);}catch(e){treeError=e.message;}
  const rows=[];
  for(const [name,data] of Object.entries(streams).filter(([k])=>/Config-\d+-ResolvedFeatures$/.test(k))){
    for(const sec of sectionRows(data)){
      const sketches=tree?[...tree.r.objects.values()].filter(o=>o?.class==='sgSketch'&&o.at<=sec.start&&o.end>=sec.end):[];
      const mapped=sketches.map(sk=>{const top=tree.tops.find(t=>t?.sketch===sk||t&&t.at<=sk.at&&t.end>=sk.end);
        return {index:sk.index,at:sk.at,end:sk.end,onPlane:sk.onPlane,f:sk.f,guid:sk.guid,rawSize:sk.rawSize,
          compressed:sk.parasolid?.length??null,g0:sk.g0,feature:top?{id:top.id,name:top.name,class:top.class}:null};});
      const faces=sec.model?.faces||[],edges=sec.model?[...sec.model.edges.values()]:[],vertices=sec.model?[...sec.model.vertices.values()]:[];
      rows.push({stream:name,start:sec.start,size:sec.size,end:sec.end,kind:sec.kind,inflated:sec.inflated,
        outer:sec.outer,mapped,faces:faces.map(f=>({id:f.id,surface:f.surface.type,loops:f.loops.length})),
        edges:edges.length,vertices:vertices.map(v=>v.p)});
    }
  }
  return {file:path.relative(root,file),sha256:crypto.createHash('sha256').update(raw).digest('hex'),
    treeEnd:tree?.end??false,treeError:tree?.err?.message||treeError,sections:rows};
}

const files=[];for(const d of ['test files new','test files original','test files online'])walk(path.join(root,d),files);
const rows=files.sort().map(f=>{try{return one(f);}catch(e){return {file:path.relative(root,f),error:e.message};}});
const sections=rows.flatMap(r=>(r.sections||[]).map(s=>({...s,file:r.file,treeEnd:r.treeEnd})));

// C04 is a geometry control: its embedded sheet is the support face before the circular cut, not
// the circular sketch region.
const c04file=path.join(root,'test files original/controlled/C04_cube_hole_5mm/model.SLDPRT');
let c04=null;try{
  const row=rows.find(r=>r.file===path.relative(root,c04file)),sec=row.sections[0],tree=load(c04file),sk=tree.tops.find(t=>t?.name==='Sketch2')?.sketch;
  const main=N.build(S.readBrep(c04file).parsed),sheetVerts=sec.vertices.map(p=>p.join(',')),top=main.faces.find(f=>f.surface.type==='plane'&&Math.abs(f.surface.p[2]-.01)<1e-12&&Math.abs(Math.abs(f.surface.n[2])-1)<1e-12);
  const centre=sk.points.find(p=>p.centreOf===1),rim=sk.points.find(p=>p.centreOf===0),radius=Math.hypot(rim.x-centre.x,rim.y-centre.y);
  c04={sectionFeature:sec.mapped[0]?.feature,sectionPlane:sec.faces[0]?.surface,sectionLoops:sec.faces[0]?.loops,
    sectionEdges:sec.edges,sectionVertices:sec.vertices,finishedTopLoops:top?.loops.length,
    finishedTopEdgeCount:top?.loops.reduce((n,l)=>n+l.coedges.length,0),sketchArcCount:sk.arcs.items.length,
    sketchCircle:{centre:[centre.x,centre.y],radius},supportOuterSquare:sheetVerts.length===4&&sheetVerts.every(p=>/0(?:\.01)?/.test(p))};
}catch(e){c04={error:e.message};}

const result={summary:{files:files.length,filesWithSections:new Set(sections.map(s=>s.file)).size,sections:sections.length,
  mapped:sections.filter(s=>s.mapped.length===1).length,unmapped:sections.filter(s=>!s.mapped.length).length,
  multiplyMapped:sections.filter(s=>s.mapped.length>1).length,onPlane0:sections.filter(s=>s.mapped[0]?.onPlane===0).length,
  onePlaneFace:sections.filter(s=>s.faces.length===1&&s.faces[0].surface==='plane').length,
  outerSizeMatch:sections.filter(s=>s.outer.size===s.size+5).length,outerFlagZero:sections.filter(s=>s.outer.flag===0).length,
  outerTailZero:sections.filter(s=>s.outer.tail==='00000000').length,
  sketchSizeMatch:sections.filter(s=>{const m=s.mapped[0];return m&&m.f?.[0]===s.size+5&&m.f?.[1]===0&&m.f?.[2]===s.size&&m.rawSize===s.inflated;}).length},
  c04,sections:sections.map(s=>({...s,vertices:s.vertices.length}))};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({summary:result.summary,c04,unmapped:result.sections.filter(s=>!s.mapped.length),multiplyMapped:result.sections.filter(s=>s.mapped.length>1)},null,2));
