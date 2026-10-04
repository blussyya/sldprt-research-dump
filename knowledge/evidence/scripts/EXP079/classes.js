'use strict';
const {READ,feature}=require('./archive');
const R=READ;
// ---- folders: the feature base, then a class-specific tail ----
R.moCommentsFolder_c=(r,o)=>{feature(r,o);o.x=r.u32();};
R.moFavoriteFolder_c=(r,o)=>{feature(r,o);o.x=[r.u32(),r.u32(),r.u32()];};
R.moHistoryFolder_c=(r,o)=>{feature(r,o);o.x=r.u32();const n=r.count();o.items=[];for(let i=0;i<n;i++)o.items.push(r.object('history item'));};
R.moHistoryFeatItemData_c=(r,o)=>{o.raw=r.bytes(22).toString('hex');o.comp=r.objectAs('@comp','history comp');};
R.moCompFeature_c=(r,o)=>{o.comp=r.objectAs('@comp','comp');o.feature=r.u32();o.stamp=r.u32();};
// component reference data (pre-loaded class): u16 2, u32 flags, u8, u32 kind (0, or 101 for some
// bodies, faces and edges), u32, 28 bytes, 16 × ff, 20 bytes. The owning class adds its own fields:
// references to features name the feature by id and creation time (unix seconds)
R['@comp']=(r,o)=>{o.v=r.u16();o.flags=r.u32();o.a=r.u8();o.kind=r.u32();o.kind2=r.u32();o.x0=r.bytes(28).toString('hex');o.ff=r.bytes(16).toString('hex');o.x1=r.bytes(20).toString('hex');
};
R.moSelectionSetFolder_c=(r,o)=>{feature(r,o);o.x=[r.u32(),r.u16(),r.u32()];};
for(const c of ['moSensorFolder_c','moDocsFolder_c','moInkMarkupFolder_c','moEqnFolder_c'])R[c]=(r,o)=>{feature(r,o);o.x=r.u32();};
R.moSurfaceBodyFolder_c=(r,o)=>{feature(r,o);o.x=r.bytes(16).toString('hex');};
R.moSolidBodyFolder_c=(r,o)=>{feature(r,o);o.x=r.bytes(16).toString('hex');o.body=r.object('solid body folder');};
R.moMaterialFolder_c=(r,o)=>{feature(r,o);o.x0=r.u32();o.material=r.str();o.x=r.u32();};
R.moRefPlane_c=(r,o)=>{feature(r,o);o.x=r.bytes(150).toString('hex');o.data=r.object('ref plane data');};
// default plane: origin, normal, optional 3×3 rotation (Top and Right have one, Front doesn't), then display data
R.moDefaultRefPlnData_c=(r,o)=>{o.origin=r.vec();o.normal=r.vec();o.hasRot=r.u8();if(o.hasRot)o.rot=[r.vec(),r.vec(),r.vec()];o.v=r.vec();o.display=r.bytes(96).toString('hex');};
// profile features (the Origin, sketches): node, 10 bytes, the sketch, then i32, u32, u32 (101 Origin, 102 sketch), 12 bytes
function profileTail(r,o){o.t=[r.i32(),r.u32(),r.u32()];o.t1=r.bytes(12).toString('hex');}
R.moOriginProfileFeature_c=(r,o)=>{feature(r,o);o.x=r.bytes(10).toString('hex');o.sketch=r.object('origin sketch');profileTail(r,o);};
R.moProfileFeature_c=(r,o)=>{feature(r,o);if(process.env.PF)console.error('profile after node',r.p,r.b.subarray(r.p,r.p+60).toString('hex'));o.x=r.bytes(10).toString('hex');o.sketch=r.object('sketch');profileTail(r,o);};
// the Annotations folder: u16, two doubles (1.0, 1.0), 10 bytes
R.moDetailCabinet_c=(r,o)=>{feature(r,o);o.a=r.u16();o.scale=[r.f64(),r.f64()];o.x=r.bytes(10).toString('hex');};
// the closing note ('…___EndTag___') carries the opening note, 32 bytes of settings and itself
R.moNotesAreaFtrFolder_c=(r,o)=>{feature(r,o);o.x0=r.u32();if(/___EndTag___$/.test(o.name)){o.open=r.object('notes open');o.x=r.bytes(32).toString('hex');o.self=r.object('notes self');}};
// ---- sketches (EXP-079) ----
// shared graphics/attribute block of sketch objects: 35 bytes, one object pointer (an external
// reference such as "coincident with the Origin", else null), 27 bytes
function attrs(r){const a={};a.x0=r.bytes(35).toString('hex');a.ext=r.object('entity external ref');a.x1=r.bytes(27).toString('hex');return a;}
// sketch point: u16 q (1 = tied to outside geometry), u32 r, u32 id, attribute block, u16 kind,
// x, y, u16 flags, u16 number of entities using it, up to two of their handles, u16 number of arcs
// centred on it, i32 -2, 36 bytes
function sketchPoint(r){const p={};p.q=r.u16();p.r=r.u32();p.id=r.u32();p.attrs=attrs(r);p.kind=r.u16();p.x=r.f64();p.y=r.f64();
  p.flags=r.u16();p.uses=r.u16();p.h=[r.object('point handle 1'),r.object('point handle 2')];p.centreOf=r.u16();p.m2=r.i32();p.x1=r.bytes(36).toString('hex');return p;}
