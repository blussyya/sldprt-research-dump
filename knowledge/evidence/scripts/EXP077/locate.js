#!/usr/bin/env node
'use strict';
/* EXP-077 — where the remaining geometry is stored.
 *
 *  A. The three pre-2011 parts: which streams hold the body and the mesh, how they are compressed
 *     (PKWARE DCL implode), and whether the bodies parse completely.
 *  B. INTERSECTION curves: do the CHART points lie on both defining surfaces?
 *  C. Tolerant edges (EDGE.curve null): do the per-fin SP_CURVEs land on their stored trim points,
 *     and do the two fin curves stay within the edge tolerance?
 *
 *   node knowledge/evidence/scripts/EXP077/locate.js [--write]
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),Module=require('module');
const ROOT=path.resolve(__dirname,'../../../..'),ORIG=path.join(ROOT,'test files original'),L=path.join(__dirname,'lib');
const OLE=require(L+'/container/ole'),{blast}=require(L+'/container/blast'),{readBody,streams}=require(L+'/parasolid/partition');
const {topology}=require(L+'/parasolid/topology'),display=require(L+'/display'),native=require(L+'/brep/native');
const W=require(L+'/step/write'),stepRead=require(L+'/step/read'),{compare}=require(L+'/brep/compare'),{volume,parametrise}=require(L+'/brep/volume');
const G=require(L+'/geom/eval'),zlib=require('zlib');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const iR=b=>zlib.inflateRawSync(b),iZ=b=>zlib.inflateSync(b);
const out={experiment:'EXP-077',date:new Date().toISOString()};

/* The native model with unsupported curve/surface types stubbed, so the supported surfaces of a
 * part can be reached even when the part as a whole can't be converted. Research use only. */
function probeBuild(parsed){
  const file=L+'/brep/native.js';
  const src=fs.readFileSync(file,'utf8')
    .replace("throw Error('B-rep: unsupported curve '+c.name+' (node '+i+')');","return {type:'line',p:[0,0,0],d:[1,0,0]};")
    .replace("throw Error('B-rep: unsupported surface '+s.name+' (node '+i+')');","return {type:'unsupported',name:s.name};")
    .replace("if(!cn)throw Error('B-rep: edge '+e.values.node_id+' has no curve');","if(!cn)continue;");
  const m=new Module(file+'#probe');m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));m._compile(src,file);
  return m.exports.build(parsed);
}
const surfaceParams=s=>s.type==='plane'?{eval:(u,v)=>({S:G.add(s.p,G.add(G.mul(s.x,u),G.mul(G.cross(s.n,s.x),v)))})}:parametrise(s);

