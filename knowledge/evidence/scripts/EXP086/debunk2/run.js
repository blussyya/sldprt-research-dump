const {ev,foot,range,dist}=require('./bs.js');const D=require('./data.json');
D.surfs.forEach((s,k)=>{const S=s.b;const r=range(S);console.log('surf',k,'d',s.d,'ranges',JSON.stringify(r),'deg',S.du,S.dv,'ctrl',S.ctrl.length,S.ctrl[0].length,'w',!!S.weights);});
for(const model of ['clamp','poly','tan','quad']){
 console.log('MODEL',model);
 D.chart.forEach((P,i)=>{let row=[i];D.surfs.forEach(s=>{const f=foot(s.b,P,model);const r=range(s.b);row.push(((f.d-0.009)*1e6).toFixed(1)+'um @('+f.u.toFixed(3)+','+f.v.toFixed(3)+')');});console.log(row.join(' | '));});
}
