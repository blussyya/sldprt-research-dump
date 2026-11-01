const L=require('./lib');
console.log('range',L.u0,L.u1,L.v0,L.v1);
for(const x of [0.02,0.01,0,-0.01,-0.02,-0.03,-0.04,-0.042,-0.044,-0.046,-0.048]){
  const r=L.all(x,24);console.log(x.toFixed(4),r.map(o=>`(${o.u.toFixed(4)},${o.v.toFixed(4)}) y=${o.p[1].toFixed(5)}`).join(' | '));
}
