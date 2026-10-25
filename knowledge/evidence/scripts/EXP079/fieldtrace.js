// Field-level trace: run the reader on one file and print every primitive read as
// "offset  depth  class.method  value", so two files can be compared field by field.
// usage: node fieldtrace.js <model.SLDPRT> [fromOffset] [toOffset]   (START=n for SW2011 files)
const fs=require('fs');
const P=require('../../../../package/src/parasolid/partition');
const {Reader}=require('./archive');require('./classes');
const [f,a,z]=[process.argv[2],+(process.argv[3]||0),+(process.argv[4]||1e9)];
const all=P.streams(fs.readFileSync(f));
const C0=process.env.STREAM==='Config-0';   // STREAM=Config-0 reads the configuration archive (first index 2: 1 is the document)
const b=all[Object.keys(all).find(x=>C0?/Config-0$/.test(x):/Config-0-ResolvedFeatures$/.test(x))];
const modern=C0?true:b.readUInt16LE(2)!==0xffff;const start=C0?+(process.env.START||2):modern?b.readUInt32LE(0):+process.env.START;
if(C0)require('./config0');
const pre={};const role=(name,label)=>{const i=b.indexOf(Buffer.from(name));if(i<0)return;const w=b.readUInt16LE(i+name.length);if(w&0x8000)pre[w&0x7fff]=label;};
role('moCommentsFolder_c','@node');role('moCompFeature_c','@comp');
{const i=b.indexOf(Buffer.from('sgPointHandle'));if(i>0){const w=b.readUInt16LE(i+37);if(w&0x8000)pre[w&0x7fff]='@oblist';}}
const r=new Reader(b,start,C0?{}:pre);r.p=C0?0:modern?4:0;r.legacy=C0?b.indexOf(Buffer.from('moHeader_c'))>=0:!modern;
const stack=[];const out=[];
for(const m of ['u8','u16','i16','u32','i32','f32','f64','bytes','str']){const orig=Reader.prototype[m];
  r[m]=function(...x){const at=this.p;const v=orig.apply(this,x);if(!this.inStr&&stack[stack.length-1]!=='?'&&at>=a&&at<z)out.push([at,stack.length,(stack[stack.length-1]||'top')+'.'+m,Buffer.isBuffer(v)?v.toString('hex'):JSON.stringify(v)]);return v;};}
{const os=r.str;r.str=function(){this.inStr=true;const at=this.p;let v;try{v=Reader.prototype.str.call(this);}finally{this.inStr=false;}if(at>=a&&at<z)out.push([at,stack.length,(stack[stack.length-1]||'top')+'.str',JSON.stringify(v)]);return v;};}
r.object=function(w){const at=this.p;const t=this.b.readUInt16LE(at);
  let desc=t===0?'null':t===0xffff?'class def':t&0x8000?'new obj of #'+(t&0x7fff):'ref #'+t;
  if(t===0xffff){const n=this.b.readUInt16LE(at+4);desc+=' '+this.b.subarray(at+6,at+6+n).toString('latin1');}
  if(at>=a&&at<z)out.push([at,stack.length,'OBJ '+(w||''),desc]);
  stack.push('?');   // header reads are hidden until the class reader runs
  try{return Reader.prototype.object.call(this,w);}finally{stack.pop();}};
// name the current class on the stack: patch READ dispatch through obj creation
const A=require('./archive');const R=A.READ;for(const k of Object.keys(R)){const fn=R[k];R[k]=(rr,o)=>{stack[stack.length-1]=k;return fn(rr,o);};}
if(!C0)r.u16(); // slot count
try{for(;;){if(r.p>=b.length-2)break;const o=r.object('top');if(o&&o.class===undefined)throw Error('top ref');}}catch(e){out.push([r.p,0,'STOP',e.message]);}
for(const [p,d,w,v] of out)console.log(String(p).padStart(6),' '.repeat(d)+w,v);
