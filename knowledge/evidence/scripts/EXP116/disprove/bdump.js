const L=require('./lib'),R=require('./rec');
const f=L.ROOT+'/test files online/2024/4febfc67_6344149.SLDPRT';
const x=L.dlBytes(f),r=L.faces(x.dl),m=L.mk(x.dl);
const hex=(o,n)=>{let s='';for(let i=0;i<n;i+=4)s+=(m.u(o+i)>>>0).toString(16).padStart(8,'0')+' ';return s;};
let c=0;
r.faces.forEach((fc,i)=>{const G=fc.geometryEnd;const rf=R.readFace(m,G);
 if(c<3||i==5){c++;
 console.log('face',i,'vc',fc.vertexCount,'lay',rf.lay,'nxt',(r.faces[i+1]?r.faces[i+1].offset:x.dl.length)-G);
 console.log(' rec[0..140]:',hex(G,140));
 const k=m.hdr(G+140,8,100);console.log(' a8 K',k);
 const p=G+140+16+8*k;console.log(' flag',m.u(p),'after a8 hdr',hex(p,24));
 console.log(' f64@84',m.f(G+84),'@92',m.f(G+92),'@100',m.f(G+100),'@108',m.f(G+108));
 if(rf.w&&!rf.w.err)console.log(' walk res',rf.w.res,'idPos-G',rf.w.idPos-G,'next 80B',hex(rf.w.idPos,80));}
});
console.log('A-vs-B record bounding fields (A face for comparison)');
