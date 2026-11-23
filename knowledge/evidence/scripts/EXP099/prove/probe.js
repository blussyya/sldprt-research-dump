const S=require('/home/user/solidworks-converters/src'),L=require('./lib');
const f='/home/user/sldprt-research-dump/test files online/2019/a3a44709_FrontPanel-Bezel.sldprt';
const r=S.parasolid.partition.readBody(require('fs').readFileSync(f),{});const p=r.parsed;
console.log(r.source,r.kind,p.sections,p.hidden,p.nodes.length);
const by=new Map(p.nodes.map(n=>[n.index,n]));
const faces=p.nodes.filter(n=>n.type===14);console.log(faces.length,JSON.stringify(faces[0].values).slice(0,500));
const f0=faces[0];const lp=by.get(f0.values.loop);console.log(JSON.stringify(lp.values));const fin=by.get(lp.values.fin);console.log(JSON.stringify(fin.values));
const vx=by.get(fin.values.vertex);console.log(vx&&JSON.stringify(vx.values));
console.log(JSON.stringify(by.get(f0.values.shell).values));
