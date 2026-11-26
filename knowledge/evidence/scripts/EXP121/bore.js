// EXP-121 (NQ-069 lead): the edges of the given faces, with each fitted edge's error from a timing.js log.
// usage: node bore.js <part> <timing log> <face id>...
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),fs=require('fs');
const [file,log,...fids]=process.argv.slice(2),M=N.build(S.readBrep(fs.readFileSync(file)).parsed);
const err=new Map();for(const l of fs.readFileSync(log,'utf8').split('\n')){const m=l.match(/^end \S+ edgeCurve edge (\d+) .* error (\S+)/);if(m)err.set(+m[1],m[2]);}
for(const fid of fids){const f=M.faces.find(x=>x.id===+fid);console.log(`face ${fid}: ${f.surface.type}, ${f.loops.length} loops`);
  for(const l of f.loops)console.log('  loop: '+l.coedges.map(c=>{const e=M.edges.get(c.edge)||{id:c.edge};return `${e.id} ${e.curve?e.curve.type:'-'} ${err.has(e.id)?err.get(e.id):'exact'}`;}).join('; '));}
