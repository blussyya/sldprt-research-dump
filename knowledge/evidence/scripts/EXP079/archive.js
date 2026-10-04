'use strict';
/* EXP-079 research reader: the MFC CArchive object stream that holds the SolidWorks feature tree
 * (Config-N-ResolvedFeatures, and Config-0 in pre-2011 files).
 *
 * CArchive mechanics (MFC WriteObject/WriteClass):
 *   u16 0x0000           null object
 *   u16 0xFFFF           new class: u16 schema, u16 name length, name; the class takes the next
 *                        index, then the object takes the next one, then its fields follow
 *   u16 0x8000 | k       new object of the already-seen class with index k
 *   u16 k (k < 0x7FFF)   reference to an object already read
 *   u16 0x7FFF + u32     the same with a 32-bit index (bit 31 marks a class)
 * Classes and objects share one index sequence. In ResolvedFeatures the sequence starts at the
 * stream's first u32 (N). Indices below N are classes and objects of Config-0's archive, which
 * this stream continues; three of its classes appear here (node name, component, object list) and
 * are recognised by role.
 *
 * MFC strings: u8 length (0xFF → u16, 0xFFFF → u32); Unicode strings are prefixed FF FE FF and the
 * length counts UTF-16 units.
 *
 * Field layouts per class are research results; each reader stops with the byte offset at the
 * first thing it can't account for. It never scans forward.
 */
class Reader {
  constructor(b,start,pre){this.b=b;this.p=0;this.next=start;this.start=start;this.pre=pre||{};this.classes=new Map();this.objects=new Map();this.log=[];}
  need(n){if(this.p+n>this.b.length)throw Error('truncated at '+this.p);}
  u8(){this.need(1);return this.b[this.p++];}
  u16(){this.need(2);const v=this.b.readUInt16LE(this.p);this.p+=2;return v;}
  i16(){this.need(2);const v=this.b.readInt16LE(this.p);this.p+=2;return v;}
  u32(){this.need(4);const v=this.b.readUInt32LE(this.p);this.p+=4;return v;}
  i32(){this.need(4);const v=this.b.readInt32LE(this.p);this.p+=4;return v;}
  f32(){this.need(4);const v=this.b.readFloatLE(this.p);this.p+=4;return v;}
  f64(){this.need(8);const v=this.b.readDoubleLE(this.p);this.p+=8;return v;}
  bytes(n){this.need(n);const v=this.b.subarray(this.p,this.p+n);this.p+=n;return v;}
  vec(){return [this.f64(),this.f64(),this.f64()];}
  count(){let n=this.u16();if(n===0xffff)n=this.u32();return n;}   // MFC WriteCount
  str(){   // CString, ANSI or Unicode
    const at=this.p;let n=this.u8(),wide=false;
    if(n===0xff){n=this.u16();if(n===0xfffe){wide=true;n=this.u8();if(n===0xff){n=this.u16();if(n===0xffff)n=this.u32();}}else if(n===0xffff)n=this.u32();}
    if(n>1e6)throw Error('string length at '+at);
    if(wide){const s=this.bytes(2*n).toString('utf16le');return s;}
    return this.bytes(n).toString('latin1');
  }
  expect(v,got,what){if(v!==got)throw Error(`${what}: expected ${v}, got ${got} at ${this.p}`);}
  // Undecoded stretch ending at the next object of class `name`: the only forward search in the reader,
  // used where a block's layout is known to vary but not yet decoded (dimension placement). The
  // stretch must not contain a class definition, so no object can hide in it; the index count stays right.
  skipToObject(name,sig){const k=[...this.classes.values()].find(c=>c.name===name);const tag=k?Buffer.from([k.index&0xff,0x80|(k.index>>8)]):null;
    const def=Buffer.concat([Buffer.from([0xff,0xff,1,0,name.length,0]),Buffer.from(name)]);
    for(let p=this.p;p<this.b.length-8;p++){
      const isDef=this.b.subarray(p,p+def.length).equals(def),isTag=tag&&this.b[p]===tag[0]&&this.b[p+1]===tag[1];
      if(!isDef&&!isTag)continue;const body=p+(isDef?def.length:2);if(sig&&!this.b.subarray(body,body+sig.length).equals(sig))continue;
      const skipped=this.b.subarray(this.p,p);for(let q=0;q+5<skipped.length;q++)if(skipped[q]===0xff&&skipped[q+1]===0xff&&skipped[q+2]===1&&skipped[q+3]===0&&skipped[q+5]===0&&skipped[q+6]>=0x41)throw Error('class definition inside skipped stretch at '+(this.p+q));
      this.p=p;return skipped.toString('hex');}
    throw Error('no '+name+' after '+this.p);}
  // an object whose class may be a pre-loaded one not yet named: name it by the role it plays here
  objectAs(role,where){const t=this.b.readUInt16LE(this.p);if((t&0x8000)&&t!==0xffff&&t!==0x7fff){const k=t&0x7fff;if(k<this.start&&!this.pre[k])this.pre[k]=role;}return this.object(where||role);}
  object(where){
    const at=this.p,tag=this.u16();
    if(tag===0)return null;
    let cls;
    if(tag===0xffff){const schema=this.u16(),len=this.u16(),name=this.bytes(len).toString('latin1');
      if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw Error('bad class name at '+at);
      cls={name,schema,index:this.next++};this.classes.set(cls.index,cls);}
    else if(tag===0x7fff){const big=this.u32();if(big&0x80000000){cls=this.classes.get(big&0x7fffffff);if(!cls)throw Error('unknown big class '+(big&0x7fffffff)+' at '+at);}else return {ref:big};}
    else if(tag&0x8000){const k=tag&0x7fff;cls=this.classes.get(k);
      if(!cls&&k<this.start&&this.pre&&this.pre[k])cls={name:this.pre[k],index:k,preloaded:true};
      if(!cls)throw Error(`unknown class index ${k}${k<this.start?' (pre-loaded)':''} at ${at}${where?' ('+where+')':''}`);}
    else return {ref:tag};
    const obj={class:cls.name,index:this.next++,at};this.objects.set(obj.index,obj);
    const fn=READ[cls.name];if(!fn)throw Error(`no reader for ${cls.name} (schema ${cls.schema}) at ${this.p}, object at ${at}`);
    if(process.env.TRACE)console.error(' '.repeat(this.depth||0)+'> '+cls.name+' #'+obj.index+' @'+at);
    this.depth=(this.depth||0)+1;try{fn(this,obj);}finally{this.depth--;}obj.end=this.p;
    if(process.env.TRACE)console.error(' '.repeat(this.depth)+'< '+cls.name+' #'+obj.index+' end '+this.p+(obj.name!==undefined?' "'+obj.name+'"':''));
    return obj;
  }
}

