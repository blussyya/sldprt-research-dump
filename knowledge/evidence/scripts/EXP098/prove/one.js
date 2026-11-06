// usage: node one.js file name [step]  -> JSON on stdout
const lib=require('./lib'),fs=require('fs');
const [file,name,step]=process.argv.slice(2);
const raw=fs.readFileSync(file);const {all}=lib.configs(raw);
const r=lib.build(all,name,!!step);
if(step){fs.writeFileSync(step,r.step);delete r.step;}
console.log(JSON.stringify(r));
