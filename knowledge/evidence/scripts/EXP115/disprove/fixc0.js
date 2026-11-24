// chainwheel control-0 strips (3 vertices): swap the first two ids after the control token
function fixC0(f){
  const ann=f.edgeAnnotations.map(e=>({...e}));
  const by=new Map();ann.forEach(e=>{if(!by.has(e.strip))by.set(e.strip,[]);by.get(e.strip).push(e);});
  for(const [s,l] of by)if(f.stripControls[s]===0&&f.stripLengths[s]===3&&l.length===3){const t=[l[0].id,l[1].id,l[2].id];l[0].id=t[1];l[1].id=t[0];}
  return {...f,edgeAnnotations:ann};
}
module.exports={fixC0};
