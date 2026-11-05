'use strict';
const fs=require('fs'),path=require('path'),P=require('../../../../../package/src/parasolid/partition'),{extract}=require('./export');
const root=path.resolve(__dirname,'../../../../..'),rows=require('./survey.json');
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const out=[];
for(const row of rows.filter(r=>r.complete)){
 const file=path.join(root,row.file),x=extract(file),streams=P.streams(fs.readFileSync(file));
 const b=Object.entries(streams).find(([k])=>/KeyWords$/.test(k))?.[1];if(!b){out.push({file:row.file,missing:true});continue;}
 const xml=b.toString('utf8'),nodes=[];
 for(const m of xml.matchAll(/<(Feature|Sketch|Extrusion|Revolve|Blend|Fillet|Chamfer|Shell)\b([^>]*)>/g)){
  const attrs=Object.fromEntries([...m[2].matchAll(/([\w]+)="([^"]*)"/g)].map(a=>[a[1],decode(a[2])]));if(attrs.id!==undefined)nodes.push({id:+attrs.id,...attrs});
 }
 const comparisons=x.features.filter(f=>f.id!==4294967295).map(f=>{const n=nodes.filter(n=>+n.id===f.id);return {id:f.id,name:f.name,xmlNames:n.map(n=>n.Name),match:n.some(n=>n.Name===f.name)};});
 const children=nodes.filter(n=>n.DissectableChildren).map(n=>({owner:+n.id,xml:n.DissectableChildren,binary:x.children.filter(c=>c.owner===+n.id).map(c=>c.child)}));
 out.push({file:row.file,matched:comparisons.filter(c=>c.match).length,unmatched:comparisons.filter(c=>!c.match),children});
}
console.log(JSON.stringify(out,null,2));
