const F0='/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt';
module.exports=function(R){const S=require(R+'/src'),N=require(R+'/src/brep/native');return {S,N,M:N.build(S.readBrep(F0).parsed)};}