// line / arc: u32 p, u32 id, attribute block, u16 start, u16 end, u16 a (0 = construction), u16 b,
// f64 -1, u32 type; arcs add u16 centre, four i32 -2 and a u16
function segment(r){const g={};g.p=r.u32();g.id=r.i32();g.attrs=attrs(r);g.s=r.u16();g.e=r.u16();g.a=r.u16();g.b=r.u16();g.m1=r.f64();g.type=r.u32();
  if((g.type&0xffff)===1){g.centre=r.u16();g.x1=[r.i32(),r.i32(),r.i32(),r.i32()];g.x2=r.u16();}return g;}
// relations, grouped by how many entities they constrain: u16 count, then per relation 8 bytes,
// i32 -1, 16 bytes, u32 type (swConstraintType_e), u32 2, u16 0, i16 -2, u16 0, the entity handles,
// and for two-entity relations 8 bytes, two i32 -1 and 24 bytes
function relations(r,k){const n=r.u16(),out=[];for(let i=0;i<n;i++){const q={};q.x0=r.bytes(8).toString('hex');q.m1=r.i32();q.x1=r.bytes(16).toString('hex');
  q.type=r.u32();q.two=r.u32();q.x2=[r.u16(),r.i16(),r.u16()];q.h=[];for(let j=0;j<k;j++)q.h.push(r.object('relation entity'));
  if(process.env.RELDBG)console.error('REL',k,q.type,q.h.map(h=>h&&h.class+':'+h.id).join(','),r.b.subarray(r.p,r.p+64).toString('hex'));
  if(k===2){q.x3=r.bytes(8).toString('hex');q.m2=[r.i32(),r.i32()];q.x4=r.bytes(24).toString('hex');}out.push(q);}return out;}
