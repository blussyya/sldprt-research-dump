// How a plain id join behaves on f666f342: of the display ids whose true native edge (id-free match,
// map from p13) has a different id, how many still find SOME native edge with that id, and how many
// of those wrong edges even join the same two faces. Shows that "the id resolves to an edge" is no check.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const map=JSON.parse(fs.readFileSync(process.argv[2]||'map_f666f342_head_face.json'));
const M=N.build(S.readBrep(fs.readFileSync(file)).parsed);
let shifted=0,resolves=0,sameType=0;
for(const [D,n] of Object.entries(map)){if(+D===n)continue;shifted++;const e=M.edges.get(+D);if(!e)continue;resolves++;if(e.curve.type===M.edges.get(n).curve.type)sameType++;}
console.log('display ids matched id-free',Object.keys(map).length,'shifted',shifted,'of which the id names some other native edge',resolves,'with the same curve type',sameType);
