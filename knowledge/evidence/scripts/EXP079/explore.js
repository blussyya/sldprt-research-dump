// exploration: like probe.js, but a missing reader for a feature-like class (FF FE FF name after a
// class reference word) is replaced by: base header + skip to the next new-class tag or to a word
// 0x8000|k for a known class k that is followed by a plausible object start. Skips are logged.
const fs=require('fs'),path=require('path');
const P=require('../../../../package/src/parasolid/partition');
const A=require('./archive');require('./classes');const {Reader,READ,feature}=A;
const f=process.argv[2],quiet=process.argv.includes('-q');
const all=P.streams(fs.readFileSync(f));const k=Object.keys(all).find(x=>/Config-0-ResolvedFeatures$/.test(x));const b=all[k];
const modern=b.readUInt16LE(2)!==0xffff;
const r=new Reader(b,modern?b.readUInt32LE(0)+3:0);r.p=modern?4:0;
const skips=[];
const orig=r.object.bind(r);
function plausible(p,k){const c=r.classes.get(k);if(!c)return false;const w=b.readUInt16LE(p+2);
  if(b[p+3]===0x80&&b[p+4]===0xff&&b[p+5]===0xfe&&b[p+6]===0xff)return true;   // feature-like
  return !!READ[c.name];}
r.object=function(where){
  const at=this.p;const tag=b.readUInt16LE(at);
  let name=null;if(tag===0xffff){const len=b.readUInt16LE(at+4);name=b.subarray(at+6,at+6+len).toString('latin1');}else if(tag&0x8000&&tag!==0xffff){const c=this.classes.get(tag&0x7fff);name=c&&c.name;}
  if(name&&!READ[name]){
    // register class/object like object() does, then skip
    this.p+=2;let cls;if(tag===0xffff){const schema=this.u16(),len=this.u16();this.p+=len;cls={name,schema,index:this.next++};this.classes.set(cls.index,cls);}else cls=this.classes.get(tag&0x7fff);
    const obj={class:name,index:this.next++,at,skipped:true};this.objects.set(obj.index,obj);
    const d0=this.p;if(b[d0+1]===0x80&&b[d0+2]===0xff){try{feature(this,obj);}catch(e){this.p=d0;}}
    const s0=this.p;let q=s0;
    for(;q+7<b.length;q++){if(b[q]===0xff&&b[q+1]===0xff&&b[q+3]===0&&b[q+5]===0&&/^[A-Za-z]/.test(String.fromCharCode(b[q+6]))&&b[q+4]>2&&b[q+4]<64)break;
      const w=b.readUInt16LE(q);if((w&0x8000)&&w!==0xffff&&plausible(q,w&0x7fff))break;}
    skips.push({name,index:obj.index,at,base:s0-d0,skipped:q-s0,bytes:b.subarray(s0,Math.min(q,s0+64)).toString('hex')});
    this.p=q;obj.end=q;return obj;
  }
  return orig(where);
};
try{const count=r.u16();let n=0;while(r.p<b.length){const o=r.object('top');n++;if(!quiet&&o)console.log(String(o.at).padStart(6),o.class,o.index,o.name||'',o.skipped?'(skipped)':'');}
  console.log('END at',r.p,'of',b.length,'top objects',n,'header count',count);}
catch(e){console.log('STOP:',e.message);console.log('next bytes',b.subarray(r.p,r.p+96).toString('hex'));}
console.log('skips:');for(const s of skips)console.log(' ',s.name.padEnd(28),s.index,'at',s.at,'base',s.base,'skipped',s.skipped,s.bytes);
