const RD='/home/user/conv-dev',S=require(RD+'/src'),N=require(RD+'/src/brep/native'),G=require(RD+'/src/geom/eval');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);
const fc=M.faces.find(x=>x.surface.type==='blend'&&x.surface.node===9821);const c=fc.surface.spine;const s1=c.surfaces[0],B=s1.basis;
console.log(B.type,B.du,B.dv,B.ku.slice(0,8),B.ku.slice(-6),B.kv.slice(0,8),B.kv.slice(-6),'ctrl',B.ctrl.length,B.ctrl[0].length,'weights',!!B.weights,'sense',s1.sense,B.sense,'d',s1.d);
console.log('surfaceRange',G.surfaceRange(B));
