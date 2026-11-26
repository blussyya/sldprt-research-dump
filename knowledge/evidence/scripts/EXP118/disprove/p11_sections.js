// Other Parasolid sections in f666f342: the partition's deltas section and the body embedded in
// Config-0-ResolvedFeatures. Does either describe bore faces 2516 / 12990 differently?
const L=require('./lib'),P=require(L.R+'/src/parasolid/partition'),X=require(L.R+'/src/parasolid/xt'),N=require(L.R+'/src/brep/native'),fs=require('fs'),zlib=require('zlib');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const raw=fs.readFileSync(file),all=P.streams(raw);
const codec={inflateRaw:b=>zlib.inflateRawSync(b,{maxOutputLength:256<<20}),inflate:b=>zlib.inflateSync(b,{maxOutputLength:256<<20})};
const rows=P.survey(raw,all,codec,{allowLargeSections:true});
const wantF=(process.argv[3]||'2516,12990').split(',').map(Number);
for(const row of rows){console.log('stream',row.stream,'chain',row.chain,JSON.stringify(row.sections));
  const b=all[row.stream];
  for(const s of row.sections){
    const w=P.sections(b.subarray(0,s.offset+4+(b[s.offset]|b[s.offset+1]<<8|b[s.offset+2]<<16|b[s.offset+3]<<24)>>>0),s.offset,codec,{allowLargeSections:true});
    const body=w.out[0].body;const head=Buffer.from(body.subarray(0,120)).toString('latin1').replace(/[^\x20-\x7e]/g,'.');console.log('  section',s.kind,'bytes',body.length,'head',head.slice(0,100));
    let q;try{q=X.parse(body,true,{allowLargeSections:true});}catch(e){console.log('  parse threw',e.message);continue;}
    console.log('  parsed nodes',q.nodes.length,'error',q.error,'types14',q.nodes.filter(n=>n.type===14).length,'edges16',q.nodes.filter(n=>n.type===16).length);
    // does it mention the face/edge ids
    const ids=new Set(q.nodes.filter(n=>n.values&&typeof n.values.node_id==='number').map(n=>n.values.node_id));
    console.log('  has node_ids',[2516,1166,1093,1165,12990,11111,11124,11135].map(i=>i+':'+ids.has(i)).join(' '));
    if(q.error||!q.nodes.some(n=>n.type===14))continue;
    try{const M=N.build(q);for(const id of wantF){const f=M.faces.find(x=>x.id===id);if(!f){console.log('  face',id,'absent');continue;}
      console.log('  face',id,f.surface.type,'loops',f.loops.map(l=>l.coedges.map(c=>c.edge+(c.sense?'+':'-')+':'+M.edges.get(c.edge).curve.type+(M.edges.get(c.edge).v?'':'(ring)')).join(' ')).join(' | '));}}catch(e){console.log('  build',e.message);}
  }
}
