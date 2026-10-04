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
