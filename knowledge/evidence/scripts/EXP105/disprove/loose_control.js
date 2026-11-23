// "on a chord" tested loosely: distance to ANY segment between two other boundary vertices of the face (1e-7). Compare off vs on-surface boundary vertices.
const L=require('./lib');const ck=p=>p.join(',');
const {d,j}=L.load(process.argv[2]);const fi=+process.argv[3];const df=d.faces[fi],s=j[fi].face.surface;
const bs=new Map();for(const e of df.edgeAnnotations)if(e.id)for(const v of e.vertices)bs.set(ck(L.V(df,v)),L.V(df,v));
const B=[...bs.values()];let c={off:[0,0],on:[0,0]};
for(const p of B){const r=Math.abs(L.dSurf(s,p));let hit=false;
 for(let x=0;x<B.length&&!hit;x++)for(let y=x+1;y<B.length;y++){if(B[x]===p||B[y]===p)continue;if(L.segDist(p,B[x],B[y])<=1e-7){hit=true;break;}}
 const g=r>1e-7?'off':'on';c[g][0]++;if(hit)c[g][1]++;}
console.log(process.argv[2].replace(/.*SW2022\//,''),'face',fi,'boundary verts',B.length,'off(total,loosePass)',c.off.join('/'),'on-surface(total,loosePass)',c.on.join('/'));
