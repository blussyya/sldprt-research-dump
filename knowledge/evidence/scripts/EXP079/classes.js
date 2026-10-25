'use strict';
const {READ,feature}=require('./archive');
const R=READ;
// ---- folders: the feature base, then a class-specific tail ----
R.moCommentsFolder_c=(r,o)=>{feature(r,o);if(!r.legacy)o.x=r.u32();};   // SW2011 folders carry no data of their own
R.moFavoriteFolder_c=(r,o)=>{feature(r,o);o.x=[r.u32(),r.u32(),r.u32()];};
R.moHistoryFolder_c=(r,o)=>{feature(r,o);o.x=r.u32();const n=r.count();o.items=[];for(let i=0;i<n;i++)o.items.push(r.object('history item'));};
R.moHistoryFeatItemData_c=(r,o)=>{o.raw=r.bytes(22).toString('hex');o.comp=r.objectAs('@comp','history comp');};
R.moCompFeature_c=(r,o)=>{o.comp=r.objectAs('@comp','comp');o.feature=r.u32();o.stamp=r.u32();};
// component reference data (pre-loaded class): u16 2, u32 flags, u8, u32 kind (0, or 101 for some
// bodies, faces and edges), u32, 28 bytes, 16 × ff, 20 bytes. The owning class adds its own fields:
// references to features name the feature by id and creation time (unix seconds)
R['@comp']=(r,o)=>{o.v=r.u16();o.flags=r.u32();o.a=r.u8();o.kind=r.u32();o.kind2=r.u32();o.x0=r.bytes(28).toString('hex');
  if(r.legacy)return;   // SW2011 stops here (43 bytes): no 16 × ff, no 20 bytes
  o.ff=r.bytes(16).toString('hex');o.x1=r.bytes(20).toString('hex');
};
R.moSelectionSetFolder_c=(r,o)=>{feature(r,o);o.x=[r.u32(),r.u16(),r.u32()];};
for(const c of ['moSensorFolder_c','moDocsFolder_c','moInkMarkupFolder_c','moEqnFolder_c'])R[c]=(r,o)=>{feature(r,o);if(!r.legacy)o.x=r.u32();};
R.moSurfaceBodyFolder_c=(r,o)=>{feature(r,o);o.x=r.bytes(r.legacy?10:16).toString('hex');};
R.moSolidBodyFolder_c=(r,o)=>{feature(r,o);o.x=r.bytes(r.legacy?10:16).toString('hex');o.body=r.object('solid body folder');};
R.moMaterialFolder_c=(r,o)=>{feature(r,o);if(!r.legacy)o.x0=r.u32();o.material=r.str();if(!r.legacy)o.x=r.u32();};   // SW2011: just the name
R.moRefPlane_c=(r,o)=>{feature(r,o);o.x=r.bytes(r.legacy?140:150).toString('hex');o.data=r.object('ref plane data');};
// default plane: origin, normal, optional 3×3 rotation (Top and Right have one, Front doesn't), then display data
R.moDefaultRefPlnData_c=(r,o)=>{o.origin=r.vec();o.normal=r.vec();o.hasRot=r.u8();if(o.hasRot)o.rot=[r.vec(),r.vec(),r.vec()];o.v=r.vec();o.display=r.bytes(r.legacy?88:96).toString('hex');};
// profile features (the Origin, sketches): node, 10 bytes, the sketch, then i32, u32, u32 (101 Origin, 102 sketch), 12 bytes
// profile tail: i32, u32, u32 (101 Origin, 102 sketch), u32, u16 n and n objects (cube.SLDPRT has one), u16 m and
// m edges, then u32 (not in SW2011)
// types 103 and 109 (Helical Bevel Gear's Sketch2 and Sketch4) have u16 18 and a moContourChooser_c in place of the u32 and
// list; 102 and 104 (Sketch9) have the list. Fitted as odd types above 101
function profileTail(r,o){o.t=[r.i32(),r.u32(),r.u32()];if(o.t[2]>101&&(o.t[2]&1)){o.t1=r.u16();o.chooser=r.object('contour chooser');o.t2=r.bytes(6).toString('hex');return;}o.t1=r.u32();const n=r.u16();o.objs=[];for(let i=0;i<n;i++)o.objs.push(r.object('profile object'));
  // then the edges, named by trimmed segments (four in Helical Bevel Gear's Sketch9), and u32 (not in SW2011): the 6 bytes of earlier files
  {const m=r.u16();o.edges=[];for(let i=0;i<m;i++)o.edges.push(r.object('profile edge'));}if(!r.legacy)o.t2=r.u32();}
// contour chooser (Helical Bevel Gear): u16 0, u32 1, u32 the owning profile feature's archive index (513, 976), 14 bytes
R.moContourChooser_c=(r,o)=>{o.a=[r.u16(),r.u32()];o.owner=r.u32();o.x0=r.bytes(14).toString('hex');};
R.moOriginProfileFeature_c=(r,o)=>{feature(r,o);o.x=r.bytes(10).toString('hex');o.sketch=r.object('origin sketch');profileTail(r,o);};
R.moProfileFeature_c=(r,o)=>{feature(r,o);o.x=r.bytes(10).toString('hex');o.sketch=r.object('sketch');profileTail(r,o);};
// the Annotations folder: u16, two doubles (1.0, 1.0), 10 bytes
R.moDetailCabinet_c=(r,o)=>{feature(r,o);o.a=r.u16();o.scale=[r.f64(),r.f64()];if(!r.legacy)o.x=r.bytes(10).toString('hex');};   // SW2011: nothing after the doubles
// the closing note ('…___EndTag___') carries the opening note, 32 bytes of settings and itself
R.moNotesAreaFtrFolder_c=(r,o)=>{feature(r,o);o.x0=r.u32();if(/___EndTag___$/.test(o.name)){o.open=r.object('notes open');o.x=r.bytes(32).toString('hex');o.self=r.object('notes self');}};
// ---- sketches (EXP-079) ----
// shared graphics/attribute block of sketch objects: 35 bytes, one object pointer (an external
// reference such as "coincident with the Origin", else null), 27 bytes
function attrs(r){const a={};a.x0=r.bytes(35).toString('hex');a.ext=r.object('entity external ref');a.x1=r.bytes(r.legacy?19:27).toString('hex');return a;}   // SW2011 lacks 8 zero bytes after the f64 1.0
// sketch point: u16 q (1 = tied to outside geometry), u32 r, u32 id, attribute block, u16 kind,
// x, y, u16 flags, u16 number of entities using it, up to two of their handles, u16 number of arcs
// centred on it, i32 -2, 36 bytes
function sketchPoint(r){const p={};p.q=r.u16();p.r=r.u32();p.id=r.u32();p.attrs=attrs(r);p.kind=r.u16();p.x=r.f64();p.y=r.f64();
  p.flags=r.u16();p.uses=r.u16();p.h=[r.object('point handle 1'),r.object('point handle 2')];p.centreOf=r.u16();p.m2=r.i32();p.x1=r.bytes(36).toString('hex');return p;}
