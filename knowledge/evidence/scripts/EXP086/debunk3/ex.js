const {G,F,c,b}=require('./load.js');
const [B0,O]=c.surfaces;
console.log(Object.keys(O),O.type,JSON.stringify(O,(k,v)=>k==='basis'||k==='surfaces'?'[..]':v).slice(0,600));
console.log('basis',O.basis&&O.basis.type,O.basis&&Object.keys(O.basis));
console.log('B0',Object.keys(B0),B0.spine&&B0.spine.type);
console.log('start',JSON.stringify(c.start),'end',JSON.stringify(c.end));
console.log('chart',JSON.stringify(c.chart));
console.log('b.start/end',JSON.stringify(b.start),JSON.stringify(b.end), b.range);