// pre-loaded list class (probably suObList from Config-0): u16 count + objects
R['@oblist']=(r,o)=>{const n=r.count();o.items=[];for(let i=0;i<n;i++)o.items.push(r.object('oblist item'));};
R.sgPointHandle=(r,o)=>{o.id=r.u16();o.a=r.i32();o.b=r.u32();};
function list(r,item){const n=r.u16(),x=r.u32(),items=[];for(let i=0;i<n;i++)items.push(item(r));return {x,items};}
R.sgLineHandle=(r,o)=>{o.id=r.u16();o.a=r.i32();o.b=r.u32();};
R.sgArcHandle=R.sgLineHandle;
R.sgSketch=(r,o)=>{const n=r.u16();o.x0=r.u16();o.points=[];for(let i=0;i<n;i++)o.points.push(sketchPoint(r));
  o.lines=list(r,segment);o.x1=r.bytes(6).toString('hex');o.arcs=list(r,segment);
  o.x2=r.bytes(38).toString('hex');   // further entity lists, empty in every controlled model
  o.rel1=relations(r,1);o.rel2=relations(r,2);o.x3=r.bytes(12).toString('hex');
  o.list1=r.object('sketch list 1');
  o.x4=r.bytes(12).toString('hex');o.c=[r.u16(),r.u16()];
  o.nextIds=[];for(let i=0;i<14;i++)o.nextIds.push(r.u32());   // next free id per entity kind (C00 Sketch1: 5, 6 points, 5 lines, 1 …)
  o.y=[r.u32(),r.u32(),r.u32(),r.u32()];o.name=r.str();o.z=[r.u16(),r.f32(),r.i32(),r.u32(),r.i32()];
  o.x5=r.bytes(24).toString('hex');o.v=[r.u32(),r.u32()];o.x6=r.bytes(28).toString('hex');
  o.regions=r.object('sketch regions');o.x6b=r.bytes(30).toString('hex');
  // chains (closed contours): u32 count, u32 (same as count in every file), then per chain the chain object and 38 bytes
  const nc=r.u32();o.nc2=r.u32();o.chains=[];for(let i=0;i<nc;i++){const c=r.object('sketch chain');c.after=[r.u32(),r.u32(),r.bytes(4).toString('hex'),r.u16(),r.i32()];c.after2=r.bytes(20).toString('hex');o.chains.push(c);}
  o.x9=r.u32();o.onPlane=r.u8();
  if(!o.onPlane){   // sketch on a face: the face geometry as an embedded, zlib-compressed Parasolid transmit file
    o.f=[r.u32(),r.u8(),r.u32()];o.guid=r.bytes(16).toString('hex');o.rawSize=r.u32();const n=r.u32();o.parasolid=r.bytes(n);
    o.g0=r.bytes(12).toString('hex');const ne=r.u16();o.faceEdges=[];for(let i=0;i<ne;i++)o.faceEdges.push(r.object('face edge'));
    const nk=r.u32();o.k=[r.u32(),r.u32(),r.u32()];o.edgeIdx=[];for(let i=0;i<nk;i++)o.edgeIdx.push(r.u32());o.k2=r.u32();}
  else o.x10=r.bytes(10).toString('hex');
  o.x11=[r.u32(),r.u16()];o.axis=r.object('sketch axis');   // u32 100000; the centreline handle a revolve uses (null otherwise)
  
  o.plane=r.object('sketch plane');
  // placement on the plane: u16, u32 (3, or 2), u8 has-rotation, 3×3 rotation (Top: [[1,0,0],[0,0,1],[0,−1,0]]),
  // 24 bytes, f64 1.0, 3 bytes, u32 4
  if(!o.onPlane){o.facePlane=r.object('face sketch plane');   // sketch on a face: a hidden plane feature, then 72 bytes of placement
    o.pl=[r.u16(),r.u32(),r.u8()];o.offset=r.vec();o.pl1=[r.u8(),r.u32()];o.pl2=r.bytes(23).toString('hex');o.scale=r.f64();o.pl3=[r.u8(),r.u32()];}
  else{o.pl=[r.u16(),r.u32()];o.hasRot=r.u8();if(o.hasRot)o.rot=[r.vec(),r.vec(),r.vec()];o.pl1=r.bytes(24).toString('hex');o.scale=r.f64();o.pl2=r.bytes(3).toString('hex');o.pl3=r.u32();}
  if(process.env.SKETCH_REST)console.error('sketch rest at',r.p,r.b.subarray(r.p,r.p+(+process.env.SKETCH_REST)).toString('hex'));
  if(process.env.SKETCH_STOP)throw Error('sketch stop at '+r.p);};
// a closed region of the sketch: its boundary handles
R.moSketchRegion_c=(r,o)=>{o.edges=r.object('region edges');};
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
R.moSketchExtRef_w=(r,o)=>{o.ent=r.object('ext entity');extRefTail(r,o);};
// the 52 bytes after a referenced entity: u16 0, u32 0x66/0x6a, 12 bytes, three i32 -12345, u32 0, u32 version (offset 34),
// 14 bytes. Version 15000 (SW2022) follows with a backed-up copy object; version 4700 (made in SW2011) has
// no object, only 8 bytes and the entity's name ("Point1@Origin")
function extRefTail(r,o){const at=r.p;o.x0=r.bytes(52).toString('hex');o.version=r.b.readUInt32LE(at+34);
  if(o.version>=15000)o.backup=r.object('ext backup');else{o.old=[r.u32(),r.u32()];o.name=r.str();}}
