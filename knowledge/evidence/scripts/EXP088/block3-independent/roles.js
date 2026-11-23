'use strict';
const fs=require('fs'),path=require('path'),S=require((process.env.SLDPRT_CONVERTER||require('path').resolve(__dirname,'../../../../../../solidworks-converters'))+'/src');
const root=path.resolve(__dirname,'../../../../../test files online'),files=JSON.parse(fs.readFileSync(path.join(__dirname,'results.json'))).totals.filesWithNonzero.map(x=>x.file);
const out={controls:{},edgeFlags:{},mixedEdgeExamples:[],byFile:[]};
const plus=(o,k)=>o[k]=(o[k]||0)+1;
for(const file of files){const d=S.parse(path.join(root,file)),edgeFlags=new Map();let mixed=0;
 for(const [fi,f] of d.faces.entries()){
 let ti=0,vi=0;
 for(const n of f.stripLengths){const flag=f.block3[ti];let pos=0,neg=0,flat=0;
 for(let j=2;j<n;j++){let ids=j%2?[vi+j-1,vi+j-2,vi+j]:[vi+j-2,vi+j-1,vi+j];const p=ids.map(i=>Array.from(f.vertices.slice(i*3,i*3+3)));const a=p[1].map((x,k)=>x-p[0][k]),b=p[2].map((x,k)=>x-p[0][k]);const c=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const dot=c.reduce((s,x,k)=>s+x*ids.reduce((t,i)=>t+f.normals[i*3+k],0),0);if(dot>1e-20)pos++;else if(dot< -1e-20)neg++;else flat++;}
 const key=flag+':'+(pos&&neg?'mixed':pos?'positive':neg?'negative':'flat');plus(out.controls,key);ti+=2*n-2;vi+=n;
 }
 for(const e of f.edgeAnnotations){const i=(e.tokenOffset-f.offsets.block1-16)/4;if(!e.id)continue;const flag=f.block3[i];plus(out.edgeFlags,flag);if(!edgeFlags.has(e.id))edgeFlags.set(e.id,new Set());edgeFlags.get(e.id).add(flag);}
 }
 for(const [id,flags] of edgeFlags)if(flags.size>1){mixed++;if(out.mixedEdgeExamples.length<20)out.mixedEdgeExamples.push({file,id,flags:[...flags]});}
 out.byFile.push({file,mixedEdgeIds:mixed});
}
fs.writeFileSync(path.join(__dirname,'roles.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
