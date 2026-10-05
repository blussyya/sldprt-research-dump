'use strict';
/* EXP-081 research readers for Config-0, the configuration archive. It is an MFC CArchive like
 * ResolvedFeatures, read from index 2 in SW2022 files (index 1 is mapped in advance) and from index 1 in
 * SW2011 ones. Its index sequence ends where the configuration's ResolvedFeatures starts, and its classes
 * are the "pre-loaded" ones that stream refers to (moNodeName_c is the feature node, moUnitComponent_c the
 * component, suObList the object list).
 *
 * Layouts are written as field lists: "u32 name", "f64*4 name", "str name", "obj name", "b12" (raw bytes);
 * a field prefixed "22:" is read only in SW2022 files, "11:" only in SW2011 ones. */
const {READ:R,Reader,feature}=require('./archive');require('./classes');
function seq(r,o,spec){
  for(let f of spec.trim().split(/\s*,\s*/)){
    if(!f)continue;
    const m=/^(?:(11|22):)?(\w+?)(\d+)?(?:\*(\d+))?(?:\s+(\w+))?$/.exec(f);if(!m)throw Error('bad field '+f);
    const [,only,type,size,times,name]=m;
    if(only==='11'&&!r.legacy||only==='22'&&r.legacy)continue;
    const one=()=>type==='u'||type==='i'||type==='f'?r[type+size]():type==='b'?r.bytes(+size).toString('hex'):type==='str'?r.str():type==='obj'?r.object(name||'field'):(()=>{throw Error('bad type '+f);})();
    let v;if(times){v=[];for(let i=0;i<+times;i++)v.push(one());}else v=one();
    const k=name||('_'+r.p);if(o[k]!==undefined)o[k+'_'+r.p]=v;else o[k]=v;
  }
}
const L=(spec)=>(r,o)=>seq(r,o,spec);
// moNodeName_c is the feature node. The part's own node (read by moPart_c) is name, a, flags, id, b
// (0x100 in SW2022, 0 in SW2011), and in SW2022 a comment and a u32.
R.moNodeName_c=(r,o)=>{if(r.partNode){r.partNode=false;seq(r,o,'str name, u32 a, u32 flags, u32 id, u32 b, 22:str comment, 22:u32 c');return;}R['@node'](r,o);};
// the part document: u32 (0xb20 SW2022, 0xf80 SW2011), u32 0, u32 version (SW2022 only), then its parts
R.moPart_c=(r,o)=>{seq(r,o,'u32 a, 22:u32 b, 22:u32 version');if(r.legacy)o.header=r.object('part header');r.partNode=true;
  for(const k of ['node','visual','units','unitComponent','slot1','curvature','planeDefaults','hatch','material','modelData','atom','docProperties','environment'])o[k]=r.object('part '+k);
  o.list1=r.object('part list1');   // an empty object list
  // named views: moView_c objects one after another (no count found yet; the reader stops at the first
  // tag that isn't a moView_c), then u8, u32 50, u32 108
  o.views=[];for(;;){const t=r.b.readUInt16LE(r.p);const V=[...r.classes.values()].find(c=>c.name==='moView_c');
    const isView=t===0xffff?r.b.toString('latin1',r.p+6,r.p+14)==='moView_c':V&&t===(0x8000|V.index);if(!isView)break;o.views.push(r.object('view'));}
  seq(r,o,'u8 b, u32 c, u32 d');
  for(const k of ['colors','sketchBlocks','pmark'])o[k]=r.object('part '+k);
  o.more=[];while(r.p<r.b.length)o.more.push(r.object('part member'));};   // thread references, exploded views
// SW2011 document header: authors, a second string array, and the feature log (suObList of moLogs_c)
R.moHeader_c=(r,o)=>{o.authors=r.object('authors');o.s=r.object('header strings');o.logs=r.object('feature log');seq(r,o,'u32 created, u32 nextId, u16 a, u32 stampA');o.doc=r.object('document');
  seq(r,o,'u32 stampB, u32*2 c, u32 rebuilt, b22, u32 saved');o.list=r.object('header list');seq(r,o,'u32 d, u32 version');};