R.moCompSketchEntHandle_c=(r,o)=>{o.comp=r.objectAs('@comp','ext comp');o.feature=r.u32();o.stamp=r.u32();o.handle=r.object('ext handle');o.x0=r.bytes(10).toString('hex');};
R.moPointBackedUpData_c=(r,o)=>{o.p=r.vec();o.next=r.object('point next');o.a=r.u32();o.name=r.str();};
// header shared by features that make or change a body (extrude, cut, revolve, loft): u32, u16, u32;
// (u16 1, u16 code 0x3a/0x3b), u32 n and n more such pairs (cuts add 0x3b), u16; u32, u32 (101 boss, 102 cut), u32 3;
// the bodies acted on (u32 count; per body u16, the body, u32, u32, the creating feature's id, u32, u32);
// u32 1, u16, u16
function bodyHeader(r,o,h0){o.h0=h0?h0(r):[r.u32(),r.u16(),r.u32()];o.codes=[[r.u16(),r.u16()]];const nc=r.u32();for(let i=0;i<nc;i++)o.codes.push([r.u16(),r.u16()]);o.z=r.u16();
  o.h1=[r.u32(),r.u32(),r.u32()];const n=r.u32();o.scope=[];for(let i=0;i<n;i++)o.scope.push({a:r.u16(),body:r.object('scope body'),x:[r.u32(),r.u32(),r.u32(),r.u32(),r.u32()]});
  o.h2=[r.u32(),r.u16(),r.u16()];}
