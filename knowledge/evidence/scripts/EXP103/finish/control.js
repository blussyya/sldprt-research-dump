// EXP-103 (finish) control for dense.js: move every fitted intersection curve by 5e-8 m along a
// fixed direction before checking. The dense check must report about 5e-8 m (times the direction's
// component along each surface normal), not zero.
const R=process.env.CONV||'/home/user/solidworks-converters',F=require(R+'/src/brep/fit');
const ec=F.edgeCurve;F.edgeCurve=function(...a){const r=ec.apply(this,a);if(r&&r.curve&&r.curve.ctrl)r.curve={...r.curve,ctrl:r.curve.ctrl.map(p=>[p[0]+5e-8/Math.sqrt(3),p[1]+5e-8/Math.sqrt(3),p[2]+5e-8/Math.sqrt(3)])};return r;};
require('./dense.js');