/* ---------- A. pre-2011 ---------- */
out.pre2011={};
for(const name of ['SW2000-s01.SLDPRT','chainwheel.sldprt','plate4.sldprt']){
  const raw=fs.readFileSync(path.join(ORIG,name)),o=OLE.read(raw),row={sha256:hash(raw),streams:{}};
  for(const e of o.entries)if(e.type===2)row.streams[e.name]=e.size;
  const all=streams(raw);
  for(const [k,b] of Object.entries(all)){
    const off=/^Config-\d+-Body$/.test(k)?4:k==='DisplayLists__Zip'?0:-1;if(off<0)continue;
    const z=blast(b.subarray(off));row[k]={prefixLengthMatches:off?b.readUInt32LE(0)===b.length-4:null,header:b.subarray(off,off+2).toString('hex'),in:b.length-off,consumed:z.consumed,out:z.data.length,startsWith:JSON.stringify(z.data.subarray(0,8).toString('latin1'))};
  }
  const strings=k=>all[k]?[...new Set(all[k].toString('latin1').match(/[A-Za-z][A-Za-z0-9_ ]{3,}/g))]:[];
  row.featureTreeClasses=strings('Config-0').filter(s=>/_c$|^sg/.test(s));
  try{
    const b=readBody(raw),p=b.parsed,g=topology(p);
    row.body={source:b.source,kind:b.kind,schema:p.header.schema,description:p.header.description,littleEndian:!!p.header.littleEndian,
      error:p.error,terminated:p.terminated,consumed:p.consumed,total:p.total,nodes:p.nodes.length,faces:p.nodes.filter(n=>n.type===14).length,
      graphChecks:g.checks,graphErrors:g.errors.length,unresolved:p.unresolved.length,
      schemaLayouts:p.edits.filter(e=>[12,17,70,80,102].includes(e.type)).map(e=>({type:e.type,name:e.name,fields:e.fields.map(f=>f.name)}))};
    try{const N=native.build(p),s=W.write(N,{name});row.exactStep={roundTrip:compare(N,stepRead.readBrep(s.text)).pass,surfaces:s.report.surfaces,volumeMm3:volume(N).volume*1e9};}
    catch(e){row.exactStep={blockedBy:e.message};}
  }catch(e){row.body={error:e.message};}
  const d=display.parseSLDPRT(raw,iR,iZ);
  row.display={errors:d.errors,faces:d.faces.length,triangles:d.stats.triangles,rejected:d.rejected.length,withBounds:d.faces.filter(f=>f.bounds).length,
    noEdgeTable:d.faces.filter(f=>f.noEdgeTable).length,extraArrays:d.faces.filter(f=>f.extraArrays).length,
    stripControls:d.faces.flatMap(f=>f.stripControls.map((c,i)=>c+':'+f.stripLengths[i])).reduce((a,k)=>(a[k]=(a[k]||0)+1,a),{})};
  out.pre2011[name]=row;console.log(name,JSON.stringify(row.body&&{source:row.body.source,schema:row.body.schema,nodes:row.body.nodes,faces:row.body.faces,graphErrors:row.body.graphErrors,error:row.body.error}),'display',row.display.faces);
}
{ // plate4 mesh against its body; chainwheel mesh vertices against the B-rep surfaces
  const p4=path.join(ORIG,'plate4.sldprt'),d=display.parseSLDPRT(fs.readFileSync(p4),iR,iZ);let V=0;
  for(const f of d.faces){const v=f.vertices,t=f.triangleIndices;for(let i=0;i<t.length;i+=3){const a=[0,1,2].map(k=>v[3*t[i]+k]),b=[0,1,2].map(k=>v[3*t[i+1]+k]),c=[0,1,2].map(k=>v[3*t[i+2]+k]);V+=G.dot(a,G.cross(b,c))/6;}}
  out.pre2011['plate4.sldprt'].display.meshVolumeMm3=V*1e9;
  const cw=fs.readFileSync(path.join(ORIG,'chainwheel.sldprt')),N=probeBuild(readBody(cw).parsed),dc=display.parseSLDPRT(cw,iR,iZ);
  let tot=0,off=0,offBoundary=0,worst=0;
  for(const f of dc.faces){const bd=new Set();for(const e of f.edgeAnnotations)if(e.id)e.vertices.forEach(x=>bd.add(x));
    for(let i=0;i<f.vertexCount;i++){const q=[0,1,2].map(k=>f.vertices[3*i+k]);let best=Infinity;for(const F of N.faces)best=Math.min(best,Math.abs(G.surfaceDistance(F.surface,q).d));
      tot++;worst=Math.max(worst,best);if(best>1e-6){off++;if(bd.has(i))offBoundary++;}}}
  out.pre2011['chainwheel.sldprt'].display.onSurface={vertices:tot,offOver1um:off,offOnBoundaryEdges:offBoundary,worstM:worst};
}