R.moExtrusion_c=(r,o)=>{feature(r,o);bodyHeader(r,o);o.bodies=r.object('per body chooser');
  o.y0=[r.u16(),r.u16()];o.bbox=r.object('bbox');o.y1=[r.u16(),r.u32()];o.owner=r.object('extrusion owner');o.y2=r.bytes(16).toString('hex');o.y3=r.u32();
  o.spec=r.objectAs('@x66','extrusion spec');
  o.endSpec=r.object('end spec');
  // u8 flag (1 in the cube models, 0 in C19); when set, u16, u32 1 and 36 bytes follow
  o.flag=r.u8();if(o.flag){o.x4=[r.u16(),r.u32()];o.x5=r.bytes(36).toString('hex');}o.x6=r.bytes(19).toString('hex');o.x7=r.u32();o.x8=r.bytes(8).toString('hex');
  o.from=r.object('from end spec');
};
R.moFromEndSpec_c=(r,o)=>{o.x0=r.bytes(32).toString('hex');};
// bounding box of what the feature made: u32 1, centre, diagonal, u32, u32, u32 n + n × u32 (n = 1 for
// the cube boss, 0 for the cut), u16, the feature
R.moBBoxCenterData_c=(r,o)=>{o.a=r.u32();o.centre=r.vec();o.diagonal=r.f64();o.b=[r.u32(),r.u32()];const n=r.u32();o.list=[];for(let i=0;i<n;i++)o.list.push(r.u32());o.c=r.u16();o.owner=r.object('bbox owner');};
R['@x66']=(r,o)=>{o.a=r.u32();o.x0=r.bytes(62).toString('hex');};
R.moPerBodyChooserData_c=(r,o)=>{const n=r.u16();o.faces=[];for(let i=0;i<n;i++)o.faces.push(r.object('chooser face'));};
// a face or edge picked by name: u32 1, u32 0, u32 kind (6 face, 4 edge), u8, u16 (3 face, 2 edge), u8,
// u32 (an edge's Parasolid tag?), two copies of a
// 64-bit value, u16, the naming tree, 20 bytes
// face tail: 18 bytes, 16 when kind is 1 (the sphere's single face); why is open
function topoRef(r,o){const at0=r.p;o.a=[r.u32(),r.u32()];o.kind=r.u32();o.b=r.u8();o.c=r.u16();o.c2=r.u8();o.tag=r.u32();o.key=[r.bytes(8).toString('hex'),r.bytes(8).toString('hex')];o.e=r.u16();if(process.env.TOPO2){const q=r.p;setImmediate(()=>{});}if(o.class==='moFaceRef_c'){o.reps=nullList(r,'face rep');if(process.env.TOPO2)console.error('TOPO2 F',JSON.stringify([o.a,o.kind,o.b,o.c,o.c2,o.tag,o.e]),r.b.subarray(r.p,r.p+26).toString('hex'));o.x1=r.bytes(o.kind===1?16:18).toString('hex');}else{o.rep=r.object('edge rep');if(process.env.TOPO2)console.error('TOPO2 E tag',o.tag,r.p,r.b.subarray(r.p,r.p+90).toString('hex'));o.x1=r.bytes(14).toString('hex');if(o.tag)o.x2=[r.u32(),r.u16()];}}
// objects up to a null
function nullList(r,w){const out=[];for(;;){const x=r.object(w);if(!x)return out;out.push(x);}}
R.moFaceRef_c=topoRef;R.moEdgeRef_c=topoRef;
// how a face is named: a tree of surface-id representations, each pointing at the feature that made
// the face (moFR_c: the document/config object, feature id, feature creation time, sketch entity id)
R.moEndFaceSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.endIndex=r.u32();o.b=r.u32();o.child=r.object('surf child');};
R.moFromSktEntSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.entity=r.u32();o.child=r.object('surf child');};
// "3Int" variants carry three integers: side face (entity, −1, 0 in C04), cap face (end, b, c)
R.moFromSktEnt3IntSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.ints=[r.i32(),r.i32(),r.i32()];o.child=r.object('surf child');};
R.moEndFace3IntSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.endIndex=r.u32();o.b=r.u32();o.c=r.i32();o.child=r.object('surf child');};
R.moSurfaceIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.items=[r.object('surf a'),r.object('surf b'),r.object('surf c')];};
R.moFilletSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.a=r.u32();};
R.moFR_c=(r,o)=>{o.ext=r.object('fr ext');o.feature=r.u32();o.stamp=r.u32();};
// the document a reference lives in: two string handles (path, document name), u8, u16, creation
// time, three strings, 18 bytes, configuration name, 12 bytes
R.moExtObject_c=(r,o)=>{o.h=[r.object('ext path'),r.object('ext doc')];o.a=[r.u8(),r.u16()];o.stamp=r.u32();o.s=[r.str(),r.str(),r.str()];o.x0=r.bytes(18).toString('hex');o.config=r.str();o.x1=r.bytes(12).toString('hex');};
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
function displayDim(r,o,x){o.x0=r.bytes(556).toString('hex');o.handle=r.object('display dim handle');o.x1=r.skipToObject('moFavoriteHandle_c',FAV_SIG);o.x1len=o.x1.length/2;
  o.fav=r.object('display dim favourite');o.x2=r.bytes(374).toString('hex');}
R.moDisplayDistanceDim_c=(r,o)=>{displayDim(r,o,587);o.x3=r.bytes(54).toString('hex');};
// radius dimension: as above, then 124 bytes, the edge it measures, ...
R.moDisplayRadialDim_c=(r,o)=>{displayDim(r,o,541);o.x3=r.bytes(124).toString('hex');o.edge=r.object('radial dim edge');
  if(process.env.AP)console.error('radial after edge',r.p,r.b.subarray(r.p,r.p+200).toString('hex'));};
