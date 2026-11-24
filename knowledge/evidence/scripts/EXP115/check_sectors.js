// EXP-115: sectorCycles against the reference reader's boundaryCycles. On faces the old code
// handles, the two must give the same cycles (compared as sets of welded segments). On faces it
// gives up on, report whether every cut segment is covered and how often.
const S=require('/home/user/solidworks-converters/src'),{sectorCycles}=require('./sectors.js'),fs=require('fs');
const sig=(f,cs)=>{const key=i=>f.vertices[3*i]+','+f.vertices[3*i+1]+','+f.vertices[3*i+2];
  return cs.map(c=>c.vertices.map((v,i)=>{const a=key(v),b=key(c.vertices[(i+1)%c.vertices.length]);return a<b?a+'|'+b:b+'|'+a;}).sort().join(';')).sort().join('#');};
const tot={files:0,faces:0,same:0,differ:0,newErr:0,amb:0,ambOk:0,ambErr:0,ambCycles:0,ambSegsTwice:0};const ex=[];
for(const file of process.argv.slice(2)){let d;try{d=S.parse(fs.readFileSync(file));}catch(e){continue;}tot.files++;
  d.faces.forEach((f,fi)=>{if(!f.edgeAnnotations||f.noEdgeTable)return;
    if(f.boundaryCycles){tot.faces++;let nc;try{nc=sectorCycles(f);}catch(e){tot.newErr++;if(ex.length<6)ex.push([file.slice(-30),fi,'new error',e.message]);return;}
      if(sig(f,nc)===sig(f,f.boundaryCycles))tot.same++;else{tot.differ++;if(ex.length<6)ex.push([file.slice(-30),fi,'differs',f.boundaryCycles.length,nc.length]);}}
    else if(/Ambiguous/.test(f.boundaryError||'')){tot.amb++;try{const nc=sectorCycles(f);tot.ambOk++;tot.ambCycles+=nc.length;
        const cnt=new Map();const key=i=>f.vertices[3*i]+','+f.vertices[3*i+1]+','+f.vertices[3*i+2];
        for(const c of nc)c.vertices.forEach((v,i)=>{const a=key(v),b=key(c.vertices[(i+1)%c.vertices.length]),k=a<b?a+'|'+b:b+'|'+a;cnt.set(k,(cnt.get(k)||0)+1);});
        tot.ambSegsTwice+=[...cnt.values()].filter(x=>x===2).length;
      }catch(e){tot.ambErr++;if(ex.length<10)ex.push([file.slice(-30),fi,'amb error',e.message]);}}
  });}
console.log(JSON.stringify(tot));for(const e of ex)console.log('  ',JSON.stringify(e));
