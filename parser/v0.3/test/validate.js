'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),z=require('zlib'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../..'),p=require('../src/parser-core'),v2=require('../../v0.2/src/parser-core'),ole=require('../src/ole-reader'),browser=require('../src/inflate');
const iR=b=>new Uint8Array(z.inflateRawSync(b)),iZ=b=>new Uint8Array(z.inflateSync(b));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):/\.sldprt$/i.test(e.name)?[path.join(d,e.name)]:[]);
const log=fs.readFileSync(path.join(root,'test files new/SW2022/BUILD_LOG.md'),'utf8'),native={};
for(const s of log.split(/^## /m).slice(1)){const n=/Total face count:\s*`(\d+)`/.exec(s);if(n)native[s.split('\n')[0].trim().toLowerCase()]=+n[1];}
const rows=[];let legacyFaces=0,modernFaces=0;
for(const base of ['test files new/SW2011','test files new/SW2022','test files original'])for(const file of walk(path.join(root,base))){
 const b=fs.readFileSync(file),r=p.parseSLDPRT(b,iR,iZ),rb=p.parseSLDPRT(b,browser.inflateRaw,browser.inflate);
 assert.deepEqual(rb,r,'browser/Node mismatch '+file);
 const rel=path.relative(root,file),name=path.basename(path.dirname(file));
 if(base.endsWith('SW2011')){assert.deepEqual(r.errors,[]);assert.deepEqual(r.rejected,[]);assert.equal(r.faces.length,native[('sw2011/'+name).toLowerCase()]);assert(r.faces.every(f=>f.bounds&&f.metadata===null));legacyFaces+=r.faces.length;}
 else if(r.faces.length){const old=v2.parseSLDPRT(b,iR,iZ);assert.equal(r.faces.length,old.faces.length);for(let i=0;i<r.faces.length;i++)for(const k of ['vertices','normals','triangleIndices','edgeAnnotations','metadata'])assert.deepEqual(r.faces[i][k],old.faces[i][k]);modernFaces+=r.faces.length;}
 else assert(r.errors.length);
 for(const f of r.faces){assert(f.triangleIndices.every(i=>i<f.vertexCount));assert(f.vertices.every(Number.isFinite));}
 rows.push({file:rel,sha256:hash(b),format:r.format,faces:r.faces.length,triangles:r.stats?.triangles||0,errors:r.errors,rejected:r.rejected.length,warnings:r.warnings.length});
}
assert.equal(legacyFaces,145);assert.equal(modernFaces,1414);
const cube=fs.readFileSync(path.join(root,'test files new/SW2011/C00_cube_10mm/model.SLDPRT'));
const mutations=[];
function bad(name,b){const r=p.parseSLDPRT(b,iR,iZ);assert(r.errors.length,name);mutations.push(name);}
bad('truncated OLE header',cube.subarray(0,100));
bad('truncated OLE sectors',cube.subarray(0,cube.length-1024));
let b=Buffer.from(cube);b.writeUInt16LE(31,30);bad('invalid sector shift',b);
b=Buffer.from(cube);let dir=b.readUInt32LE(48),fat=b.readUInt32LE(76);b.writeUInt32LE(dir,(fat+1)*512+dir*4);bad('cyclic directory chain',b);
const compressed=z.deflateSync(Buffer.from('checksum control'));compressed[compressed.length-1]^=1;assert.throws(()=>browser.inflate(compressed),/Adler/);mutations.push('browser rejects corrupt Adler checksum');
assert.throws(()=>browser.inflate(z.deflateSync(Buffer.from('truncated')).subarray(0,5)));mutations.push('browser rejects truncated zlib');
const result={date:'2026-09-21',legacyFaces,modernFaces,files:rows.length,mutations,rows};
fs.writeFileSync(path.join(__dirname,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({legacyFaces,modernFaces,files:rows.length,mutations}));