R.ThreeDRadiusDim_c=(r,o)=>{o.a=r.u32();o.param=r.object('dim parameter');};
R.edgeRadiusObject_c=(r,o)=>{o.dim=r.object('edge radius dim');};
// an edge: component object, u8, the edge reference (often a back-reference to the one the feature named),
// a second object slot (null so far), 60 bytes
R.moCompEdge_c=(r,o)=>{o.comp=r.objectAs('@comp','edge comp');o.a=r.u8();o.edge=r.object('edge ref');o.x0=r.bytes(62).toString('hex');};
R.moFavoriteHandle_c=(r,o)=>{o.a=r.u32();o.b=r.i32();};
R.moFeatureDimHandle_c=(r,o)=>{o.x0=r.bytes(103).toString('hex');o.dim=r.object('dim');};
R.ParallelPlaneDistanceDim_c=(r,o)=>{o.a=r.u32();o.param=r.object('dim parameter');if(process.env.EX)console.error('after param',r.p,peek(r));};
// a dimension's value: the short node form (name, id -1), then the value in metres or radians
R.moLengthParameter_c=(r,o)=>{o.node=r.object('parameter node');o.value=r.f64();};
R.moAngleParameter_c=R.moLengthParameter_c;
// cut-extrude (ICE): laid out as the extrusion, with the cut body in the header's scope list
R.moICE_c=(r,o)=>R.moExtrusion_c(r,o);
// a solid body, named by one of its faces: component object, face reference
R.moCompSolidBody_c=(r,o)=>{o.comp=r.objectAs('@comp','body comp');o.face=r.object('body face');};
// applied features (fillet, chamfer, shell): node, 58 bytes, the pre-loaded data object, u32, ...
function applied(r,o){feature(r,o);o.x0=r.bytes(58).toString('hex');o.data=r.objectAs('@x66','feature data');o.n=r.u32();o.target=r.object('applied target');
  if(process.env.AP)console.error('applied after ref',r.p,r.b.subarray(r.p,r.p+100).toString('hex'));}
R.Fillet_c=(r,o)=>{applied(r,o);o.edges=r.object('fillet edges');o.lists=[r.object(),r.object(),r.object()];o.x1=r.bytes(12).toString('hex');o.radii=r.object('fillet radii');
  o.y0=[r.u32(),r.u8()];o.list4=r.object('fillet list 4');o.y1=r.bytes(8).toString('hex');o.y2=r.bytes(4).toString('hex');o.y3=r.bytes(9).toString('hex');
  o.rho=[r.f64(),r.f64()];o.y4=[r.u8(),r.bytes(6).toString('hex'),r.u32()];o.y5=r.bytes(10).toString('hex');o.y6=r.u32();o.face=r.object('fillet face');
  o.edge2=r.object('fillet edge 2');o.z00=[r.u32(),r.u16()];o.z0=[r.u32(),r.i32(),r.i32(),r.u32(),r.u32(),r.u32(),r.u32(),r.u32()];o.radius=r.f64();o.edge3=r.object('fillet edge 3');o.z2=[r.u32(),r.u16()];
  o.tags=[r.u32(),r.u32(),r.u32(),r.u32(),r.u32()];o.z1=r.bytes(16).toString('hex');};
// a face: component object, u8, the face reference, a second object slot (null so far)
R.moCompFace_c=(r,o)=>{o.comp=r.objectAs('@comp','face comp');o.a=r.u8();o.face=r.object('face ref');o.b=r.object('face 2');};
R.Chamfer_c=(r,o)=>{applied(r,o);o.edges=r.object('chamfer edges');o.lists=[r.object(),r.object()];o.dim=r.object('chamfer dim');o.dim2=r.object('chamfer dim 2');o.c0=[r.u8(),r.u16(),r.u16()];o.edge=r.object('chamfer edge');o.c1=[r.u32(),r.u32(),r.u32(),r.u16()];o.tags=[r.u32(),r.u32(),r.u32(),r.u32(),r.u32()];o.c2=r.bytes(19).toString('hex');o.c3=r.u8();};
R.moShell_c=(r,o)=>{applied(r,o);o.dim=r.object('shell dim');o.s0=r.u8();o.lists=[r.object(),r.object()];o.edge=r.object('shell edge');o.s1=r.u16();};
for(const c of ['Fillet_c','Chamfer_c','moShell_c','moRevolution_c','moLoft_c','moSplitLine_c'])if(!R[c])R[c]=(r,o)=>{feature(r,o);let h='';for(let p=r.p;p<r.p+72;p++){h+=r.b[p]===0?'..':r.b[p].toString(16).padStart(2,'0');if((p-r.p)%2==1)h+=' ';}console.error(c,'after node',r.p,h);throw Error(c+' at '+r.p);};
R.moRevolution_c=(r,o)=>{feature(r,o);bodyHeader(r,o);o.bodies=r.object('per body chooser');
  o.y0=[r.u16(),r.u16()];o.bbox=r.object('bbox');o.y1=[r.u16(),r.u32()];o.owner=r.object('revolve owner');o.y2=r.bytes(16).toString('hex');o.y3=r.u32();
  o.spec=r.objectAs('@x66','revolve spec');o.r0=[r.u8(),r.u32(),r.u32()];o.list=r.object('revolve list');o.r1=[r.u32(),r.u32()];o.axis=r.object('revolve axis');o.endSpec=r.object('revolve end');o.t=r.u32();};