// line / arc: u32 p, u32 id, attribute block, u16 start, u16 end, u16 a (0 = construction), u16 b,
// f64 -1, u32 type; arcs add u16 centre, four i32 -2 and a u16. Which list the entity is in decides the layout,
// not the type: arcs have type 1, or -1 in Helical Bevel Gear's Sketch2; lines 0, 0x10000 or 0x20000
function segment(r,arc){const g={};g.p=r.u32();g.id=r.i32();g.attrs=attrs(r);g.s=r.u16();g.e=r.u16();g.a=r.u16();g.b=r.u16();g.m1=r.f64();g.type=r.u32();
  if(arc){g.centre=r.u16();g.x1=[r.i32(),r.i32(),r.i32(),r.i32()];g.x2=r.u16();}return g;}
// relations, grouped by how many entities they constrain: u16 count, then per relation 8 bytes,
// i32 -1, 16 bytes, u32 type (swConstraintType_e), u32 2, u16 0, i16 -2, u16 0, the entity handles,
// and for two-entity relations 8 bytes, two i32 -1 and 24 bytes; three-entity relations (Helical Bevel Gear's
// Sketch2: symmetric, type 11, two points and a line) end with 6 bytes
function relations(r,k,extra){const n=r.u16(),out=[];for(let i=0;i<n;i++){const q={};q.x0=r.bytes(8).toString('hex');q.m1=r.i32();q.x1=r.bytes(r.legacy?14:16).toString('hex');
  q.type=r.u32();q.two=r.u32();if(r.legacy)q.x2b=r.u16();q.x2=[r.u16(),r.i16(),r.u16()];q.h=[];for(let j=0;j<k;j++)q.h.push(r.object('relation entity'));  if(k===2){q.x3=r.bytes(8).toString('hex');q.m2=[r.i32(),r.i32()];q.x4=r.bytes(24).toString('hex');}if(k===3)q.x3=r.bytes(6).toString('hex');if(extra)q.x5=r.bytes(extra).toString('hex');out.push(q);}return out;}
// circular sketch pattern (Helical Bevel Gear's Sketch2, 8 copies): u32 23, u32 24, u32 1, 6 bytes, u16 8, u16 8,
// 24 bytes, a line handle, 4 bytes, a line handle, 6 bytes, an arc handle, 8 bytes, the centre point's handle, u32 1,
// u16, the count dimension (sgCircularPattCntDim). The relations between the copies follow the sketch's patterns
// (each a two-entity relation and 20 bytes). The three handles before the point carry id 0x777f; fields named by position
function sketchPattern(r){const q={};q.a=[r.u32(),r.u32(),r.u32()];q.x0=r.bytes(6).toString('hex');q.n=[r.u16(),r.u16()];q.x1=r.bytes(24).toString('hex');
  q.h=[];q.h.push(r.object('pattern handle 1'));q.x2=r.bytes(4).toString('hex');q.h.push(r.object('pattern handle 2'));q.x3=r.bytes(6).toString('hex');
  q.h.push(r.object('pattern handle 3'));q.x4=r.bytes(8).toString('hex');q.centre=r.object('pattern centre');q.b=[r.u32(),r.u16()];q.count=r.object('pattern count dim');return q;}
