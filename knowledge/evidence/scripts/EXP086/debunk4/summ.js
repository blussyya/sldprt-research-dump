const L=require('fs').readFileSync(process.argv[2],'utf8').trim().split('\n').filter(l=>l[0]=='{').map(JSON.parse);
let n=0,viol=0;
for(const r of L)for(const v of r.v){n++;
  const tol=v.tol||1e-8;
  if(v.d>5e-9)console.log('edge',r.edge,'v',v.id,'d',v.d.toExponential(2),'vtol',v.tol,v.d>tol?'**BEYOND TOL (curve end would be off-vertex by more than tol)**':'');}
console.log('edges',L.length,'vertex ends',n,'max d among all',Math.max(...L.flatMap(r=>r.v.map(v=>v.d))).toExponential(2));
