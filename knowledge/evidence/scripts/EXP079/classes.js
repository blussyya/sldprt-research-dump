'use strict';
const {READ,feature}=require('./archive');
const R=READ;
// ---- folders: the feature base, then a class-specific tail ----
R.moCommentsFolder_c=(r,o)=>{feature(r,o);};
R.moFavoriteFolder_c=(r,o)=>{feature(r,o);o.x=[r.u32(),r.u32()];};
R.moHistoryFolder_c=(r,o)=>{feature(r,o);const n=r.count();o.items=[];for(let i=0;i<n;i++)o.items.push(r.object('history item'));};
R.moHistoryFeatItemData_c=(r,o)=>{o.raw=r.bytes(22).toString('hex');o.comp=r.object('history comp');};
R.moCompFeature_c=(r,o)=>{o.comp=r.object('comp');};
R['@comp']=(r,o)=>{o.raw=r.bytes(87).toString('hex');};
R.moSelectionSetFolder_c=(r,o)=>{feature(r,o);o.x=[r.u16(),r.u32()];};
for(const c of ['moSensorFolder_c','moDocsFolder_c','moInkMarkupFolder_c','moEqnFolder_c'])R[c]=(r,o)=>{feature(r,o);};
R.moSurfaceBodyFolder_c=(r,o)=>{feature(r,o);o.x=r.bytes(12).toString('hex');};
R.moSolidBodyFolder_c=(r,o)=>{feature(r,o);o.x=r.bytes(12).toString('hex');o.body=r.object('solid body folder');};
R.moMaterialFolder_c=(r,o)=>{feature(r,o);o.material=r.str();o.x=r.u32();};
R.moRefPlane_c=(r,o)=>{feature(r,o);o.x=r.bytes(146).toString('hex');o.data=r.object('ref plane data');};
// default plane: origin, normal, optional 3×3 rotation (Top and Right have one, Front doesn't), then display data
R.moDefaultRefPlnData_c=(r,o)=>{o.origin=r.vec();o.normal=r.vec();o.hasRot=r.u8();if(o.hasRot)o.rot=[r.vec(),r.vec(),r.vec()];o.v=r.vec();o.display=r.bytes(96).toString('hex');};
R.moOriginProfileFeature_c=(r,o)=>{feature(r,o);o.x=r.bytes(6).toString('hex');o.sketch=r.object('origin sketch');};
R.moDetailCabinet_c=(r,o)=>{feature(r,o);};
// the closing note ('…___EndTag___') carries the opening note, 32 bytes of settings and itself
R.moNotesAreaFtrFolder_c=(r,o)=>{feature(r,o);if(/___EndTag___$/.test(o.name)){o.open=r.object('notes open');o.x=r.bytes(32).toString('hex');o.self=r.object('notes self');}};
// ---- sketches (EXP-079) ----
// shared graphics/attribute block of sketch objects: 35 bytes, one object pointer (an external
// reference such as "coincident with the Origin", else null), 27 bytes
function attrs(r){const a={};a.x0=r.bytes(35).toString('hex');a.ext=r.object('entity external ref');a.x1=r.bytes(27).toString('hex');return a;}
// a sketch point written inline: handles of the entities meeting there, fixed fields, id, attributes, x, y
function sketchPoint(r){const p={};const n=r.u16();p.uses=[];for(let i=0;i<n;i++)p.uses.push(r.object('point uses'));
  p.x0=r.bytes(48).toString('hex');p.id=r.u32();p.attrs=attrs(r);p.kind=r.u16();p.x=r.f64();p.y=r.f64();p.z0=r.u16();return p;}
R.sgLineHandle=(r,o)=>{o.id=r.u16();o.a=r.i32();o.b=r.u32();};
R.sgSketch=(r,o)=>{o.pre=r.bytes(14).toString('hex');o.attrs=attrs(r);o.kind=r.u16();o.x0=r.bytes(18).toString('hex');
  o.points=[];if(process.env.SKETCH_POINTS){for(let i=0;i<+process.env.SKETCH_POINTS;i++)o.points.push(sketchPoint(r));}};
R.sgExtEnt_c=(r,o)=>{if(process.env.DUMPEXT)console.error('EXT at',r.p,r.b.subarray(r.p,r.p+40).toString('hex'));};