// pre-loaded list class (probably suObList from Config-0): u16 count + objects
R['@oblist']=(r,o)=>{const n=r.count();o.items=[];for(let i=0;i<n;i++)o.items.push(r.object('oblist item'));};
R.sgPointHandle=(r,o)=>{o.id=r.u16();o.a=r.i32();if(!r.legacy)o.b=r.u32();};   // SW2011 handles have no u32
function list(r,item){const n=r.u16(),x=r.u32(),items=[];for(let i=0;i<n;i++)items.push(item(r));return {x,items};}
R.sgLineHandle=R.sgPointHandle;
R.sgArcHandle=R.sgLineHandle;
R.sgSketch=(r,o)=>{const n=r.u16();o.x0=r.u16();o.points=[];for(let i=0;i<n;i++)o.points.push(sketchPoint(r));
  o.lines=list(r,segment);o.x1=r.bytes(6).toString('hex');o.arcs=list(r,r=>segment(r,true));
  o.x2=r.bytes(30).toString('hex');   // further entity lists, empty in every file so far
  // two lists of sketch dimensions: diameters (sgCircleDim), then distances (sgPntPntDist …). The diameter count
  // used to be read as the last two bytes of the block above; Helical Bevel Gear's Sketch2 is the first with any
  {const n=r.u16();o.diams=[];for(let i=0;i<n;i++)o.diams.push(r.object('sketch diameter'));}
  {const n=r.u16();o.dims=[];for(let i=0;i<n;i++)o.dims.push(r.object('sketch dimension'));}
  // two more dimension lists (the 4 bytes that used to follow): the first empty everywhere so far, the second offsets
  // (sgOffsetDim, Helical Bevel Gear's Sketch4)
  {const n=r.u16();o.dims3=[];for(let i=0;i<n;i++)o.dims3.push(r.object('sketch dimension 3'));}
  {const n=r.u16();o.offsets=[];for(let i=0;i<n;i++)o.offsets.push(r.object('sketch offset'));}
  o.rel1=relations(r,1);o.rel2=relations(r,2);o.rel3=relations(r,3);   // the three-entity count was the first u16 of 12 bytes
  // three u16, the circular sketch patterns (u16 n), the relations that tie the pattern's copies (u16 n): 10 zero
  // bytes in every controlled model
  o.x3=[r.u16(),r.u16(),r.u16()];{const n=r.u16();o.patterns=[];for(let i=0;i<n;i++)o.patterns.push(sketchPattern(r));}o.patRel=relations(r,2,20);
  o.list1=r.objectAs('@oblist','sketch list 1');
  o.x4=r.bytes(r.legacy?8:12).toString('hex');o.c=[r.u16(),r.u16()];
  o.nextIds=[];for(let i=0;i<(r.legacy?13:14);i++)o.nextIds.push(r.u32());   // SW2011 counts 13 entity kinds   // next free id per entity kind (C00 Sketch1: 5, 6 points, 5 lines, 1 …)
  o.y=r.legacy?[r.u32(),r.u32(),r.u32(),r.u16()]:[r.u32(),r.u32(),r.u32(),r.u32()];o.name=r.str();o.z=[r.u16(),r.f32(),r.i32(),r.u32(),r.i32()];
  o.x5=r.bytes(24).toString('hex');o.v=[r.u32(),r.u32()];o.x6=r.bytes(28).toString('hex');
  o.regions=r.objectAs('@oblist','sketch regions');o.x6b=r.bytes(r.legacy?10:30).toString('hex');
  // chains (closed contours): u32 count, u32 (same as count in every file), then per chain the chain object and 38 bytes
  const nc=r.u32();o.nc2=r.u32();o.chains=[];for(let i=0;i<nc;i++){const c=r.object('sketch chain');c.after=[r.u32(),r.u32(),r.bytes(4).toString('hex'),r.u16(),r.i32()];c.after2=r.bytes(20).toString('hex');o.chains.push(c);}
  o.x9=r.u32();o.onPlane=r.u8();
  if(!o.onPlane){   // sketch on a face: the face geometry as an embedded, zlib-compressed Parasolid transmit file
    o.f=[r.u32(),r.u8(),r.u32()];o.guid=r.bytes(16).toString('hex');o.rawSize=r.u32();const n=r.u32();o.parasolid=r.bytes(n);
    o.g0=r.bytes(12).toString('hex');const ne=r.u16();o.faceEdges=[];for(let i=0;i<ne;i++)o.faceEdges.push(r.object('face edge'));
    o.k=[r.u32(),r.u32(),r.u32()];const nk=r.u32();o.edgeIdx=[];for(let i=0;i<nk;i++)o.edgeIdx.push(r.u32());o.k2=r.u32();}   // u32 4, 16, 1, then the count (C18 has 4 of both, the gear's Sketch2 1)
  else o.x10=r.bytes(10).toString('hex');
  o.x11=[r.u32(),r.u16()];o.axis=r.object('sketch axis');   // u32 100000; the centreline handle a revolve uses (null otherwise)
  
  o.plane=r.object('sketch plane');
  // placement on the plane: u16, u32 (3, or 2), u8 has-rotation, 3×3 rotation (Top: [[1,0,0],[0,0,1],[0,−1,0]]),
  // 24 bytes, f64 1.0, 3 bytes, u32 4
  // sketch on a face: a hidden plane feature, then the placement: u32, u8 has-rotation and the rotation (Helical Bevel Gear's
  // Sketch9), the offset along the normal as a vector (C18: (0, 0, -0.01)), f64 scale, u8, u32 1, 23 bytes, f64 1.0, u8, u32 4
  if(!o.onPlane){o.facePlane=r.object('face sketch plane');
    o.pl=r.u32();o.hasRot=r.u8();if(o.hasRot)o.rot=[r.vec(),r.vec(),r.vec()];o.offset=r.vec();o.scale=r.f64();o.pl1=[r.u8(),r.u32()];o.pl2=r.bytes(23).toString('hex');o.s2=r.f64();o.pl3=[r.u8(),r.u32()];}
  else{o.pl=[r.u16(),r.u32()];o.hasRot=r.u8();if(o.hasRot)o.rot=[r.vec(),r.vec(),r.vec()];o.pl1=r.bytes(24).toString('hex');o.scale=r.f64();o.pl2=r.bytes(3).toString('hex');o.pl3=r.u32();}};
// a closed region of the sketch: its boundary handles
R.moSketchRegion_c=(r,o)=>{o.edges=r.objectAs('@oblist','region edges');};
// chain: u16 n, the entities' P numbers, u16, u32 (1 for a single closed curve), u32 6, i32 -1, 8 bytes
R.moSketchChain_c=(r,o)=>{const n=r.u16();o.ents=[];for(let i=0;i<n;i++)o.ents.push(r.u32());o.a=r.u16();o.b=r.u32();o.c=r.u32();o.d=r.i32();o.x0=r.bytes(8).toString('hex');};
// reference to a plane feature: component object, the plane's feature id and creation time. What
// follows belongs to the owner (the sketch: its placement on the plane)
R.moCompRefPlane_c=(r,o)=>{o.comp=r.objectAs('@comp','plane comp');o.feature=r.u32();o.stamp=r.u32();};
// a sketch entity tied to outside geometry: sgExtEnt_c → moSketchExtRef_w → the referenced entity
// (moCompSketchEntHandle_c: the owning feature as a component object, the entity handle, 10 bytes; or a model
// edge, moCompEdge_c), 52 bytes (u32 0x66/0x6a, three i32 -12345, version 15000)
// and a backed-up copy of it (moPointBackedUpData_c: 30 bytes and its name, e.g. "Point1@Origin")
R.sgExtEnt_c=(r,o)=>{o.ref=r.object('ext ref');};
R.moSketchExtRef_w=(r,o)=>{o.ent=r.object('ext entity');if(o.ent&&o.ent.class==='moCompEdge_c')o.e0=[r.u32(),r.u16()];extRefTail(r,o);};   // an edge adds u32, u16
// the 52 bytes after a referenced entity: u16 0, u32 0x66/0x6a, 12 bytes, three i32 -12345, u32 0, u32 version (offset 34),
// 14 bytes. Version 15000 (SW2022) follows with a backed-up copy object; version 4700 (made in SW2011) has
// no object, only 8 bytes and the entity's name ("Point1@Origin")
// SW2011 writes a 34-byte block (two i32 -12345, version 4700 at offset 30), 10 bytes and the name.
function extRefTail(r,o){const at=r.p;
  if(r.legacy){o.x0=r.bytes(34).toString('hex');o.version=r.b.readUInt32LE(at+30);o.x1=r.bytes(10).toString('hex');o.name=r.str();return;}
  o.x0=r.bytes(52).toString('hex');o.version=r.b.readUInt32LE(at+34);
  if(o.version>=15000)o.backup=r.object('ext backup');else{o.old=[r.u32(),r.u32()];o.name=r.str();}}
