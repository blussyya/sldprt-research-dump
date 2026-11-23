const {load,tail,display}=require('./lib.js');
const L=load(process.argv[2]);const d=display.extractDisplayLists(L.dl,false);
for(const f of d.faces.slice(0,3)){console.log(f.offset,f.geometryEnd,JSON.stringify(tail(L.dl,f)),f.metadata&&{off:f.metadata.offset,tag:f.metadata.typeTag,sf:f.metadata.scalarFlag,res:f.metadata.reserved},f.metadataError);}
