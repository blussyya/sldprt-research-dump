'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto'),assert=require('assert/strict');
const P=require('../../../../parser/v0.1/src/parser-core'),O=require('../../../../parser/v0.3/src/ole-reader');
const {parse}=require('../EXP071/typed-reader'),{topology,cubeGeometry,coverage}=require('../EXP071/audit');
const ROOT=path.resolve(__dirname,'../../../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function extract(raw){let stream,name;
  if(raw.subarray(0,4).toString('hex')==='d0cf11e0'){const o=O.read(raw),es=o.entries.filter(e=>e.name==='Config-0-Partition');if(es.length!==1)throw Error(`Expected one Config-0-Partition stream; found ${es.length}`);name=es[0].name;stream=Buffer.from(o.stream(es[0]));}
  else {const s=P.decompressOpenSX(raw,x=>zlib.inflateRawSync(x),x=>zlib.inflateSync(x)),keys=Object.keys(s).filter(k=>/Config-0-Partition$/.test(k));assert.equal(keys.length,1);name=keys[0];stream=Buffer.from(s[name]);}
  assert.equal(stream.subarray(4,20).toString('hex'),'231dd571da8148a2a85898b21b89ef99');
  const inf=zlib.inflateSync(stream.subarray(28),{info:true,maxOutputLength:128*1024*1024});
  return {name,stream,inner:inf.buffer,compressedBytes:inf.engine.bytesWritten};
}
// Match graph edges by field role from the BODY roots, never by equal file
// indices. Exclude attribute data, session ownership and derived geometry caches.
function compareBodies(a,b){const am=new Map(a.nodes.map(n=>[n.index,n])),bm=new Map(b.nodes.map(n=>[n.index,n]));const ar=a.nodes.filter(n=>n.type===12),br=b.nodes.filter(n=>n.type===12);assert.equal(ar.length,1);assert.equal(br.length,1);
  const seenA=new Map(),seenB=new Map(),queue=[[ar[0].index,br[0].index]],differences=[];let fields=0,maxFloatError=0;
  const bodyFields=new Set(['res_size','res_linear','body_type','nom_geom_state','shell','boundary_surface','boundary_curve','boundary_point','region','edge','vertex']);
  const ignore=new Set(['attributes_groups','geometric_owner','data']);
  function equal(x,y,kind){if(Array.isArray(x)||Array.isArray(y)){if(!Array.isArray(x)||!Array.isArray(y)||x.length!==y.length)return false;return x.every((v,i)=>equal(v,y[i],kind));}if(x===null||y===null)return x===y;if(['f','v','i','h','b'].includes(kind)){maxFloatError=Math.max(maxFloatError,Math.abs(x-y));return Math.abs(x-y)<=3e-14*Math.max(1,Math.abs(x),Math.abs(y));}return x===y;}
  while(queue.length){const [ai,bi]=queue.shift();if(!ai&&!bi)continue;if(seenA.has(ai)){if(seenA.get(ai)!==bi)differences.push({ai,bi,reason:'native alias mismatch'});continue;}if(seenB.has(bi)){differences.push({ai,bi,reason:'export alias mismatch'});continue;}const an=am.get(ai),bn=bm.get(bi);if(!an||!bn||an.type!==bn.type){differences.push({ai,bi,reason:'missing/type',native:an?.name,export:bn?.name});continue;}seenA.set(ai,bi);seenB.set(bi,ai);
    const af=a.edits.find(e=>e.type===an.type).fields,bf=b.edits.find(e=>e.type===bn.type).fields;
    for(const f of af){if((an.type===12&&!bodyFields.has(f.name))||ignore.has(f.name))continue;const g=bf.find(g=>g.name===f.name);if(!g||f.kind!==g.kind){differences.push({ai,bi,field:f.name,reason:'schema'});continue;}fields++;const x=an.values[f.name],y=bn.values[f.name];if(f.kind==='p'){const xs=Array.isArray(x)?x:[x],ys=Array.isArray(y)?y:[y];if(xs.length!==ys.length){differences.push({ai,bi,field:f.name,reason:'pointer count'});continue;}for(let i=0;i<xs.length;i++)queue.push([xs[i],ys[i]]);}else if(!equal(x,y,f.kind))differences.push({ai,bi,type:an.name,field:f.name,native:x,export:y});}
  }
  const topologyTypes=[13,14,15,16,17,18,19],unmatchedTopology=a.nodes.filter(n=>topologyTypes.includes(n.type)&&!seenA.has(n.index)).map(n=>n.index);
  return {matchedNodes:seenA.size,fields,maxFloatError,differences,unmatchedTopology};
}
function run(){const rows=[];let cubeMap;
  for(const era of ['SW2011','SW2022'])for(const model of fs.readdirSync(path.join(ROOT,'test files new',era)).sort()){
    const dir=path.join(ROOT,'test files new',era,model),file=path.join(dir,'model.SLDPRT');if(!fs.existsSync(file))continue;const raw=fs.readFileSync(file),x=extract(raw),r=parse(x.inner,true),exported=parse(fs.readFileSync(path.join(dir,'model.x_b')),true);assert.equal(r.error,null,`${era}/${model}`);assert.equal(r.nodes[0].type,101);const bodies=r.nodes.filter(n=>n.type===12);assert.equal(bodies.length,1);assert.equal(r.nodes[0].values.body,bodies[0].index);const graph=topology(r);assert.deepEqual(graph.errors,[],`${era}/${model}`);const comparison=compareBodies(r,exported);
    const faces=r.nodes.filter(n=>n.type===14).length;assert.equal(faces,exported.nodes.filter(n=>n.type===14).length);
    rows.push({era,model,sha256:{sldprt:hash(raw),partitionStream:hash(x.stream),inner:hash(x.inner)},stream:x.name,streamBytes:x.stream.length,wrapperHex:x.stream.subarray(0,28).toString('hex'),zlibOffset:28,zlibBytes:x.compressedBytes,trailerHex:x.stream.subarray(28+x.compressedBytes).toString('hex'),innerBytes:x.inner.length,nodes:r.nodes.length,faces,topologyChecks:graph.checks,coverage:coverage(r),unresolved:r.unresolved,comparison});
    if(model==='C00_cube_10mm'){cubeGeometry(r);if(era==='SW2022')cubeMap={coordinateSystem:'Offsets within inflated Config-0-Partition payload, not SLDPRT file offsets',source:rows.at(-1),header:r.header,nodes:r.nodes,spans:r.spans.map(s=>({...s,hex:x.inner.subarray(s.start,s.end).toString('hex')}))};}
  }
  assert.equal(rows.length,49);const result={experiment:'EXP-072',date:'2026-09-28',summary:{files:rows.length,nodes:rows.reduce((s,r)=>s+r.nodes,0),faces:rows.reduce((s,r)=>s+r.faces,0),topologyChecks:rows.reduce((s,r)=>s+r.topologyChecks,0),graphMatches:rows.filter(r=>!r.comparison.differences.length&&!r.comparison.unmatchedTopology.length).length},rows};
  if(process.argv.includes('--write')){fs.writeFileSync(path.join(__dirname,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'C00_SW2022_PARTITION_MAP.json.gz'),zlib.gzipSync(JSON.stringify(cubeMap)));}
  console.log(JSON.stringify(result.summary,null,2));for(const r of rows)if(r.comparison.differences.length||r.comparison.unmatchedTopology.length)console.log(r.era,r.model,JSON.stringify(r.comparison).slice(0,1800));return result;
}
if(require.main===module)run();module.exports={extract,compareBodies,run};
