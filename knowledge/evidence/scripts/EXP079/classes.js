'use strict';
const {READ,feature}=require('./archive');
const R=READ;
// ---- folders: the feature base, then a class-specific tail ----
R.moCommentsFolder_c=(r,o)=>{feature(r,o);o.x=r.u32();};
R.moFavoriteFolder_c=(r,o)=>{feature(r,o);o.x=[r.u32(),r.u32(),r.u32()];};
R.moHistoryFolder_c=(r,o)=>{feature(r,o);o.x=r.u32();const n=r.count();o.items=[];for(let i=0;i<n;i++)o.items.push(r.object('history item'));};
R.moHistoryFeatItemData_c=(r,o)=>{o.raw=r.bytes(22).toString('hex');o.comp=r.object('history comp');};
R.moCompFeature_c=(r,o)=>{o.comp=r.object('comp');o.feature=r.u32();o.stamp=r.u32();};
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
  o.x9=[r.u32(),r.u32()];o.x10=r.bytes(7).toString('hex');o.x11=[r.u32(),r.u16()];o.axis=r.object('sketch axis');   // u32 100000; the centreline handle a revolve uses (null otherwise)
  
  o.plane=r.object('sketch plane');
  if(process.env.SKETCH_REST)console.error('sketch rest at',r.p,r.b.subarray(r.p,r.p+(+process.env.SKETCH_REST)).toString('hex'));
  if(process.env.SKETCH_STOP)throw Error('sketch stop at '+r.p);};
// a closed region of the sketch: its boundary handles
R.moSketchRegion_c=(r,o)=>{o.edges=r.object('region edges');};
// chain: u16 n, the entities' P numbers, u16, u32 (1 for a single closed curve), u32 6, i32 -1, 8 bytes
R.moSketchChain_c=(r,o)=>{const n=r.u16();o.ents=[];for(let i=0;i<n;i++)o.ents.push(r.u32());o.a=r.u16();o.b=r.u32();o.c=r.u32();o.d=r.i32();o.x0=r.bytes(8).toString('hex');};
// reference to a plane feature: component object (feature id + creation time), u16, u32 (3, or 2
// when a rotation follows), u8 has-rotation, 3×3 rotation, 24 bytes, f64 1.0, 3 bytes, u32 4
R.moCompRefPlane_c=(r,o)=>{o.comp=r.object('plane comp');o.feature=r.u32();o.stamp=r.u32();o.a=r.u16();o.b=r.u32();o.hasRot=r.u8();if(o.hasRot)o.rot=[r.vec(),r.vec(),r.vec()];
  o.x0=r.bytes(24).toString('hex');o.scale=r.f64();o.x1=r.bytes(3).toString('hex');o.c=r.u32();};
// a sketch entity tied to outside geometry: sgExtEnt_c → moSketchExtRef_w → the referenced entity
// (moCompSketchEntHandle_c: the owning feature as a component object, the entity handle, 62 bytes)
// and a backed-up copy of it (moPointBackedUpData_c: 30 bytes and its name, e.g. "Point1@Origin")
R.sgExtEnt_c=(r,o)=>{o.ref=r.object('ext ref');};
R.moSketchExtRef_w=(r,o)=>{o.ent=r.object('ext entity');o.backup=r.object('ext backup');};
R.moCompSketchEntHandle_c=(r,o)=>{o.comp=r.object('ext comp');o.feature=r.u32();o.stamp=r.u32();o.handle=r.object('ext handle');o.x0=r.bytes(62).toString('hex');};
R.moPointBackedUpData_c=(r,o)=>{o.x0=r.bytes(30).toString('hex');o.name=r.str();};
// header shared by features that make or change a body (extrude, cut, revolve, loft): u32, u16, u32;
// (u16 1, u16 code 0x3a/0x3b), u32 n and n more such pairs (cuts add 0x3b), u16; u32, u32 (101 boss, 102 cut), u32 3;
// the bodies acted on (u32 count; per body u16, the body, u32, u32, the creating feature's id, u32, u32);
// u32 1, u16, u16
function bodyHeader(r,o){o.h0=[r.u32(),r.u16(),r.u32()];o.codes=[[r.u16(),r.u16()]];const nc=r.u32();for(let i=0;i<nc;i++)o.codes.push([r.u16(),r.u16()]);o.z=r.u16();
  o.h1=[r.u32(),r.u32(),r.u32()];const n=r.u32();o.scope=[];for(let i=0;i<n;i++)o.scope.push({a:r.u16(),body:r.object('scope body'),x:[r.u32(),r.u32(),r.u32(),r.u32(),r.u32()]});
  o.h2=[r.u32(),r.u16(),r.u16()];}