R.moCompSketchEntHandle_c=(r,o)=>{o.comp=r.objectAs('@comp','ext comp');o.feature=r.u32();o.stamp=r.u32();o.handle=r.object('ext handle');o.x0=r.bytes(10).toString('hex');};
R.moPointBackedUpData_c=(r,o)=>{o.p=r.vec();o.next=r.object('point next');o.a=r.u32();o.name=r.str();};
// header shared by features that make or change a body (extrude, cut, revolve, loft): u32, u16, u32;
// (u16 1, u16 code 0x3a/0x3b), u32 n and n more such pairs (cuts add 0x3b), u16; u32, u32 (101 boss, 102 cut), u32 3;
// the bodies acted on (u32 count; per body u16, the body, u32 n and n kinds (101 in the controlled cuts, 103 and 101 in Helical
// Bevel Gear's Boss-Extrude3), the creating feature's id, u32, u32);
// u32 1, u16, u16
function bodyHeader(r,o,h0){o.h0=h0?h0(r):[r.u32(),r.u16(),r.u32()];o.codes=[[r.u16(),r.u16()]];const nc=r.u32();for(let i=0;i<nc;i++)o.codes.push([r.u16(),r.u16()]);o.z=r.u16();
  o.h1=[r.u32(),r.u32(),r.u32()];const n=r.u32();o.scope=[];for(let i=0;i<n;i++){const e={a:r.u16(),body:r.object('scope body')};const k=r.u32();e.kinds=[];for(let j=0;j<k;j++)e.kinds.push(r.u32());e.x=[r.u32(),r.u32(),r.u32()];o.scope.push(e);}
  o.h2=[r.u32(),r.u16(),r.u16()];}
// after the owner: u32 n, u16, u16, n further groups (chooser, u16, u16, bounding box, u16), u32, u32. 16 zero
// bytes in every controlled model; Helical Bevel Gear's Revolve1 has one group (fitted on that one feature).
// The face references in these choosers list their reps as chains: each rep with its children flattened, one
// null-terminated list per rep, ended by an empty list (the main chooser writes the reps once, children inside)
function extraGroups(r,o){o.ng=r.u32();o.g0=[r.u16(),r.u16()];o.groups=[];
  for(let i=0;i<o.ng;i++){r.repChains=true;let g;try{g={bodies:r.object('group chooser')};}finally{r.repChains=false;}
    g.y0=[r.u16(),r.u16()];g.bbox=r.object('group bbox');g.y1=r.u16();o.groups.push(g);}
  o.g1=[r.u32(),r.u32()];}
R.moExtrusion_c=(r,o)=>{feature(r,o);bodyHeader(r,o);o.bodies=r.object('per body chooser');
  o.y0=[r.u16(),r.u16()];o.bbox=r.object('bbox');o.y1=[r.u16(),r.u32()];o.owner=r.object('extrusion owner');extraGroups(r,o);o.y3=r.u32();
  o.spec=r.objectAs('moPMarkRecord_c','extrusion spec');
  o.endSpec=r.object('end spec');
  // u8 flag (1 in the cube models, 0 in C19); when set, u16, u32 1 and 36 bytes follow
  o.flag=r.u8();if(o.flag){o.x4=[r.u16(),r.u32()];o.x5=r.bytes(36).toString('hex');}o.x6=r.bytes(19).toString('hex');o.x7=r.u32();o.x8=r.bytes(r.legacy?4:8).toString('hex');
  o.from=r.object('from end spec');
};
R.moFromEndSpec_c=(r,o)=>{o.x0=r.bytes(32).toString('hex');};
// bounding box of what the feature made: u32 1, centre, diagonal, u32, u32, u32 n + n × u32 (n = 1 for
// the cube boss, 0 for the cut), u16, the feature
R.moBBoxCenterData_c=(r,o)=>{o.a=r.u32();o.centre=r.vec();o.diagonal=r.f64();o.b=[r.u32(),r.u32()];const n=r.u32();o.list=[];for(let i=0;i<n;i++)o.list.push(r.u32());o.c=r.u16();
  // Helical Bevel Gear's Cut-Extrude1 has a GUID string and 6 bytes here, with nothing before it that counts it. A Unicode
  // CString starts FF FE FF, which as a tag would be a new object of class 32511, so the peek can't misread a real owner
  if(r.b[r.p]===0xff&&r.b[r.p+1]===0xfe&&r.b[r.p+2]===0xff){o.guid=r.str();o.g=r.bytes(6).toString('hex');}
  o.owner=r.object('bbox owner');};
// the data object every feature carries is a moPMarkRecord_c (its class comes from Config-0: 102 in most SW2022
// files, 160 in C22). Inside a feature it has version 5–10 and 62 bytes after it (58 in SW2011); the
// version 3/4 form Config-0 itself writes is read in config0.js
// SW2022: 44 bytes, u32 n, n × (u32 kind, string), 14 bytes. n is 0 in every controlled model; Helical Bevel Gear's
// Revolve1 has one entry, kind 101 with a GUID string
R.moPMarkRecord_c=(r,o)=>{o.version=r.u32();if(r.legacy){o.x0=r.bytes(58).toString('hex');return;}
  o.x0=r.bytes(44).toString('hex');const n=r.u32();o.entries=[];for(let i=0;i<n;i++)o.entries.push({kind:r.u32(),s:r.str()});o.x1=r.bytes(14).toString('hex');};
R.moPerBodyChooserData_c=(r,o)=>{const n=r.u16();o.faces=[];for(let i=0;i<n;i++)o.faces.push(r.object('chooser face'));};
// Helical Bevel Gear's Cut-Extrude1: written as the plain one (no file name in it)
R.moPerBodyChooserDataWithFileName_c=R.moPerBodyChooserData_c;
// a face or edge picked by name: u32 1, u32 0, u32 kind (6 face, 4 edge), u8, u16 (3 face, 2 edge), u8,
// u32 (an edge's Parasolid tag?), two copies of a
// 64-bit value, u16, the naming tree, 20 bytes
// face tail: 18 bytes, 16 when kind is 1 (the sphere's single face); why is open
// edge tail: 14 bytes in SW2022, a u16 in SW2011. (The u32 + u16 that follow a fillet's edge and an edge a
// sketch is tied to belong to Fillet_c and moSketchExtRef_w: a chamfer's edge or a dimension's edge with
// the same tag doesn't have them in SW2011.)
function topoRef(r,o){const at0=r.p;o.a=[r.u32(),r.u32()];o.kind=r.u32();o.b=r.u8();o.c=r.u16();o.c2=r.u8();o.tag=r.u32();o.key=[r.bytes(8).toString('hex'),r.bytes(8).toString('hex')];o.e=r.u16();if(o.class==='moFaceRef_c'){o.reps=nullList(r,'face rep');if(r.repChains){o.chains=[o.reps];for(;;){const l=nullList(r,'face rep chain');if(!l.length)break;o.chains.push(l);}}o.x1=r.bytes((o.kind===1?-2:0)+(r.legacy?6:18)).toString('hex');}else{o.rep=r.object('edge rep');o.x1=r.bytes(r.legacy?2:14).toString('hex');}}
// objects up to a null
function nullList(r,w){const out=[];for(;;){const x=r.object(w);if(!x)return out;out.push(x);}}
R.moFaceRef_c=topoRef;R.moEdgeRef_c=topoRef;
// how a face is named: a tree of surface-id representations, each pointing at the feature that made
// the face (moFR_c: the document/config object, feature id, feature creation time, sketch entity id)
R.moEndFaceSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.endIndex=r.u32();o.b=r.u32();o.child=r.object('surf child');};
R.moFromSktEntSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.entity=r.u32();o.child=r.object('surf child');};
// "3Int" variants carry three integers: side face (entity, −1, 0 in C04), cap face (end, b, c)
R.moFromSktEnt3IntSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.ints=[r.i32(),r.i32(),r.i32()];
  if(r.patRep){r.patRep=false;o.instance=[r.u32(),r.u32()];}o.child=r.object('surf child');};