// created: the template's creation time; nextId: the next free feature id; stampA, stampB: the two small counters
// ModelStamps also holds (0x6a, 0x67); rebuilt: the ModelStamps time; version 4700
R.su_CStringArray=(r,o)=>{const n=r.count();o.v=[];for(let i=0;i<n;i++)o.v.push(r.str());};
R.suObList=(r,o)=>{const n=r.count();o.items=[];for(let i=0;i<n;i++)o.items.push(r.object('list item'));};
// one feature's log: its stamps (moStamp_c: u32, u16, unix time, "Created" / "Modified"), u32 position, feature name
R.moLogs_c=(r,o)=>{const n=r.count();o.stamps=[];for(let i=0;i<n;i++)o.stamps.push(r.object('stamp'));o.k=r.u32();o.name=r.str();};
R.moStamp_c=L('u32 a, u16 b, u32 time, str what');
// display properties of the part: colour (0x00bbggrr), material name, appearance file
R.moVisualProperties_c=L(`u32 color, u32 a, u32 b, str s0, str material, f64*4 v, b20, u32*5 c, str s1, u32*4 d, str appearance,
  u8 e, u32 color2, f32*4 f0, f32 f1, f32*4 f2, f32 f3, u32 g, f32 h0, f32 h1, f32*3 h2, b12, str texture,
  u32 color3, f32 k0, f32 k1, str s2, f32*2 k2, u32 m0, u32 m1, f32*11 m2, f32 angle, f32 n0,
  11:f32 n1, 11:str s5, 11:u32*2 q0, 11:str s6, 11:u32*2 q1,
  22:f32*2 n1, 22:str s3, 22:u32 p0, 22:str*3 s4, 22:b92, 22:str s5, 22:u32*2 q0, 22:str s6, 22:u32*2 q1, 22:str s7,
  22:u32 q2, 22:u32 q3, 22:i32 q4, 22:u32*2 q5`);
// SW2011 ends after the second (string, u32, u32) group; SW2022 adds a third group and the fields between them
// units: a counted list of unit objects. Every unit starts with the same 62 bytes: u32 unit (2 = mm),
// u32, f64 rounding step, u32 decimals, u32, f64 (pi/4), four u32, 14 bytes. Some classes add their own fields.
R.moUnitsTable_c=(r,o)=>{const n=r.count();o.units=[];for(let i=0;i<n;i++)o.units.push(r.object('unit'));};
const UNIT='u32 unit, u32 a, f64 round, u32 decimals, u32 b, f64 angle, u32*4 c, 22:b14';   // SW2011: 48 bytes
const unit=(extra)=>(r,o)=>{seq(r,o,UNIT);if(extra)extra(r,o);};
R.moLengthUserUnits_c=unit((r,o)=>{o.e=r.u16();o.dual=r.object('dual units');});   // the second (dual) length unit
R.moAngleUserUnits_c=unit((r,o)=>{o.e=r.u16();});
R.moNumberUserUnits_c=unit();
R.moDensityUnits_c=unit((r,o)=>seq(r,o,'u16 mass, u16 length, u8 e, 22:b6 f'));
for(const c of ['moFloatNumberUserUnits_c','moSpringConstantUnits_c','moStressUnits_c','moGravityUnits_c','moLinearMotorUnits_c','moRotaryMotorUnits_c'])R[c]=unit();
for(const c of ['moUnitSysUnits_c','moForceUnits_c','moPowerUnits_c','moEnergyUnits_c','moTimeUnits_c'])R[c]=unit((r,o)=>{o.e=r.u16();});
R.moFrequencyUserUnits_c=unit();
R.moUnitComponent_c=L('u32 a, u32 b, u16 c');
// curvature display settings: five doubles (1000, 0.025, 4, 1.2, 1) and a FILETIME
R.gcCurvatureObject_c=L('f64*5 v, b8 filetime');
// default size and colours of new reference planes: two u32, two colours, u32 0x5f, u32, u8, six doubles
// (0.005 ×3, 0.01 ×3), 24 bytes, f64, 24 bytes, f64 1000, f64 1e-8, u32 2, u16, two fill patterns
// (0xaaaaaaaa, 0xbbbbbbbb), 92 bytes
R.moTransRefPlaneData_c=L('u32 a, u32 b, u32 color, u32 color2, u32 c, u32 d, u8 e, f64*6 size, b24, f64 f, b24, f64 g, f64 tol, u32 h, 11:b4 i, 22:u16 i, 22:u32 pat1, 22:u32 pat2, 22:b92');   // SW2011 stops after u32 h and 4 bytes
// hatch pattern: name ("ANSI31 (Iron BrickStone)"), angle, scale, f64, u32 1, two i32 -1, u32
R.gcXhatch_c=L('str name, f64 angle, f64 scale, f64 c, u32 d, 22:i32*2 e, 22:u32 f');
// material: the density parameter, u8
R.moMaterial_c=(r,o)=>{o.density=r.object('density');o.a=r.u8();};
// a parameter whose node is written inline: a null node object, then the short node fields without a name
// (u32 a, u32 flags, i32 id = -1, SW2022: u32 b and a comment, u16), then the value (density in kg/m³: 1000)
R.moDensityParameter_c=(r,o)=>{o.node=r.object('parameter node');if(!o.node)seq(r,o,'u32 a, u32 flags, i32 id, 22:u32 b, 22:str comment, u16 d');o.value=r.f64();};
R.uoModelData_c=L('b28, 22:b4, u32 a, u32*2 b, u32 c, u32 d');
// moAtom_c: a null node object and the short node fields inline (u32, flags, i32 -1, u32, comment), three u32,
// u32 kind, u32, two counts, three u32, u32 1, i32 -1, u32, u32 1, u32, u32 6. Kind 102 holds one child atom
// (an object); kind 101 ends with the version (15000), the last id, u32 0x20000000 | n and n records of eight
// u32 (id, type 20 or 8, 0, -1, 1, -1 or 30, 0, 0), newest first
R.moAtom_c=(r,o)=>{o.node=r.object('atom node');seq(r,o,'u32 a, u32 flags, i32 id, u32 b, 22:str s, 22:u32 c0, u32*2 c, u32 kind, u32 d, u32 n1, u32 n2, u32*3 e, u32 f, i32 g, u32 h, u32 k, u32 m, u32 six');
  if(o.kind===102){o.child=r.object('child atom');return;}
  seq(r,o,'u32 version, u32 lastId, u32 count');o.records=[];for(let i=0;i<(o.count&0xffff);i++){const q={};seq(r,q,'u32*8 v');o.records.push(q.v);}};
