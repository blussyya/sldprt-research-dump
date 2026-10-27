const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const P=require(D+'parasolid/partition'),X=require(D+'parasolid/xt'),fs=require('fs');
const raw=fs.readFileSync(process.argv[2]),s=P.streams(raw),G=Buffer.from(P.GUID);
function secs(b){const B=Buffer.from(b),o=[];let i=B.indexOf(G);while(i>=4){const w=P.sections(b.subarray(0,i-4+4+B.readUInt32LE(i-4)),i-4);for(const x of w.out)if(x.kind!=='deltas')o.push(X.parse(x.body,true));i=B.indexOf(G,i+1);}return o;}
const want=process.argv[3]?new RegExp(process.argv[3]):/Partition$|LocalBodies$/;
for(const k of Object.keys(s).filter(k=>want.test(k)))for(const q of secs(s[k])){
  const by=new Map(q.nodes.map(n=>[n.index,n]));
  const val=n=>{if(!n)return '';const v=n.values.values;return Array.isArray(v)?(typeof v[0]==='string'?v.join(''):v.slice(0,6).join(',')):v;};
  const defName=d=>{const n=by.get(d);if(!n)return '?';const id=by.get(n.values.identifier);return id?(Array.isArray(id.values.string)?id.values.string.join(''):id.values.string):'?';};
  for(const b of q.nodes.filter(n=>n.type===12)){
    const faces=q.nodes.filter(n=>n.type===14&&(by.get(n.values.shell)||{}).values?.body===b.index).length;
    const attrs=q.nodes.filter(n=>n.type===81&&n.values.owner===b.index).map(a=>defName(a.values.definition)+'='+(Array.isArray(a.values.fields)?a.values.fields.map(f=>val(by.get(f))).join('|'):''));
    console.log(k.padEnd(40),'body',b.index,'type',b.values.body_type,'faces',faces,'|',attrs.join('  '));}}