// a reference to a sketch line (the revolve axis): the entity handle, 6 bytes, seven doubles (C13: 0.01, 0, 0,
// 0, 0, 1, 0; C17: 0.006, 0, −0.003, 0, 0, 1, 0: the line's length, then where it starts?), a byte
R.moLineRef_w=(r,o)=>{o.ent=r.object('line ref');o.g=r.bytes(52).toString('hex');o.x0=r.bytes(6).toString('hex');o.v=[];for(let i=0;i<7;i++)o.v.push(r.f64());o.x1=r.u8();};
// revolve end condition: u32 1, 24 bytes, two doubles (0.01 in every revolve so far), 8 bytes, the angle dimension, a second one
R.moRevEndSpec_c=(r,o)=>{o.a=r.u32();o.x0=r.bytes(24).toString('hex');o.v=[r.f64(),r.f64()];o.x1=r.bytes(8).toString('hex');o.dim=r.object('rev dim');o.dim2=r.object('rev dim 2');};
// angle dimension: the common display layout, then u16, three bytes, ten doubles (the dimension arc: two
// directions and points), u32
R.moDisplayAngularDim_c=(r,o)=>{displayDim(r,o,0);if(process.env.ANG)console.error('ANG',r.p,r.b.subarray(r.p,r.p+130).toString('hex'));o.t0=[r.u16(),r.u8(),r.u8(),r.u8()];o.arc=[];for(let i=0;i<10;i++)o.arc.push(r.f64());o.t1=r.u32();};
R.AngleDim_c=R.ParallelPlaneDistanceDim_c;
// plane defined from another plane or face: origin, normal, u8 has-rotation, rotation, a vector, f64 1.0, u8,
// display box (4 doubles), 6 bytes, u32, i32, u8, 16 bytes, the reference plane (moCompRefPlane_c), a handle
// slot, 60 bytes, the plane again (box, origin, normal, rotation, vector, f64, 25 bytes), the offset dimension,
// u32, u32, 8 bytes
R.moFaceRefPlnData_c=(r,o)=>{o.origin=r.vec();o.normal=r.vec();o.hasRot=r.u8();if(o.hasRot)o.rot=[r.vec(),r.vec(),r.vec()];o.v=r.vec();o.s=r.f64();o.a=r.u8();o.box=[r.f64(),r.f64(),r.f64(),r.f64()];
  o.x0=r.bytes(6).toString('hex');o.b=[r.u32(),r.i32(),r.u8()];o.x1=r.bytes(16).toString('hex');o.ref=r.object('plane ref');o.h=r.object('ref handle');o.t=r.bytes(60).toString('hex');o.box2=[r.f64(),r.f64(),r.f64(),r.f64()];o.origin2=r.vec();o.normal2=r.vec();o.hasRot2=r.u8();if(o.hasRot2)o.rot2=[r.vec(),r.vec(),r.vec()];o.v2=r.vec();o.s2=r.f64();o.t2=r.bytes(25).toString('hex');o.dim=r.object('plane offset dim');o.t3=[r.u32(),r.u32()];o.t4=r.bytes(8).toString('hex');};