// a face of a circular pattern instance (Helical Bevel Gear's Cut-Extrude1): context, moFR_c (the pattern), the seed
// face's rep. When that rep is a 3Int one it has two more u32 after its ints (12, 0 and 11, 0 here: the same number
// as the sketch entity of the rep under it)
R.moCirPatternSurfIdRep2_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');r.patRep=true;try{o.child=r.object('surf child');}finally{r.patRep=false;}};
R.moEndFace3IntSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.endIndex=r.u32();o.b=r.u32();o.c=r.i32();o.child=r.object('surf child');};
// context, moFR_c, the reps (as many as the applied feature's n − 1: one in the controlled fillets and chamfer, two in Helical
// Bevel Gear's Chamfer2), then u16 n and n edges. The count used to read as a reference to object 1
R.moSurfaceIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');const k=r.surfReps!==undefined?r.surfReps:1;r.surfReps=undefined;
  o.items=[];for(let i=0;i<k;i++)o.items.push(r.object('surf rep'));const n=r.u16();o.edges=[];for(let i=0;i<n;i++)o.edges.push(r.object('surf edge'));};
R.moFilletSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.a=r.u32();};
R.moFR_c=(r,o)=>{o.ext=r.objectAs('moExtObject_c','fr ext');   // in SW2011 files the document object is pre-loaded from Config-0
  o.feature=r.u32();o.stamp=r.u32();};
// the document a reference lives in: two string handles (path, document name), u8, u16, creation
// time, three strings, 18 bytes, configuration name, 12 bytes
// SW2011: one string and 16 bytes where SW2022 has three strings, u16 0 and the same 16 bytes (the path strings are Config-0 objects there)
R.moExtObject_c=(r,o)=>{o.h=[r.object('ext path'),r.object('ext doc')];o.a=[r.u8(),r.u16()];o.stamp=r.u32();if(r.legacy){o.s=[r.str()];o.x0=r.bytes(16).toString('hex');}else{o.s=[r.str(),r.str(),r.str()];o.x0=r.bytes(18).toString('hex');}o.config=r.str();o.x1=r.bytes(12).toString('hex');};
R.moCStringHandle_c=(r,o)=>{o.s=r.str();};
// ---- end conditions and dimensions (EXP-079) ----
const peek=(r,n)=>r.b.subarray(r.p,r.p+(n||80)).toString('hex');
// end condition: 24 bytes, the depth dimension, and the second direction's dimension (null when
// there is none; C20 has both)
R.moEndSpec_c=(r,o)=>{o.x0=r.bytes(24).toString('hex');o.dim=r.object('end spec dim');o.dim2=r.object('end spec dim 2');};
// a displayed dimension (SW2022 sizes): 556 bytes of annotation settings, the handle to the dimension
// and its value, 587 bytes of placement, a favourites handle, 428 bytes. Where the placement data
// belongs (handle, dimension or display) is not settled yet; the sizes hold on every SW2022 file.
// placement data after the dimension's value: its length varies with the geometry measured (587 bytes
// for the cube extrusions, 515 for the cylinder ones, 541 for fillet radii); not decoded yet, so the
// reader goes to the favourites handle that follows it
const FAV_SIG=Buffer.from('00000000ffffffff','hex');
// The settings hold, at offset 151, the annotation views the dimension is shown in (u32 n, n view numbers from 200): one in every
// controlled model, none for two of Helical Bevel Gear's CirPattern1 dimensions
function displayDim(r,o,x,x2011){o.x0=r.bytes(151).toString('hex');const nv=r.u32();o.views=[];for(let i=0;i<nv;i++)o.views.push(r.u32());
  o.x0b=r.bytes(r.legacy?374-159:556-159).toString('hex');   // SW2022 inserts 182 bytes at offset 236
  o.handle=r.object('display dim handle');o.x1=r.skipToObject('moFavoriteHandle_c',FAV_SIG);o.x1len=o.x1.length/2;
  o.fav=r.object('display dim favourite');o.x2=r.bytes(r.legacy?(x2011||248):374).toString('hex');}   // SW2011: 126 bytes fewer after offset 240