R.moExtrusion_c=(r,o)=>{feature(r,o);bodyHeader(r,o);o.bodies=r.object('per body chooser');
  o.y0=[r.u16(),r.u16()];o.bbox=r.object('bbox');o.y1=[r.u16(),r.u32()];o.owner=r.object('extrusion owner');o.y2=r.bytes(16).toString('hex');o.y3=r.u32();
  o.spec=r.objectAs('@x66','extrusion spec');
  o.end=r.object('end spec');
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
function topoRef(r,o){o.a=[r.u32(),r.u32()];o.kind=r.u32();o.b=r.u8();o.c=r.u16();o.c2=r.u8();o.tag=r.u32();o.key=[r.bytes(8).toString('hex'),r.bytes(8).toString('hex')];o.e=r.u16();if(o.c===3){o.reps=nullList(r,'face rep');o.x1=r.bytes(18).toString('hex');}else{o.rep=r.object('edge rep');o.x1=r.bytes(18).toString('hex');o.next=r.object('edge next');}}
// objects up to a null
function nullList(r,w){const out=[];for(;;){const x=r.object(w);if(!x)return out;out.push(x);}}
R.moFaceRef_c=topoRef;R.moEdgeRef_c=topoRef;
// how a face is named: a tree of surface-id representations, each pointing at the feature that made
// the face (moFR_c: the document/config object, feature id, feature creation time, sketch entity id)
R.moEndFaceSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.end=r.u32();o.b=r.u32();o.child=r.object('surf child');};
R.moFromSktEntSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.entity=r.u32();o.child=r.object('surf child');};
// side face from a sketch entity, with two more integers (−1, 0 in C04)
R.moFromSktEnt3IntSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.ints=[r.i32(),r.i32(),r.i32()];o.child=r.object('surf child');};
R.moEndFace3IntSurfIdRep_c=(r,o)=>{o.ctx=r.object('rep ctx');o.fr=r.object('surf fr');o.end=r.u32();o.b=r.u32();o.ints=[r.i32(),r.i32()];o.child=r.object('surf child');};
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
R.moCompEdge_c=(r,o)=>{o.comp=r.object('edge comp');o.a=r.u8();o.edge=r.object('edge ref');o.b=r.object('edge 2');o.x0=r.bytes(60).toString('hex');};
R.moFavoriteHandle_c=(r,o)=>{o.a=r.u32();o.b=r.i32();};
R.moFeatureDimHandle_c=(r,o)=>{o.x0=r.bytes(103).toString('hex');o.dim=r.object('dim');};
R.ParallelPlaneDistanceDim_c=(r,o)=>{o.a=r.u32();o.param=r.object('dim parameter');if(process.env.EX)console.error('after param',r.p,peek(r));};
// a dimension's value: the short node form (name, id -1), then the value in metres or radians
R.moLengthParameter_c=(r,o)=>{o.node=r.object('parameter node');o.value=r.f64();};
R.moAngleParameter_c=R.moLengthParameter_c;
// cut-extrude (ICE): laid out as the extrusion, with the cut body in the header's scope list
R.moICE_c=(r,o)=>R.moExtrusion_c(r,o);
// a solid body, named by one of its faces: component object, face reference
R.moCompSolidBody_c=(r,o)=>{o.comp=r.object('body comp');o.face=r.object('body face');};
// applied features (fillet, chamfer, shell): node, 58 bytes, the pre-loaded data object, u32, ...
function applied(r,o){feature(r,o);o.x0=r.bytes(58).toString('hex');o.data=r.objectAs('@x66','feature data');o.n=r.u32();o.target=r.object('applied target');
  if(process.env.AP)console.error('applied after ref',r.p,r.b.subarray(r.p,r.p+100).toString('hex'));}
R.Fillet_c=(r,o)=>{applied(r,o);o.edges=r.object('fillet edges');o.lists=[r.object(),r.object(),r.object()];o.x1=r.bytes(12).toString('hex');o.radii=r.object('fillet radii');
  o.y0=[r.u32(),r.u8()];o.list4=r.object('fillet list 4');o.y1=r.bytes(8).toString('hex');o.y2=r.bytes(4).toString('hex');o.y3=r.bytes(9).toString('hex');
  o.rho=[r.f64(),r.f64()];o.y4=[r.u8(),r.bytes(6).toString('hex'),r.u32()];o.y5=r.bytes(10).toString('hex');o.y6=r.u32();o.face=r.object('fillet face');
  o.edge2=r.object('fillet edge 2');o.z0=[r.u32(),r.i32(),r.i32(),r.u32(),r.u32(),r.u32(),r.u32(),r.u32()];o.radius=r.f64();o.edge3=r.object('fillet edge 3');
  o.tags=[r.u32(),r.u32(),r.u32(),r.u32(),r.u32()];o.z1=r.bytes(16).toString('hex');};
// a face: component object, u8, the face reference, a second object slot (null so far)
R.moCompFace_c=(r,o)=>{o.comp=r.object('face comp');o.a=r.u8();o.face=r.object('face ref');o.b=r.object('face 2');};
for(const c of ['Fillet_c','Chamfer_c','moShell_c','moRevolution_c','moLoft_c','moSplitLine_c'])if(!R[c])R[c]=(r,o)=>{feature(r,o);let h='';for(let p=r.p;p<r.p+72;p++){h+=r.b[p]===0?'..':r.b[p].toString(16).padStart(2,'0');if((p-r.p)%2==1)h+=' ';}console.error(c,'after node',r.p,h);throw Error(c+' at '+r.p);};