// loft: the body header, owner slot, 16 bytes, feature data, u32 and u16 profile counts, the profiles
// (moGeneralCurveRef_w), then settings: five u32, six doubles, u32 1, u32 5000, … (fields named by position)
R.moBlend_c=(r,o)=>{feature(r,o);bodyHeader(r,o);o.owner=r.object('loft owner');o.y2=r.bytes(16).toString('hex');o.y3=r.u32();o.spec=r.objectAs('@x66','loft spec');o.nprof=r.u32();const np=r.u16();o.profiles=[];for(let i=0;i<np;i++)o.profiles.push(r.object('loft profile'));o.l0=[r.u32(),r.u32(),r.u32(),r.u32(),r.u32()];o.v=[];for(let k=0;k<6;k++)o.v.push(r.f64());o.l1=[r.u32(),r.u32()];o.l2=r.bytes(27).toString('hex');o.l3=r.f64();
  o.l4=[r.u8(),r.u32(),r.u32()];o.l5=r.bytes(7).toString('hex');o.l6=[r.f64(),r.f64()];o.l7=r.bytes(21).toString('hex');o.l8=r.u32();o.l9=r.bytes(8).toString('hex');o.l10=[r.u32(),r.u32()];o.l11=r.bytes(12).toString('hex');o.flags=[r.u8(),r.u8(),r.u8(),r.u8(),r.u8()];};
// a curve or profile reference: the profile (moCompProfile_c: the sketch feature by id and time, 60 bytes),
// 4 bytes, f64 1.0, u8, two i32 -1, 6 bytes
R.moGeneralCurveRef_w=(r,o)=>{o.profile=r.object('curve profile');o.x0=r.bytes(4).toString('hex');o.s=r.f64();o.a=r.u8();o.b=[r.i32(),r.i32()];o.x1=r.bytes(6).toString('hex');};
R.moCompProfile_c=(r,o)=>{o.comp=r.objectAs('@comp','profile comp');o.feature=r.u32();o.stamp=r.u32();o.x0=r.bytes(60).toString('hex');};
// backed-up copies of outside geometry a sketch entity is tied to: a point (position, the next point, u32, name)
// and a line (its points as a linked pair, u16, name such as "Edge")
R.moLineBackedUpData_c=(r,o)=>{o.p=r.object('line points');o.a=r.u16();o.name=r.str();};
// split line: node, u16 ×2, the projected-curve rep, the body header (with a shorter first block), chooser,
// bbox, owner, feature data, the faces it split (moPLineSurfIdRep_c), their references, one CDWordArray
// each, flags, the new face, u32 list, the projection (moPLineProject_c), 8 bytes
R.moPLine_c=(r,o)=>{feature(r,o);o.p0=[r.u16(),r.u16()];o.rep=r.object('pline rep');bodyHeader(r,o,(r=>[r.u32(),r.u32()]));o.bodies=r.object('pline chooser');
  o.y0=[r.u16(),r.u16()];o.bbox=r.object('bbox');o.y1=[r.u16(),r.u32()];o.owner=r.object('pline owner');o.y2=r.bytes(16).toString('hex');o.y3=r.u32();o.spec=r.objectAs('@x66','pline spec');{const n=r.u32();o.faces=[];for(let i=0;i<n;i++)o.faces.push(r.object('pline face'));}{const n=r.u16();o.faceRefs=[];for(let i=0;i<n;i++)o.faceRefs.push(r.object('pline face ref'));}{const n=r.u16();o.arrays=[];for(let i=0;i<n;i++)o.arrays.push(r.object('pline array'));}{const n=r.u16();o.flags=[];for(let i=0;i<n;i++)o.flags.push(r.u8());}o.q=[r.u16(),r.u16(),r.u16()];o.face=r.object('pline new face');{const n=r.u16();o.w=[];for(let i=0;i<n;i++)o.w.push(r.u32());}o.w2=[r.i32(),r.i32(),r.u32()];o.project=r.object('pline project');o.t=r.bytes(8).toString('hex');};
R.moPLineProjIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.items=[];const k=+(process.env.K2||1);for(let i=0;i<k;i++)o.items.push(r.object('proj item'));if(process.env.K3)o.u=r.u32();};
R.moPLineSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.items=[];const k=o.ctx?2:4;   // fitted: 4 object slots when the context is null (chooser faces), 2 otherwise
  for(let i=0;i<k;i++)o.items.push(r.object('pls item'));};
// MFC CDWordArray: count + 32-bit values
R.su_CDWordArray=(r,o)=>{const n=r.count();o.v=[];for(let i=0;i<n;i++)o.v.push(r.u32());};
R.moPLineProject_c=(r,o)=>{o.ref=r.object('project ref');o.a=r.u32();const n=r.u16();o.faces=[];for(let i=0;i<n;i++)o.faces.push(r.object('project face'));};
