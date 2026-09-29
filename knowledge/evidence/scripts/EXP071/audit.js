'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {parse,Reader}=require('./typed-reader');
const ROOT=path.resolve(__dirname,'../../../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function topology(r){
  const m=new Map(r.nodes.map(n=>[n.index,n])),errors=[],rings=[];let checks=0;
  const test=(ok,msg)=>{checks++;if(!ok)errors.push(msg);};
  const target=(n,key,types,required=false)=>{const p=n.values[key];if(!p){test(!required,`${n.index}.${key}: missing`);return null;}const v=m.get(p);test(!!v&&types.includes(v.type),`${n.index}.${key} -> ${p}: type`);return v;};
  for(const n of r.nodes){const v=n.values;
    if(n.type===14){target(n,'surface',[50,51,52,53,54,56,59,67,124],true);target(n,'shell',[13],true);target(n,'front_shell',[13],true);
      let i=v.loop,seen=new Set();while(i){if(seen.has(i)){errors.push(`face ${n.index}: loop chain cycle`);break;}seen.add(i);const l=m.get(i);test(l?.type===15&&l.values.face===n.index,`face ${n.index}: loop ownership ${i}`);if(!l)break;i=l.values.next;}}
    if(n.type===15){target(n,'face',[14],true);const first=v.fin;let i=first,seen=new Set();do{const f=m.get(i);test(f?.type===17&&f.values.loop===n.index,`loop ${n.index}: fin ${i}`);if(!f||seen.has(i))break;seen.add(i);i=f.values.forward;}while(i!==first&&seen.size<=r.nodes.length);test(i===first&&seen.size>0,`loop ${n.index}: open fin ring`);rings.push({loop:n.index,fins:[...seen]});}
    if(n.type===17){target(n,'edge',[16]);target(n,'vertex',[18]);if(v.loop){const f=target(n,'forward',[17],true),b=target(n,'backward',[17],true);test(f?.values.backward===n.index,`fin ${n.index}: forward/backward`);test(b?.values.forward===n.index,`fin ${n.index}: backward/forward`);}
      if(v.edge){const o=target(n,'other',[17],true);test(o?.values.edge===v.edge,`fin ${n.index}: other edge`);}}
    if(n.type===16){const f=target(n,'fin',[17],true);test(f?.values.edge===n.index,`edge ${n.index}: fin owner`);if(f){const other=m.get(f.values.other);test(other?.values.other===f.index,`edge ${n.index}: two-fin ring`);test(other?.values.sense!==f.values.sense,`edge ${n.index}: opposite senses`);}}
    if(n.type===18)target(n,'point',[29],true);
    if(n.type===136||n.type===126){const surf=n.type===126,cv=target(n,'bspline_vertices',[45],true),expected=(surf?v.n_u_vertices*v.n_v_vertices:v.n_vertices)*v.vertex_dim;test(cv?.length===expected,`NURBS ${n.index}: control size`);
      for(const axis of surf?['u_','v_']:['']){const mult=target(n,axis+'knot_mult',[127],true),knots=target(n,axis+'knots',[128],true);const nk=v[surf?'n_'+axis+'knots':'n_knots'];test(mult?.length===nk&&knots?.length===nk,`NURBS ${n.index}: knot sizes`);if(knots)test(knots.values.knots.every((x,i,a)=>i===0||x>a[i-1]),`NURBS ${n.index}: knot order`);}}
  }
  return {checks,errors,rings};
}
function cubeGeometry(r){
  const m=new Map(r.nodes.map(n=>[n.index,n])),faces=r.nodes.filter(n=>n.type===14),verts=r.nodes.filter(n=>n.type===18),edges=r.nodes.filter(n=>n.type===16);
  const points=verts.map(n=>m.get(n.values.point).values.pvec),bounds=[0,1,2].map(a=>[Math.min(...points.map(p=>p[a])),Math.max(...points.map(p=>p[a]))]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  let volume=0,maxPlaneResidual=0,minOrientation=Infinity;const loops=[];
  for(const face of faces){const plane=m.get(face.values.surface),loop=m.get(face.values.loop);assert.equal(plane.type,50);assert.equal(loop.values.next,0);let at=loop.values.fin;const start=at,vs=[];do{const fin=m.get(at);vs.push(m.get(m.get(fin.values.vertex).values.point).values.pvec);at=fin.values.forward;assert(vs.length<100);}while(at!==start);
    assert.equal(vs.length,4);loops.push({face:face.index,loop:loop.index,vertices:vs});const normal=plane.values.normal.map(x=>x*(face.values.sense===plane.values.sense?1:-1));let area=[0,0,0];
    for(let i=0;i<vs.length;i++){const c=cross(vs[i],vs[(i+1)%vs.length]);area=area.map((x,j)=>x+c[j]);maxPlaneResidual=Math.max(maxPlaneResidual,Math.abs(dot(vs[i].map((x,j)=>x-plane.values.pvec[j]),normal)));}
    minOrientation=Math.min(minOrientation,dot(area,normal));for(let i=1;i+1<vs.length;i++)volume+=dot(vs[0],cross(vs[i],vs[i+1]))/6;
  }
  assert.equal(faces.length,6);assert.equal(edges.length,12);assert.equal(verts.length,8);assert.equal(verts.length-edges.length+faces.length,2);assert(maxPlaneResidual<1e-12);assert(minOrientation>0);assert(Math.abs(volume-1e-6)<1e-15);assert.deepEqual(bounds,[[0,.01],[0,.01],[0,.01]]);
  return {faces:faces.length,edges:edges.length,vertices:verts.length,euler:2,volumeM3:volume,bounds,maxPlaneResidual,minOrientation,loops};
}
function compare(t,b){const tm=new Map(t.nodes.map(n=>[n.index,n])),differences=[];let maxFloatError=0;
  function eq(x,y,kind){if(['f','v','i','h','b'].includes(kind)){if(x===null&&Array.isArray(y)&&y.every(v=>v===null))return true;if(Array.isArray(x)&&Array.isArray(y))return x.length===y.length&&x.every((v,i)=>eq(v,y[i],kind));if(x===null||y===null)return x===y;maxFloatError=Math.max(maxFloatError,Math.abs(x-y));return Math.abs(x-y)<=3e-14*Math.max(1,Math.abs(x),Math.abs(y));}return JSON.stringify(x)===JSON.stringify(y);}
  for(const n of b.nodes){const a=tm.get(n.index);if(!a||a.type!==n.type){differences.push({index:n.index,kind:'node_type',text:a?.type,binary:n.type});continue;}for(const f of b.edits.find(e=>e.type===n.type).fields){if(!eq(a.values[f.name],n.values[f.name],f.kind))differences.push({index:n.index,type:n.name,field:f.name,text:a.values[f.name],binary:n.values[f.name]});}}
  return {differences,maxFloatError};
}
function coverage(r){const spans=r.spans;for(let i=1;i<spans.length;i++)assert.equal(spans[i-1].end,spans[i].start,'coverage gap/overlap');assert.equal(spans.at(-1).end,r.total);return {bannerBytes:spans[0].start,typedBytes:r.total-spans[0].start,totalBytes:r.total,ranges:spans.length};}
function run(){
  const rows=[],maps={};let cube;
  const log=fs.readFileSync(path.join(ROOT,'test files new/SW2022/BUILD_LOG.md'),'utf8'),counts=new Map();for(const section of log.split(/^## /m).slice(1)){const n=/Total face count:\s*`(\d+)`/.exec(section);if(n)counts.set(section.split('\n')[0].trim().toLowerCase(),Number(n[1]));}
  for(const era of ['SW2011','SW2022'])for(const model of fs.readdirSync(path.join(ROOT,'test files new',era)).sort()){
    const d=path.join(ROOT,'test files new',era,model);if(!fs.existsSync(path.join(d,'model.x_t')))continue;const tb=fs.readFileSync(path.join(d,'model.x_t')),bb=fs.readFileSync(path.join(d,'model.x_b')),t=parse(tb,false),b=parse(bb,true);assert.equal(t.error,null,`${era}/${model} text`);assert.equal(b.error,null,`${era}/${model} binary`);
    const tt=topology(t),bt=topology(b);assert.deepEqual(tt.errors,[],`${era}/${model} text topology`);assert.deepEqual(bt.errors,[],`${era}/${model} binary topology`);
    const summaries=[t,b].map(r=>{const ids=r.nodes.map(n=>n.values.node_id).filter(v=>v>0),max=Math.max(...ids),ceiling=r.nodes[0].values.highest_node_id;assert(max<=ceiling,`${era}/${model}: ID above ceiling`);assert.equal(new Set(ids).size,ids.length,'duplicate positive node ID');const faces=r.nodes.filter(n=>n.type===14).length;assert.equal(faces,counts.get(`${era}/${model}`.toLowerCase()));return {nodes:r.nodes.length,faces,maxNodeId:max,highestNodeId:ceiling,ceilingGap:ceiling-max,positiveNodeIds:ids.length,unresolved:r.unresolved};});
    const comparison=compare(t,b);rows.push({era,model,sha256:{xt:hash(tb),xb:hash(bb)},text:summaries[0],binary:summaries[1],topologyChecks:tt.checks+bt.checks,coverage:coverage(b),comparison});
    if(model==='C00_cube_10mm'){cubeGeometry(t);const geom=cubeGeometry(b);maps[era]={file:`test files new/${era}/${model}/model.x_b`,sha256:hash(bb),coordinateSystem:'absolute X_B file byte offsets; intervals [start,end)',header:b.header,coverage:coverage(b),geometry:geom,edits:b.edits,nodes:b.nodes,spans:b.spans.map(s=>({...s,hex:bb.subarray(s.start,s.end).toString('hex')}))};if(era==='SW2022')cube={tb,bb,t,b};}
  }
  assert.equal(rows.length,49);
  const bad=Buffer.from(cube.bb),span=cube.b.spans.find(s=>s.label==='FIN.forward');bad.writeUInt16BE(2,span.start);const mutated=parse(bad,true);assert.equal(mutated.error,null);assert(topology(mutated).errors.length>0,'pointer mutation undetected');
  assert(parse(cube.bb.subarray(0,-1),true).error,'truncated terminator accepted');assert(parse(Buffer.concat([cube.bb,Buffer.from([0])]),true).error,'trailing byte accepted');
  const badNumber=Buffer.from(cube.tb.toString('latin1').replace('1e3','1.2.3'));assert(parse(badNumber,false).error,'invalid numeric token accepted');
  const limit=parse(cube.bb,true,{maxNodes:10});assert.equal(limit.nodes.length,10);assert(limit.error);
  // Test the documented large-index branch separately; these synthetic values
  // are not additional corpus observations.
  for(const n of [0,1,32766,32767,65530,65534,65535,1000000]){const raw=Buffer.alloc(n<32767?2:4);if(n<32767)raw.writeInt16BE(n+1);else{raw.writeInt16BE(-(n%32767+1));raw.writeInt16BE(Math.floor(n/32767),2);}assert.equal(new Reader(raw,true).ptr(),n);}
  const result={experiment:'EXP-071',date:'2026-09-28',scope:'Controlled export corpus only; typed records and graph checks, not native partition reconstruction',summary:{pairs:rows.length,exports:rows.length*2,totalTextNodes:rows.reduce((s,r)=>s+r.text.nodes,0),totalBinaryNodes:rows.reduce((s,r)=>s+r.binary.nodes,0),topologyChecks:rows.reduce((s,r)=>s+r.topologyChecks,0),ceilingMatches:rows.flatMap(r=>[r.text,r.binary]).filter(x=>x.ceilingGap===0).length,ceilingGaps:rows.filter(r=>r.text.ceilingGap||r.binary.ceilingGap).map(r=>({era:r.era,model:r.model,text:r.text.ceilingGap,binary:r.binary.ceilingGap})),controls:['wrong fin forward target','truncated terminator','trailing byte','invalid numeric token','maxNodes=10','synthetic large pointer boundaries']},rows};
  if(process.argv.includes('--write')){fs.writeFileSync(path.join(__dirname,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');for(const era in maps)fs.writeFileSync(path.join(__dirname,`C00_${era}_XB_MAP.json.gz`),require('zlib').gzipSync(JSON.stringify(maps[era])));}
  console.log(JSON.stringify(result.summary,null,2));return result;
}
if(require.main===module)run();module.exports={run,topology,cubeGeometry,compare,coverage};