R.moDisplayDistanceDim_c=(r,o)=>{displayDim(r,o,587);o.x3=r.bytes(54).toString('hex');};
// a sketch dimension shown as a diameter about a revolve axis (Helical Bevel Gear): the common display layout,
// then 246 bytes (f64 −1 at 128, 1.0 at 152, then what look like two directions and a point; not split yet)
R.moDisplayRevolveDim_c=(r,o)=>{displayDim(r,o);o.x3=r.bytes(246).toString('hex');};
// the circular sketch pattern's count, displayed: the common layout and nothing after it
R.moDisplayCircularPattCntDim_c=(r,o)=>{displayDim(r,o);};
// radius dimension: as above, then 124 bytes, the edge it measures, ...
// A sketch radius (moSkDimHandleRadial_c, Helical Bevel Gear) has no edge: the next object in the list follows the 124 bytes
R.moDisplayRadialDim_c=(r,o)=>{displayDim(r,o,541);o.x3=r.bytes(r.legacy?122:124).toString('hex');if(!(o.handle&&o.handle.class==='moSkDimHandleRadial_c'))o.edge=r.object('radial dim edge');};
R.ThreeDRadiusDim_c=(r,o)=>{o.a=r.u32();o.param=r.object('dim parameter');};
R.edgeRadiusObject_c=(r,o)=>{o.dim=r.object('edge radius dim');};
// an edge: component object, u8, the edge reference (often a back-reference to the one the feature named),
// a second object slot (null so far), 60 bytes
R.moCompEdge_c=(r,o)=>{o.comp=r.objectAs('@comp','edge comp');o.a=r.u8();o.edge=r.object('edge ref');o.x0=r.bytes(62).toString('hex');};
R.moFavoriteHandle_c=(r,o)=>{o.a=r.u32();o.b=r.i32();};
R.moFeatureDimHandle_c=(r,o)=>{o.x0=r.bytes(r.legacy?63:103).toString('hex');o.dim=r.object('dim');};
// a displayed sketch dimension (Helical Bevel Gear): the same 103 bytes, then the sketch it belongs to
R.moSkDimHandleValG2_c=(r,o)=>{o.x0=r.bytes(r.legacy?63:103).toString('hex');o.sketch=r.object('dim sketch');};
R.moSkDimHandleRadial_c=R.moSkDimHandleValG2_c;R.moSkDimHandleCircularPattCnt_c=R.moSkDimHandleValG2_c;   // the same, for a radius and a pattern count
R.ParallelPlaneDistanceDim_c=(r,o)=>{o.a=r.u32();o.param=r.object('dim parameter');};
// a dimension's value: the short node form (name, id -1), then the value in metres or radians
R.moLengthParameter_c=(r,o)=>{o.node=r.object('parameter node');o.value=r.f64();};
R.moAngleParameter_c=R.moLengthParameter_c;
// a count (the circular sketch pattern's instance count in Helical Bevel Gear): the short node, then u32 value
R.moIntegerParameter_c=(r,o)=>{o.node=r.object('parameter node');o.value=r.u32();};
// cut-extrude (ICE): laid out as the extrusion, with the cut body in the header's scope list
R.moICE_c=(r,o)=>R.moExtrusion_c(r,o);
// a solid body, named by one of its faces: component object, face reference
R.moCompSolidBody_c=(r,o)=>{o.comp=r.objectAs('@comp','body comp');o.face=r.object('body face');};
// applied features (fillet, chamfer, shell): node, 58 bytes, the pre-loaded data object, u32, ...
function applied(r,o){feature(r,o);o.x0=r.bytes(58).toString('hex');o.data=r.objectAs('moPMarkRecord_c','feature data');o.n=r.u32();r.surfReps=o.n-1;o.target=r.object('applied target');r.surfReps=undefined;}
R.Fillet_c=(r,o)=>{applied(r,o);o.t0=[r.u32(),r.u16()];o.edges=r.object('fillet edges');o.lists=[r.object(),r.object(),r.object()];o.x1=r.bytes(12).toString('hex');o.radii=r.object('fillet radii');
  o.y0=[r.u32(),r.u8()];o.list4=r.object('fillet list 4');o.y1=r.bytes(8).toString('hex');o.y2=r.bytes(4).toString('hex');o.y3=r.bytes(9).toString('hex');
  o.rho=[r.f64(),r.f64()];o.y4=[r.u8(),r.bytes(6).toString('hex'),r.u32()];o.y5=r.bytes(10).toString('hex');o.y6=r.u32();o.face=r.object('fillet face');
  o.edge2=r.object('fillet edge 2');o.z00=[r.u32(),r.u16()];o.z0=[r.u32(),r.i32(),r.i32(),r.u32(),r.u32(),r.u32(),r.u32(),r.u32()];o.radius=r.f64();o.edge3=r.object('fillet edge 3');o.z2=[r.u32(),r.u16()];
  o.tags=[r.u32(),r.u32(),r.u32(),r.u32(),r.u32()];if(!r.legacy)o.z1=r.bytes(16).toString('hex');};
// a face: component object, u8, the face reference, a second object slot (null so far)
R.moCompFace_c=(r,o)=>{o.comp=r.objectAs('@comp','face comp');o.a=r.u8();o.face=r.object('face ref');o.b=r.object('face 2');};
R.Chamfer_c=(r,o)=>{applied(r,o);o.edges=r.object('chamfer edges');o.lists=[r.object(),r.object()];o.dim=r.object('chamfer dim');o.dim2=r.object('chamfer dim 2');o.c0=[r.u8(),r.u16(),r.u16()];o.edge=r.object('chamfer edge');o.c1=[r.u32(),r.u32(),r.u32(),r.u16()];o.tags=[r.u32(),r.u32(),r.u32(),r.u32(),r.u32()];o.c2=r.bytes(19).toString('hex');if(!r.legacy)o.c3=r.u8();};
R.moShell_c=(r,o)=>{applied(r,o);o.dim=r.object('shell dim');o.s0=r.u8();o.lists=[r.object(),r.object()];o.edge=r.object('shell edge');o.s1=r.u16();};
R.moRevolution_c=(r,o)=>{feature(r,o);bodyHeader(r,o);o.bodies=r.object('per body chooser');
  o.y0=[r.u16(),r.u16()];o.bbox=r.object('bbox');o.y1=[r.u16(),r.u32()];o.owner=r.object('revolve owner');extraGroups(r,o);o.y3=r.u32();
  o.spec=r.objectAs('moPMarkRecord_c','revolve spec');o.r0=[r.u8(),r.u32(),r.u32()];o.list=r.object('revolve list');o.r1=[r.u32(),r.u32()];o.axis=r.object('revolve axis');o.endSpec=r.object('revolve end');o.t=r.u32();};
// a model edge (CirPattern1's axis) adds u32, u16 after it, as in moSketchExtRef_w; its doubles there are 1, (0, 0, -0.133), (0, 0, -1)
// a reference to a sketch line (the revolve axis): the entity handle, 6 bytes, seven doubles (C13: 0.01, 0, 0,
// 0, 0, 1, 0; C17: 0.006, 0, −0.003, 0, 0, 1, 0: the line's length, then where it starts?), a byte
R.moLineRef_w=(r,o)=>{o.ent=r.object('line ref');if(o.ent&&o.ent.class==='moCompEdge_c')o.e0=[r.u32(),r.u16()];o.g=r.bytes(r.legacy?34:52).toString('hex');o.x0=r.bytes(r.legacy?8:6).toString('hex');   // SW2011: the 34-byte version block, 8 bytes
  o.v=[];for(let i=0;i<7;i++)o.v.push(r.f64());o.x1=r.u8();};
// revolve end condition: u32 1, 24 bytes, two doubles (0.01 in every revolve so far), 8 bytes, the angle dimension, a second one
R.moRevEndSpec_c=(r,o)=>{o.a=r.u32();o.x0=r.bytes(24).toString('hex');o.v=[r.f64(),r.f64()];o.x1=r.bytes(8).toString('hex');o.dim=r.object('rev dim');o.dim2=r.object('rev dim 2');};
// angle dimension: the common display layout, then u16, three bytes, ten doubles (the dimension arc: two
// directions and points), u32
R.moDisplayAngularDim_c=(r,o)=>{displayDim(r,o,0,252);   // SW2011: 252 bytes after the favourite
  o.t0=[r.u16(),r.u8(),r.u8(),r.u8()];o.arc=[];for(let i=0;i<10;i++)o.arc.push(r.f64());o.t1=r.u32();};