/* ---- the base of every feature (moFeature_c and kin), 2022 layout ---- */
function feature(r,o){
  o.node=r.object('feature node');   // a new object of the pre-loaded node-name class (#4 in 2022 files)
  // a feature written inside another object (the hidden plane of a sketch on a face) has a null node
  // pointer and its node fields inline, without the name
  if(!o.node){o.node={inline:true};node(r,o.node,true);if(process.env.FS)console.error('INLINE NODE',JSON.stringify(o.node),r.p);}
  Object.assign(o,{name:o.node.name,id:o.node.id,flags:o.node.flags});
}
// The node-name object (pre-loaded class, probably moNodeName_c): name, flags, feature id, comment,
// child objects, order, version stamps, display state.
function node(r,o,noName){
  o.name=noName?'':r.str();
  o.a=r.u32();o.flags=r.u32();o.id=r.u32();o.b=r.u32();   // id = KeyWords feature id
  o.comment=r.str();
  if(o.id===0xffffffff&&!noName){o.short=true;o.d=r.u16();return;}   // parameters (D1 …) carry the short form
  o.c=r.u32();o.d=r.u16();
  const n=r.u16();o.children=[];for(let i=0;i<n;i++)o.children.push(r.object('feature children'));   // objects: back-references (an extrude's sketch) or whole child features (Annotations' folders)
  o.e=r.bytes(12).toString('hex');
  o.order=r.u32();
  o.f=r.u8();o.g=r.u32();
  o.created={version:r.u32(),build:r.u32()};o.modified={version:r.u32(),x:r.f64(),build:r.u32()};
  o.h=r.u16();o.str2=r.str();
  o.tail=r.bytes(62).toString('hex');   // flags, -1s, a float -1.0, a FILETIME and fixed words; to split
  o.base2=[r.u16(),r.u32()];   // ends here: the Annotations folder's own data (two doubles) starts 2 bytes later
}

const READ={'@node':node};
module.exports={Reader,READ,feature};