// Not split yet: the object's data runs to the next class definition. The archive's final index (checked
// against ResolvedFeatures' first index) shows whether such a stretch hid any object.
function opaque(r,o){const def=/\xff\xff[\x00-\x09]\x00[\x05-\x40]\x00[A-Za-z_]/g;def.lastIndex=r.p;const t=r.b.toString('latin1');
  let m,end=r.b.length;while((m=def.exec(t))){const n=r.b[m.index+4];const name=t.substr(m.index+6,n);if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)){end=m.index;break;}}
  o.opaque=r.bytes(end-r.p).toString('hex');o.opaqueLen=o.opaque.length/2;}
// Read a whole Config-0 stream. Returns the part object, the reader and where the index sequence ends: the
// first index of the configuration's ResolvedFeatures stream.
function readConfig0(b){const legacy=b.indexOf(Buffer.from('moHeader_c'))>=0&&b.indexOf(Buffer.from('moHeader_c'))<40;
  const r=new Reader(b,legacy?1:2,{});r.legacy=legacy;const part=r.object('part');return {part,r,next:r.next,end:r.p===b.length};}
module.exports={seq,opaque,readConfig0};
// exploded-view manager (a feature with its node inline): 8 bytes, two i32 -1, u16, u32 20 (28), u32, 16 bytes, u32 101, 8 bytes
R.moPrtExplViewManager_c=(r,o)=>{feature(r,o);seq(r,o,'b8 a, i32*2 b, u16 c, u32 d, u32 e, b16 f, u32 g, b8 h');};
// lights (features: node, then): three intensities (ambient, brightness, specular), colour, four u32, the
// light's name ("Ambient-1"), 12 bytes, f64 1.0, u32 1, f64 16, u32; directional lights add two angles
// (7.1, 7.1) and 16 bytes
const LIGHT='f64*3 v, u32 color, u32 a, u32 b, u32 c, u32 d, str name, b12, f64 e, u32 f, f64 g, u32 h';
R.moAmbientLight_c=(r,o)=>{feature(r,o);seq(r,o,LIGHT);};
R.moDirectionLight_c=(r,o)=>{feature(r,o);seq(r,o,LIGHT+', f64 lon, f64 lat, b16');};
R.moEnvFolder_c=(r,o)=>{feature(r,o);seq(r,o,'22:u32 a, u16 b');};   // "Lights, Cameras and Scene": its lights are the node's children
// a named view ("*Front", "*Isometric" …): name, u8 has-rotation, the 3×3 rotation when set (absent for
// *Normal To and *Front), three doubles, f64 1.0, three doubles, u16, f64 1.0, 3 bytes, i32 -1, f64 -1, u32,
// u32 the view's number (0 *Normal To … 9 *Dimetric), 32 bytes
R.moView_c=(r,o)=>{o.name=r.str();o.hasRot=r.u8();if(o.hasRot)o.rot=[r.vec(),r.vec(),r.vec()];
  seq(r,o,'f64*3 t, f64 s, f64*3 t2, u16 a, f64 scale, b3 b, i32 c, f64 d, u32 e, u32 number, 22:b32');};   // SW2011: no trailing 32 bytes
