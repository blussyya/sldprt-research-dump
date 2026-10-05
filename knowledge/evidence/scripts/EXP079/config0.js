'use strict';
/* EXP-080 research readers for Config-0, the configuration archive. It is an MFC CArchive like
 * ResolvedFeatures, read from index 2 (index 1 is the document, mapped in advance). Its classes' indices
 * are the "pre-loaded" ones the feature stream refers to (moNodeName_c is the feature node).
 *
 * Layouts are written as field lists: "u32 name", "f64*4 name", "str name", "obj name", "b12" (raw bytes);
 * a field prefixed "22:" is read only in SW2022 files, "11:" only in SW2011 ones. */
const {READ:R,Reader}=require('./archive');require('./classes');
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
R.moPart_c=(r,o)=>{seq(r,o,'u32 a, 22:u32 b, 22:u32 version');if(r.legacy)o.header=r.object('part header');r.partNode=true;o.node=r.object('part node');o.visual=r.object('part visual');};
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
const UNIT='u32 unit, u32 a, f64 round, u32 decimals, u32 b, f64 angle, u32*4 c, b14';
const unit=(extra)=>(r,o)=>{seq(r,o,UNIT);if(extra)extra(r,o);};
R.moLengthUserUnits_c=unit((r,o)=>{o.e=r.u16();o.dual=r.object('dual units');});   // the second (dual) length unit
R.moAngleUserUnits_c=unit((r,o)=>{o.e=r.u16();});
R.moNumberUserUnits_c=unit();
R.moDensityUnits_c=unit((r,o)=>seq(r,o,'b11 e'));
for(const c of ['moFloatNumberUserUnits_c','moSpringConstantUnits_c','moStressUnits_c','moGravityUnits_c','moLinearMotorUnits_c','moRotaryMotorUnits_c'])R[c]=unit();
for(const c of ['moUnitSysUnits_c','moForceUnits_c','moPowerUnits_c','moEnergyUnits_c','moTimeUnits_c'])R[c]=unit((r,o)=>{o.e=r.u16();});
R.moFrequencyUserUnits_c=unit();
R.moUnitComponent_c=L('u32 a, u32 b, u16 c');
// curvature display settings: five doubles (1000, 0.025, 4, 1.2, 1) and a FILETIME
R.gcCurvatureObject_c=L('f64*5 v, b8 filetime');
// default size and colours of new reference planes: two u32, two colours, u32 0x5f, u32, u8, six doubles
// (0.005 ×3, 0.01 ×3), 24 bytes, f64, 24 bytes, f64 1000, f64 1e-8, u32 2, u16, two fill patterns
// (0xaaaaaaaa, 0xbbbbbbbb), 92 bytes
R.moTransRefPlaneData_c=L('u32 a, u32 b, u32 color, u32 color2, u32 c, u32 d, u8 e, f64*6 size, b24, f64 f, b24, f64 g, f64 tol, u32 h, u16 i, u32 pat1, u32 pat2, b92');
// hatch pattern: name ("ANSI31 (Iron BrickStone)"), angle, scale, f64, u32 1, two i32 -1, u32
R.gcXhatch_c=L('str name, f64 angle, f64 scale, f64 c, u32 d, i32*2 e, u32 f');
// material: the density parameter, u8
R.moMaterial_c=(r,o)=>{o.density=r.object('density');o.a=r.u8();};
// a parameter whose node is written inline: a null node object, then the short node fields without a name
// (u32 a, u32 flags, i32 id = -1, SW2022: u32 b and a comment, u16), then the value (density in kg/m³: 1000)
R.moDensityParameter_c=(r,o)=>{o.node=r.object('parameter node');if(!o.node)seq(r,o,'u32 a, u32 flags, i32 id, 22:u32 b, 22:str comment, u16 d');o.value=r.f64();};
R.uoModelData_c=L('b32, u32 a, u32*2 b, u32 c, u32 d');
// moAtom_c: a null node object, u32 1, u32 flags, i32 -1, u32, a string, then 27 u32 / i32 (101, 32, 32,
// 0x74cf twice, 6, version 15000, 10001, 0x20000001, 10001, 20 …)
R.moAtom_c=(r,o)=>{o.node=r.object('atom node');seq(r,o,'u32 a, u32 flags, i32 id, u32 b, str s, u32*27 v');};
// Not split yet: the object's data runs to the next class definition. The archive's final index (checked
// against ResolvedFeatures' first index) shows whether such a stretch hid any object.
function opaque(r,o){const def=/\xff\xff[\x00-\x09]\x00[\x05-\x40]\x00[A-Za-z_]/g;def.lastIndex=r.p;const t=r.b.toString('latin1');
  let m,end=r.b.length;while((m=def.exec(t))){const n=r.b[m.index+4];const name=t.substr(m.index+6,n);if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)){end=m.index;break;}}
  o.opaque=r.bytes(end-r.p).toString('hex');o.opaqueLen=o.opaque.length/2;}
module.exports={seq,opaque};
for(const c of ['moRelMgr_c','moEnvFolder_c','moAmbientLight_c','moDirectionLight_c','moView_c','moFeatColorTab_c','moSketchBlockMgr_c','moAnnotationView_c','moPMarkRecord_c','moCThreadRefMgr_c','moPrtExplViewManager_c'])if(!R[c])R[c]=(r,o)=>opaque(r,o);
