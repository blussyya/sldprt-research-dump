const {F,G,S1,S2,A,B,c,fs}=require('./common');
let scale=0;for(let i=1;i<c.chart.length;i++)scale+=G.dist(c.chart[i],c.chart[i-1]);
console.log('chart',c.chart.length,'scale',scale,'AB',G.dist(A,B));
const t0=Date.now();
const poly=F.march(S1,S2,A,B,G.sub(c.chart[1],c.chart[0]),scale,false);
console.log('march',(Date.now()-t0)/1e3,poly.length);
fs.writeFileSync('poly.json',JSON.stringify(poly));
