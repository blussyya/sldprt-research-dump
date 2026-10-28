// unit-vector triples (f32 and f64) in a stream, counted by the class whose name precedes them
const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const M=require(D+'container/modern'),fs=require('fs'),zlib=require('zlib');
const [f,name]=process.argv.slice(2);const st=M.decompressOpenSX(fs.readFileSync(f),b=>zlib.inflateRawSync(b),b=>zlib.inflateSync(b));
const b=Buffer.from(st[name]);const cls=[...b.toString('latin1').matchAll(/[A-Za-z]{3,}_c/g)].map(m=>[m.index,m[0]]);
const owner=i=>{let o='(start)';for(const [k,n] of cls){if(k>i)break;o=n;}return o;};
const tab={};const add=(k,w)=>{tab[k]=tab[k]||{f32:0,f64:0,f32real:0};tab[k][w]++;};
const tiny=x=>x!==0&&Math.abs(x)<1e-30;   // a denormal is an integer read as a float
for(let i=0;i+12<=b.length;i++){const v=[b.readFloatLE(i),b.readFloatLE(i+4),b.readFloatLE(i+8)];const l=v[0]*v[0]+v[1]*v[1]+v[2]*v[2];
  if(Math.abs(l-1)<1e-5&&(v[0]||v[1])){add(owner(i),'f32');if(!v.some(tiny))add(owner(i),'f32real');}}
for(let i=0;i+24<=b.length;i++){const v=[b.readDoubleLE(i),b.readDoubleLE(i+8),b.readDoubleLE(i+16)];const l=v[0]*v[0]+v[1]*v[1]+v[2]*v[2];
  if(Math.abs(l-1)<1e-12&&(v[0]||v[1])&&!v.some(x=>x!==0&&Math.abs(x)<1e-200))add(owner(i),'f64');}
console.log(name,b.length);for(const [k,v] of Object.entries(tab))console.log(' ',k.padEnd(26),JSON.stringify(v));
