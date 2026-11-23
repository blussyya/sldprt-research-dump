// Join display faces with unidentified tags to the native body by face ID (display rawId =
// FACE node_id, format/4-mesh-and-body.md) and report the native surface type each one has.
// Control: tags 4001-4006 must come out as plane, cylinder, cone, sphere, torus, B-surface.
const C=process.env.SLDPRT_CONVERTER||require('path').resolve(__dirname,'../../../../../../solidworks-converters');
const S=require(C+'/src'),N=require(C+'/src/brep/native');
const files=process.argv.slice(2),out={};
for(const file of files){
  const p=S.parse(file),M=N.build(S.readBrep(file).parsed);
  for(const f of p.faces){
    const t=f.metadata&&f.metadata.typeTag;if(t==null)continue;
    const nf=M.faces.find(x=>x.id===f.metadata.rawId);
    const type=nf?(nf.surface&&(nf.surface.type||nf.surface.kind))||'face without surface':'no native face';
    const k=t+' -> '+type;out[k]=(out[k]||0)+1;
  }
}
console.log(JSON.stringify(out,null,1));