R.AngleDim_c=R.ParallelPlaneDistanceDim_c;
// plane defined from another plane or face: origin, normal, u8 has-rotation, rotation, a vector, f64 1.0, u8,
// display box (4 doubles), 6 bytes, u32, i32, u8, 16 bytes, the reference plane (moCompRefPlane_c), a handle
// slot, 60 bytes, the plane again (box, origin, normal, rotation, vector, f64, 25 bytes), the offset dimension,
// u32, u32, 8 bytes
R.moFaceRefPlnData_c=(r,o)=>{o.origin=r.vec();o.normal=r.vec();o.hasRot=r.u8();if(o.hasRot)o.rot=[r.vec(),r.vec(),r.vec()];o.v=r.vec();o.s=r.f64();o.a=r.u8();o.box=[r.f64(),r.f64(),r.f64(),r.f64()];
  o.x0=r.bytes(6).toString('hex');o.b=[r.u32(),r.i32(),r.u8()];o.x1=r.bytes(r.legacy?8:16).toString('hex');o.ref=r.object('plane ref');
  // offset from a face (moCompFace_c: C18's sketch plane, Helical Bevel Gear's Plane1): no handle slot, 56 bytes (u32 1, u32 0, the version block)
  // (40 in SW2011)
  if(o.ref&&o.ref.class==='moCompFace_c')o.t=r.bytes(r.legacy?40:56).toString('hex');else{o.h=r.object('ref handle');o.t=r.bytes(r.legacy?44:60).toString('hex');}o.box2=[r.f64(),r.f64(),r.f64(),r.f64()];o.origin2=r.vec();o.normal2=r.vec();o.hasRot2=r.u8();if(o.hasRot2)o.rot2=[r.vec(),r.vec(),r.vec()];o.v2=r.vec();o.s2=r.f64();o.t2=r.bytes(25).toString('hex');o.dim=r.object('plane offset dim');o.t3=[r.u32(),r.u32()];o.t4=r.bytes(8).toString('hex');};
// loft: the body header, owner slot, 16 bytes, feature data, u32 and u16 profile counts, the profiles
// (moGeneralCurveRef_w), then u32 0, u32, one u32 per profile, one per pair of neighbouring profiles, a point per profile
// (Helical Bevel Gear: the profiles' planes at z 0, 0.05, 0.1), one u32 per profile, then settings of fixed size
// (fields named by position). C16 has 2 profiles, Helical Bevel Gear's Loft2 3
R.moBlend_c=(r,o)=>{feature(r,o);bodyHeader(r,o);o.owner=r.object('loft owner');extraGroups(r,o);o.y3=r.u32();o.spec=r.objectAs('moPMarkRecord_c','loft spec');o.nprof=r.u32();const np=r.u16();o.profiles=[];for(let i=0;i<np;i++)o.profiles.push(r.object('loft profile'));o.l0=[r.u32(),r.u32()];o.perProfile=[];for(let k=0;k<np;k++)o.perProfile.push(r.u32());o.perPair=[];for(let k=0;k+1<np;k++)o.perPair.push(r.u32());
  o.v=[];for(let k=0;k<3*np;k++)o.v.push(r.f64());o.l1=[];for(let k=0;k<np;k++)o.l1.push(r.u32());o.l2=r.bytes(27).toString('hex');o.l3=r.f64();
  o.l4=[r.u8(),r.u32(),r.u32()];o.l5=r.bytes(7).toString('hex');o.l6=[r.f64(),r.f64()];o.l7=r.bytes(21).toString('hex');o.l8=r.u32();o.l9=r.bytes(8).toString('hex');o.l10=[r.u32(),r.u32()];o.l11=r.bytes(12).toString('hex');o.flags=[r.u8(),r.u8(),r.u8(),r.u8(),r.u8()];};
// a curve or profile reference: the profile (moCompProfile_c: the sketch feature by id and time, 60 bytes),
// 4 bytes, f64 1.0, u8, two i32 -1, 6 bytes
R.moGeneralCurveRef_w=(r,o)=>{o.profile=r.object('curve profile');o.x0=r.bytes(4).toString('hex');o.s=r.f64();o.a=r.u8();o.b=[r.i32(),r.i32()];o.x1=r.bytes(6).toString('hex');};
R.moCompProfile_c=(r,o)=>{o.comp=r.objectAs('@comp','profile comp');o.feature=r.u32();o.stamp=r.u32();o.x0=r.bytes(r.legacy?44:60).toString('hex');};   // both carry the version block (two or three i32 -12345)
// backed-up copies of outside geometry a sketch entity is tied to: a point (position, the next point, u32, name)
// and a line (its points as a linked pair, u16, name such as "Edge")
R.moLineBackedUpData_c=(r,o)=>{o.p=r.object('line points');o.a=r.u16();o.name=r.str();};
// an arc (Helical Bevel Gear's Sketch9): its end points as a linked pair, the centre point, 7 bytes, name ("Edge")
R.moArcBackedUpData_c=(r,o)=>{o.p=r.object('arc points');o.centre=r.object('arc centre');o.x0=r.bytes(7).toString('hex');o.name=r.str();};
// split line: node, u16 ×2, the projected-curve rep, the body header (with a shorter first block), chooser,
// bbox, owner, feature data, the faces it split (moPLineSurfIdRep_c), their references, one CDWordArray
// each, flags, the new face, u32 list, the projection (moPLineProject_c), 8 bytes
R.moPLine_c=(r,o)=>{feature(r,o);o.p0=[r.u16(),r.u16()];o.rep=r.object('pline rep');bodyHeader(r,o,(r=>[r.u32(),r.u32()]));o.bodies=r.object('pline chooser');
  o.y0=[r.u16(),r.u16()];o.bbox=r.object('bbox');o.y1=[r.u16(),r.u32()];o.owner=r.object('pline owner');extraGroups(r,o);o.y3=r.u32();o.spec=r.objectAs('moPMarkRecord_c','pline spec');{const n=r.u32();o.faces=[];for(let i=0;i<n;i++)o.faces.push(r.object('pline face'));}{const n=r.u16();o.faceRefs=[];for(let i=0;i<n;i++)o.faceRefs.push(r.object('pline face ref'));}{const n=r.u16();o.arrays=[];for(let i=0;i<n;i++)o.arrays.push(r.object('pline array'));}{const n=r.u16();o.flags=[];for(let i=0;i<n;i++)o.flags.push(r.u8());}o.q=[r.u16(),r.u16(),r.u16()];o.face=r.object('pline new face');{const n=r.u16();o.w=[];for(let i=0;i<n;i++)o.w.push(r.u32());}o.w2=[r.i32(),r.i32(),r.u32()];o.project=r.object('pline project');o.t=r.bytes(8).toString('hex');};