/* ---------- B and C over the real parts ---------- */
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==='controlled'?[]:walk(path.join(d,e.name))):/\.sldprt$/i.test(e.name)?[path.join(d,e.name)]:[]);
out.intersections={};out.tolerantEdges={};
for(const f of walk(ORIG)){
  const name=path.relative(ORIG,f);let p;try{p=readBody(fs.readFileSync(f)).parsed;}catch(_){continue;}
  const by=new Map(p.nodes.map(n=>[n.index,n]));let N;try{N=probeBuild(p);}catch(e){out.intersections[name]={skipped:e.message};continue;}
  const surf=new Map();p.nodes.filter(n=>n.type===14).forEach(fc=>surf.set(fc.values.surface,N.faces.find(F=>F.id===fc.values.node_id).surface));
  const X=p.nodes.filter(n=>n.name==='INTERSECTION');
  if(X.length){let worst=0,pts=0,skipped=0,cmin=Infinity,cmax=0,emax=0;
    for(const x of X){const ch=by.get(x.values.chart).values,ss=x.values.surface.map(s=>surf.get(s));cmin=Math.min(cmin,ch.chart_count);cmax=Math.max(cmax,ch.chart_count);emax=Math.max(emax,ch.chordal_error);
      if(ss.some(s=>!s||s.type==='unsupported')){skipped++;continue;}
      if(ch.hvec.length!==ch.chart_count)throw Error(name+': chart_count');
      for(const h of ch.hvec){for(const s of ss)worst=Math.max(worst,Math.abs(G.surfaceDistance(s,h).d));pts++;}}
    out.intersections[name]={curves:X.length,skippedUnsupportedSurface:skipped,points:pts,pointsPerChart:[cmin,cmax],maxChordalErrorM:emax,worstDistanceToEitherSurfaceM:worst};}
  const T=p.nodes.filter(n=>n.type===16&&!n.values.curve);
  if(T.length){let finCurves=0,worstEnd=0,worstGap=0,within=0;const tol=new Set(),chain=new Set();
    for(const e of T){tol.add(e.values.tolerance);const polys=[];
      for(const fin of [by.get(e.values.fin),by.get(by.get(e.values.fin).values.other)]){
        const tc=by.get(fin.values.curve),sp=by.get(tc.values.basis_curve),bcn=by.get(sp.values.b_curve),bc=by.get(bcn.values.nurbs).values;
        chain.add([tc.name,sp.name,bcn.name,by.get(bcn.values.nurbs).name,'dim'+bc.vertex_dim].join('>'));
        const flat=by.get(bc.bspline_vertices).values.vertices,dim=bc.vertex_dim,mult=by.get(bc.knot_mult).values.mult,kn=by.get(bc.knots).values.knots;
        const ctrl=[],w=bc.rational?[]:null;for(let i=0;i<bc.n_vertices;i++){const q=flat.slice(i*dim,i*dim+dim);const wi=bc.rational?q[dim-1]:1;if(w)w.push(wi);ctrl.push([q[0]/wi,q[1]/wi,0]);}
        const knots=[];mult.forEach((k,i)=>{for(let j=0;j<k;j++)knots.push(kn[i]);});
        const c={type:'bspline',degree:bc.degree,ctrl,weights:w,knots},P=surfaceParams(surf.get(sp.values.surface));
        for(const [t,pt] of [[tc.values.parm_1,tc.values.point_1],[tc.values.parm_2,tc.values.point_2]]){const uv=G.bsplineCurve(c,t).p;worstEnd=Math.max(worstEnd,G.dist(P.eval(uv[0],uv[1]).S,pt));}
        const pts=[];for(let k=0;k<=2000;k++){const t=tc.values.parm_1+(tc.values.parm_2-tc.values.parm_1)*k/2000,uv=G.bsplineCurve(c,t).p;pts.push(P.eval(uv[0],uv[1]).S);}
        polys.push(pts);finCurves++;}
      let gap=0;for(let k=0;k<=2000;k+=25){const q=polys[0][k];let best=Infinity;for(let j=1;j<polys[1].length;j++){const a=polys[1][j-1],ab=G.sub(polys[1][j],a),t=Math.max(0,Math.min(1,G.dot(G.sub(q,a),ab)/G.dot(ab,ab)));best=Math.min(best,G.dist(q,G.add(a,G.mul(ab,t))));}gap=Math.max(gap,best);}
      worstGap=Math.max(worstGap,gap);if(gap<=e.values.tolerance)within++;}
    out.tolerantEdges[name]={edges:T.length,tolerancesM:[...tol],finCurveChain:[...chain],finCurves,worstTrimPointMissM:worstEnd,worstGapBetweenFinCurvesM:worstGap,edgesWithinTolerance:within};}
}
console.log(JSON.stringify({intersections:out.intersections,tolerantEdges:out.tolerantEdges},null,1));
if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,'RESULTS.json'),JSON.stringify(out,null,1)+'\n');
