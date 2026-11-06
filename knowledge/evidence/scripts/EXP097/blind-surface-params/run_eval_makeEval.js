'use strict';
// same dispatch as run_eval.js, shared so outlier analysis uses the identical evaluators
const O=require('./own_eval.js');
function makeEval(node,nodeAt,mode){
  switch(node.name){
    case 'PLANE':return O.planeEval(node);
    case 'CYLINDER':return O.cylinderEval(node);
    case 'CONE':return O.coneEval(node);
    case 'SPHERE':return O.sphereEval(node);
    case 'B_SURFACE':return O.nurbsSurfaceEval(nodeAt(node.values.nurbs),nodeAt,mode&&mode.order?mode.order:'vfast');
    case 'SWEPT_SURF':return O.sweptEval(node,nodeAt,mode&&mode.sweep?mode.sweep:'unit');
  }
  return null;
}
module.exports={makeEval};
