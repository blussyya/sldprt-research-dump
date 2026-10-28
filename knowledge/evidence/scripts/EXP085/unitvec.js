// every float32 and float64 unit-vector triple in one stream, with offset and value
const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const M=require(D+'container/modern'),fs=require('fs'),zlib=require('zlib');
const [f,name]=process.argv.slice(2);const st=M.decompressOpenSX(fs.readFileSync(f),b=>zlib.inflateRawSync(b),b=>zlib.inflateSync(b));
const b=Buffer.from(st[name]);const out=[];
for(let i=0;i+12<=b.length;i++){const x=b.readFloatLE(i),y=b.readFloatLE(i+4),z=b.readFloatLE(i+8),l=x*x+y*y+z*z;if(Math.abs(l-1)<1e-5&&(x||y))out.push(['f32',i,x,y,z]);}
for(let i=0;i+24<=b.length;i++){const x=b.readDoubleLE(i),y=b.readDoubleLE(i+8),z=b.readDoubleLE(i+16),l=x*x+y*y+z*z;if(Math.abs(l-1)<1e-12&&(x||y))out.push(['f64',i,x,y,z]);}
console.log(name,b.length,'bytes;',out.filter(o=>o[0]==='f32').length,'f32,',out.filter(o=>o[0]==='f64').length,'f64');
for(const o of out)console.log(o[0],o[1],o.slice(2).map(v=>+v.toPrecision(7)).join(' '));