R.moPLineProjIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.items=[r.object('proj item')];};
R.moPLineSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.items=[];const k=o.ctx?2:4;   // fitted: 4 object slots when the context is null (chooser faces), 2 otherwise
  for(let i=0;i<k;i++)o.items.push(r.object('pls item'));};
// MFC CDWordArray: count + 32-bit values
R.su_CDWordArray=(r,o)=>{const n=r.count();o.v=[];for(let i=0;i<n;i++)o.v.push(r.u32());};
R.moPLineProject_c=(r,o)=>{o.ref=r.object('project ref');o.a=r.u32();const n=r.u16();o.faces=[];for(let i=0;i<n;i++)o.faces.push(r.object('project face'));};
// sketch dimension between two points (EXP-082, cube.SLDPRT): u32, the value (moLengthParameter_c: "D1", metres),
// 3 bytes, u32 the dimension's sketch id, 16 bytes, u32 1, u16 2 (entities), u16 1, u32, the two point
// handles, three u16 1, 28 bytes
R.sgPntPntDist=(r,o)=>{o.a=r.u32();o.param=r.object('dimension value');o.x0=r.bytes(3).toString('hex');o.id=r.u32();o.x1=r.bytes(16).toString('hex');
  o.b=[r.u32(),r.u16(),r.u16(),r.u32()];o.h=[r.object('dimension point 1'),r.object('dimension point 2')];o.c=[r.u16(),r.u16(),r.u16()];o.x2=r.bytes(28).toString('hex');};
// point to line, line to line and horizontal point to point (Helical Bevel Gear): the same layout, with line
// handles in place of points where the dimension measures a line
R.sgPntLineDist=R.sgPntPntDist;R.sgLLDist=R.sgPntPntDist;R.sgPntPntHorDist=R.sgPntPntDist;
// diameter (Helical Bevel Gear's Sketch2): the same layout, u32 15 in place of 1; the handles are the circle's
// arc handle and an sgEntHandle
R.sgCircleDim=R.sgPntPntDist;
// a sketch offset (Helical Bevel Gear's Sketch4: 32 arcs offset from 32 others): u32, the distance (moLengthParameter_c), 3 bytes,
// u32 sketch id, 16 bytes, u32 16, u16 2, u16 1, u32, u16, u16 1. The sketch's two-entity relations then carry one relation of
// type 16 per source and offset entity
R.sgOffsetDim=(r,o)=>{o.a=r.u32();o.param=r.object('offset value');o.x0=r.bytes(3).toString('hex');o.id=r.u32();o.x1=r.bytes(16).toString('hex');
  o.b=[r.u32(),r.u16(),r.u16(),r.u32(),r.u16(),r.u16()];};
// the circular sketch pattern's count: u32, the value (moIntegerParameter_c), 3 bytes, u32 sketch id, 16 bytes, u32
// (77, the next id?), u16 2, u16, u32, two empty handle slots. Nothing follows: no three u16 and 28 bytes
R.sgCircularPattCntDim=(r,o)=>{o.a=r.u32();o.param=r.object('pattern count');o.x0=r.bytes(3).toString('hex');o.id=r.u32();o.x1=r.bytes(16).toString('hex');
  o.b=[r.u32(),r.u16(),r.u16(),r.u32()];o.h=[r.object('count dim slot 1'),r.object('count dim slot 2')];};
// a handle that names no sketch entity of the usual kinds: u32 0xfffe777f, i32 -1, u32 0xffff in both diameters
// so far (12 bytes, against 10 for the point, line and arc handles)
R.sgEntHandle=(r,o)=>{o.id=r.u32();o.a=r.i32();o.b=r.u32();};
// a face named by the feature alone (cube.SLDPRT: a sketch's profile): context, moFR_c, u32. With a null context
// (Helical Bevel Gear's Cut-Extrude1 and the chamfer edges after it, where the u32 is 1) a child rep follows, as in
// moPLineSurfIdRep_c; in a profile (context set, u32 0) it doesn't
R.moSimpleSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.a=r.u32();if(!o.ctx)o.child=r.object('surf child');};
// an edge named by a trimmed sketch segment (Helical Bevel Gear's Sketch9): context, moFR_c, u32 sketch entity, u32
R.moSegmRightTrimEdgeIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.entity=r.u32();o.b=r.u32();};
R.moSegmLeftTrimEdgeIdRep_c=R.moSegmRightTrimEdgeIdRep_c;
// circular pattern (Helical Bevel Gear's CirPattern1, 13 copies over 360°): the body header, 18 bytes, u32, feature data, the
// features patterned (an object list: Boss-Extrude3), an empty list, 11 bytes, an empty list, 228 bytes of settings, an empty list,
// 11 bytes, four dimension slots (the count 13 shown, null, the count and the angle hidden), u16, the axis (moLineRef_w on a model
// edge), u8, the angle shown (360°), u32 1, u8, u32 1, 7 bytes. Fitted on this one feature
R.moCirPattern_c=(r,o)=>{feature(r,o);bodyHeader(r,o);o.p0=r.bytes(18).toString('hex');o.y3=r.u32();o.spec=r.objectAs('moPMarkRecord_c','pattern spec');
  o.features=r.objectAs('@oblist','pattern features');o.faces=r.objectAs('@oblist','pattern faces');o.p1=r.bytes(11).toString('hex');o.bodies=r.objectAs('@oblist','pattern bodies');
  o.p2=r.bytes(228).toString('hex');o.list3=r.objectAs('@oblist','pattern list 3');o.p3=r.bytes(11).toString('hex');o.dims=[];for(let i=0;i<4;i++)o.dims.push(r.object('pattern dim'));o.q0=r.u16();o.axis=r.object('pattern axis');o.q1=r.u8();o.dim5=r.object('pattern axis dim');o.q2=[r.u32(),r.u8(),r.u32()];o.q3=r.bytes(7).toString('hex');};
// a count dimension (CirPattern1's instance count, 13): u32, the value (moIntegerParameter_c)
R.moNumberDim_c=(r,o)=>{o.a=r.u32();o.param=r.object('number value');};
// a displayed dimension of a pattern (CirPattern1): the common layout and nothing after it
R.moDisplayDim_c=(r,o)=>{displayDim(r,o);};
