// List OLE streams of a legacy part, and which ones the readers use.
const L=require('./lib'),S=require(L.R+'/src'),fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const i=S.info(fs.readFileSync(file));
console.log(i.container,'saved',JSON.stringify(i.saved));
for(const s of i.streams)if(/Display|Partition|Body|Tess|Config/i.test(s.name))console.log(s.name,s.bytes);
console.log('display',JSON.stringify(i.display));console.log('partitions',JSON.stringify(i.partitions));console.log('brep',JSON.stringify(i.brep&&{source:i.brep.source,schema:i.brep.schema,nodes:i.brep.nodes,graphErrors:i.brep.graphErrors}));
