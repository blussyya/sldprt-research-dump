const S=require(process.env.CONV+'/src');
for(const f of process.argv.slice(2)){const n=require('path').basename(f).slice(0,8);
  try{const r=S.toSTEP(f,{name:n});console.log(n,'wrote',r.text.length,'bytes, maxError',r.report.maxError);}
  catch(e){console.log(n,'refused:',e.message);}}