// Document properties (drafting standard, dimension and note styles, fonts, line styles, unit names).
// Not split yet: its style records embed length-unit objects (each style's dual unit, written as a new
// moLengthUserUnits_c object right after an inline unit). Until the records are decoded, the reader
// steps over the bytes and reads each such object where it sits: a new-object tag of the length-unit
// class followed by a valid unit (u32 unit < 16, u32 1, a finite f64 rounding step).
R.moRelMgr_c=(r,o)=>{const L=[...r.classes.values()].find(c=>c.name==='moLengthUserUnits_c');const tag=L?(0x8000|L.index):-1;
  const end=nextClassDef(r);o.parts=[];o.objects=[];let from=r.p;
  for(let p=r.p;p<end-2;p++){if(r.b.readUInt16LE(p)!==tag)continue;const u=r.b.readUInt32LE(p+2),one=r.b.readUInt32LE(p+6),f=r.b.readDoubleLE(p+10);
    if(u<16&&one===1&&isFinite(f)&&f>0&&f<1e3){o.parts.push(r.bytes(p-r.p).toString('hex'));o.objects.push(r.object('style dual unit'));p=r.p-1;}}
  o.parts.push(r.bytes(end-r.p).toString('hex'));};
function nextClassDef(r){const def=/\xff\xff[\x00-\x09]\x00[\x05-\x40]\x00[A-Za-z_]/g;def.lastIndex=r.p;const t=r.b.toString('latin1');let m;
  while((m=def.exec(t))){const n=r.b[m.index+4];if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(t.substr(m.index+6,n)))return m.index;}return r.b.length;}
R.moFeatColorTab_c=L('u32 a, u16 b, u32 c, b8 d');
// sketch block manager (a feature written with its node inline): GUID, u32, u32 0x62, 6 bytes, then the list
// of annotation views
R.moSketchBlockMgr_c=(r,o)=>{r.nodeNoState=true;feature(r,o);seq(r,o,'b16 guid, u32 a, u32 b, b6 c');o.views=r.object('annotation views');seq(r,o,'u32 nextNumber, u32 d, 22:u32 n');o.numbers=[];for(let i=0;i<(o.n||0);i++)o.numbers.push(r.u32());seq(r,o,'b30 g');};   // SW2011: no numbers list
// annotation view ("*Top", "*Back" …): laid out as a view (its number counts from 200), then 26 bytes, u32 1,
// u16, i32 -1, u32, i32 -1, i32 -1. The sketch block manager follows its list of them with the next number
// (200 + count), u32 199, u32 n and n view numbers (199, 201 …), and 30 bytes.
R.moAnnotationView_c=(r,o)=>{R.moView_c(r,o);seq(r,o,'b26 a, u32 b, 22:u16 c, 22:i32 d, 22:u32 e, 22:i32*2 f');};
// PMI mark record: u32 version (3, or 4 in the upgraded file), u32 1, u32, u32 n and n marks (each a feature
// written with its node inline), u32, u32 20, u32, u32 20, 16 bytes, the list of annotation views ("Notes
// Area"), u32, two strings
const featurePMark=R.moPMarkRecord_c;
R.moPMarkRecord_c=(r,o)=>{if(r.b.readUInt32LE(r.p)>=5)return featurePMark(r,o);   // the per-feature form (see classes.js)
  seq(r,o,'u32 version, u32 b, u32 c, u32 n');o.marks=[];for(let i=0;i<o.n;i++){const q={};feature(r,q);o.marks.push(q);}
  if(r.legacy){o.threads={};seq(r,o.threads,'b7 a, '+THREADS_HEAD+', u16 x, '+THREADS);return;}   // SW2011: the thread settings follow the marks directly
  seq(r,o,'u32 c2, u32 d, u32 e, u32 f, b16 g');o.list=r.object('pmark list');seq(r,o,'u32 h, str s1, str s2');
  if(o.version>=4){o.threads={};seq(r,o.threads,'b11 a, '+THREADS_HEAD+', u16 x, '+THREADS);}};   // version 4 (the upgraded file) carries the thread settings itself
// cosmetic-thread reference manager: 19 bytes, then the thread settings: three u32 1, u32 101, u32 103, f64
// scale (1, or 1000 in the upgraded file), three f64 0.005, tolerances, two strings, a 3×3 identity rotation …
const THREADS_HEAD='u32*3 b, u32 c, u32 d',THREADS='f64 e, f64*3 f, f64*3 g, f64*3 h, f64 k, b16 l, u32 m, b16 n, f64 p, 22:b16 q, 22:str s1, 22:str s2, 22:b28 t, 22:f64*9 rot, 22:u32 u, 22:u32 v, 22:u16 w';   // SW2011 stops after f64 p (0.999)
R.moCThreadRefMgr_c=L('b19 a, '+THREADS_HEAD+', '+THREADS);
