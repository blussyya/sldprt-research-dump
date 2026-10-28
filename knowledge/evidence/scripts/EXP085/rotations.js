// 3x3 rotation matrices (9 float64, orthonormal rows, det +-1) in a stream: offset, rows, and the ASCII/UTF-16 class name before it
const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const M=require(D+'container/modern'),fs=require('fs'),zlib=require('zlib');
const [f,name]=process.argv.slice(2);const st=M.decompressOpenSX(fs.readFileSync(f),b=>zlib.inflateRawSync(b),b=>zlib.inflateSync(b));
const b=Buffer.from(st[name]);let n=0;const kinds={};
const dot=(a,c)=>a[0]*c[0]+a[1]*c[1]+a[2]*c[2];
for(let i=0;i+72<=b.length;i++){const v=[];for(let k=0;k<9;k++)v.push(b.readDoubleLE(i+8*k));
  const r=[v.slice(0,3),v.slice(3,6),v.slice(6,9)];
  if(r.every(x=>Math.abs(dot(x,x)-1)<1e-9)&&Math.abs(dot(r[0],r[1]))<1e-9&&Math.abs(dot(r[0],r[2]))<1e-9&&Math.abs(dot(r[1],r[2]))<1e-9){
    n++;// nearest class name before: printable run ending in _c
    const s=b.subarray(Math.max(0,i-400),i).toString('latin1');const m=[...s.matchAll(/[A-Za-z]{3,}_c/g)].pop();
    const after=[0,1,2].map(k=>b.readDoubleLE(i+72+8*k));
    const key=(m?m[0]:'?');kinds[key]=(kinds[key]||0)+1;
    if(process.env.V)console.log(i,key,r.map(x=>x.map(y=>+y.toFixed(6)).join(',')).join(' | '),'then',after.map(y=>+y.toPrecision(6)).join(','));
    i+=71;}}
console.log(name,'rotations',n,JSON.stringify(kinds));
