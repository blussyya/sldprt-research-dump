const S=require('/home/user/conv-dev/src/index');
const d=S.parse('/home/user/sldprt-research-dump/test files new/SW2022/C03_cube_fillet_1mm/model.SLDPRT');
const f=d.faces[6];const P=f.vertices,N=f.normals,T=f.triangleIndices;
const dg=x=>x*180/Math.PI,ang=(x,y)=>dg(Math.atan2(y,x));
console.log('strips',f.stripLengths,'tris',T.length/3);
const vang=(i)=>ang(N[3*i],N[3*i+1]);
let sx=0,sy=0;
for(let t=0;t<T.length;t+=3){const [a,b,c]=[T[t],T[t+1],T[t+2]];
 const e1=[0,1,2].map(k=>P[3*b+k]-P[3*a+k]),e2=[0,1,2].map(k=>P[3*c+k]-P[3*a+k]);
 const n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];
 const s=Math.hypot(...n);const sg=(n[0]*N[3*a]+n[1]*N[3*a+1])<0?-1:1;
 console.log(t/3,[a,b,c].join(','),'vn angles',[a,b,c].map(vang).map(x=>x.toFixed(1)).join('/'),'flat',ang(sg*n[0],sg*n[1]).toFixed(2),'area',(s/2).toExponential(3));}
