const L=require('./lib'),G=L.G;
let cur=L.solve(0.02,-20.3593,29.8235);const out=[];
for(let x=0.02;x>-0.0485;x-=0.0005){const s=L.solve(x,cur.u,cur.v);if(!s){console.log('fail at',x);break;}cur=s;out.push([x,s.u,s.v,s.p[1],s.p[2]]);}
for(const o of out.filter((_,i)=>i%8==0||i>out.length-12))console.log(o.map(v=>v.toFixed(5)).join(' '));
