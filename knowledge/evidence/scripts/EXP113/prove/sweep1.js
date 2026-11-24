'use strict';
/* Claim 1 sweep. Every display vertex of a cylinder or cone face: closed-form distance to the surface.
 * Vertices more than 1e-7 m off are classified by their place in the face's boundary cycle:
 *   mid    vertex between two boundary segments of the same native edge: chord test + curve distance
 *   corner boundary vertex where the edge id changes
 *   interior not on a boundary cycle
 * usage: node sweep1.js out.json file...   (one process, files in turn) */
const fs=require('fs'),L=require('./lib');
const FLAG=1e-7;
function cls(ctx,ci,i,P,withFins){   // P(v) -> [x,y,z] for vertex index v (lets the controls move a vertex)
  const cy=ctx.cycles[ci],n=cy.vertices.length,v=cy.vertices[i],a=cy.vertices[(i-1+n)%n],b=cy.vertices[(i+1)%n];
  const ep=cy.edgeIds[(i-1+n)%n],en=cy.edgeIds[i];
  const pv=P(v),pa=P(a),pb=P(b);
  const Q=Math.max(...[pv,pa,pb].flat().map(L.ulp32));
  const o={v,Q,dSurf:L.surfDist(ctx.nf.surface,pv),kind:ep===en?'mid':'corner',edgeId:en,edgeIdPrev:ep};
  if(o.kind==='mid'){o.dChord=L.segDist(pv,pa,pb);o.chordBar=2*Q;o.isChord=o.dChord<=o.chordBar;
    const cs=L.edgeCurves(ctx.M,ctx.nf,en,withFins);o.lenAB=L.dist(pa,pb);o.dVA=L.dist(pv,pa);o.dVB=L.dist(pv,pb);o.curves=cs.map(c=>({name:c.name,tol:c.tol,extra:!!c.extra,d:c.f?L.curveDist(c.f,pv):null}));
    const ds=o.curves.filter(c=>c.d!==null&&!c.extra).map(c=>c.d);o.dCurve=ds.length?Math.min(...ds):null;const fs_=o.curves.filter(c=>c.d!==null&&c.extra).map(c=>c.d);o.dFin=fs_.length?Math.min(...fs_):null;o.nullCurve=o.curves.some(c=>c.d===null&&!c.extra);o.pos=pv;o.curveBar=Q+1e-10;}
  if(o.kind==='corner'){   // nearest native vertex of this face
    let best=null;for(const l of ctx.nf.loops)for(const c of l.coedges){const e=ctx.M.edges.get(c.edge);if(!e.v)continue;for(const id of e.v){if(id===null)continue;const nv=ctx.M.vertices.get(id),d=L.dist(nv.p,pv);if(!best||d<best.d)best={d,tol:nv.tolerance,dSurfNative:L.surfDist(ctx.nf.surface,nv.p)};}}
    o.nativeVertex=best;}
  return o;
}
function main(){
  const out=process.argv[2],files=process.argv.slice(3),res={files:{},flagged:[],control:{onSurfaceMid:{n:0,over:0,max:0,byType:{}},moved:{n:0,caught:0,notChord:0},synthChord:{n:0,chord:0,flagged:0,flaggedChord:0}},skipped:[],controlFails:[],ctrlRows:[],coverage:{}};
  for(const file of files){
    const parts=file.split('/'),name=/^model\./i.test(parts[parts.length-1])?parts[parts.length-2]+'/model':parts[parts.length-1];let W;
    try{W=L.load(file);}catch(e){res.skipped.push([name,e.message.slice(0,80)]);continue;}
    for(const df of W.df.filter(x=>x.metadata&&(x.metadata.typeTag===4002||x.metadata.typeTag===4003))){}
    {const cv=res.coverage[name]={tag4002:0,tag4003:0,joined:0,unjoined:0,joinHow:{}};
     W.df.forEach((df,k)=>{const t=df.metadata.typeTag;if(t!==4002&&t!==4003)return;t===4002?cv.tag4002++:cv.tag4003++;if(W.j[k].face)cv.joined++;else cv.unjoined++;cv.joinHow[W.j[k].how]=(cv.joinHow[W.j[k].how]||0)+1;});}
    const fr={faces:0,verts:0,flagged:0,noCycle:0,dupCopies:0};
    let nExpensive=0,nMove=0;
    W.df.forEach((df,k)=>{
      const m=W.j[k];if(!m.face)return;const t=m.face.surface.type;if(t!=='cylinder'&&t!=='cone')return;
      fr.faces++;fr.verts+=df.vertexCount;
      const V=df.vertices,P=v=>[V[3*v],V[3*v+1],V[3*v+2]];
      const cycles=df.boundaryError||!df.boundaryCycles?null:df.boundaryCycles;
      const ctx={M:W.M,nf:m.face,cycles};
      // strips repeat vertices: a position is one vertex however many copies the strips hold
      const key=v=>V[3*v]+','+V[3*v+1]+','+V[3*v+2];
      const seen=new Set(),flagged=new Set(),fk=new Set();
      for(let v=0;v<df.vertexCount;v++)if(Math.abs(L.surfDist(m.face.surface,P(v)))>FLAG&&!fk.has(key(v))){flagged.add(v);fk.add(key(v));}
      fr.dupCopies=(fr.dupCopies||0)+df.vertexCount-new Set(Array.from({length:df.vertexCount},(_,v)=>key(v))).size;
      if(!cycles){fr.noCycle++;for(const v of flagged)res.flagged.push({file:name,face:m.face.id,surf:t,v,kind:'nocycle',dSurf:L.surfDist(m.face.surface,P(v))});fr.flagged+=flagged.size;return;}
      cycles.forEach((cy,ci)=>cy.vertices.forEach((v,i)=>{
        const isF=fk.has(key(v));
        // controls on the same walk
        if(!isF){
          const cheap=true;
          const o0=cls({...ctx},ci,i,P);
          if(o0.kind==='mid'&&o0.dCurve!==null){
            const types=o0.curves.map(c=>c.name).join('|');
            const slow=!/^(line|circle)/.test(types);
            if(!slow||nExpensive++<6){
              const c=res.control.onSurfaceMid;c.n++;const bt=c.byType[types]||(c.byType[types]={n:0,over:0,max:0});bt.n++;
              res.ctrlRows.push([types.slice(0,24),o0.dSurf,o0.dCurve,o0.Q]);const r=o0.dCurve/o0.curveBar;c.max=Math.max(c.max,r);bt.max=Math.max(bt.max,r);if(o0.dCurve>o0.curveBar){c.over++;bt.over++;if(res.controlFails.length<400)res.controlFails.push({file:name,face:m.face.id,surf:t,v,edgeId:o0.edgeId,dSurf:o0.dSurf,dCurve:o0.dCurve,Q:o0.Q,dChord:o0.dChord,curves:o0.curves});}
            }
          }
          if(o0.kind==='mid'&&nMove<12&&Math.abs(o0.dSurf)<=FLAG){nMove++;
            // moved vertex: 3e-7 or 20 ulp, whichever is bigger, radially outward from the axis
            const s=m.face.surface,p=P(v),q=L.sub(p,s.p),h=L.dot(q,s.a),rad=L.sub(q,L.mul(s.a,h)),rn=L.nrm(rad);
            const dm=Math.max(3e-7,20*o0.Q),pm=L.add(p,L.mul(rad,dm/rn));
            const o1=cls(ctx,ci,i,u=>u===v?pm:P(u));
            const c=res.control.moved;c.n++;if(Math.abs(o1.dSurf)>FLAG)c.caught++;if(!o1.isChord)c.notChord++;
            // synthetic chord point: float32 midpoint of its two neighbours
            const n=cy.vertices.length,pa=P(cy.vertices[(i-1+n)%n]),pb=P(cy.vertices[(i+1)%n]);
            const mid=L.mul(L.add(pa,pb),0.5).map(Math.fround);
            const o2=cls(ctx,ci,i,u=>u===v?mid:P(u));
            const sc=res.control.synthChord;sc.n++;if(o2.isChord)sc.chord++;if(Math.abs(o2.dSurf)>FLAG){sc.flagged++;if(o2.isChord)sc.flaggedChord++;}
          }
        }
        if(isF&&!seen.has(key(v))){seen.add(key(v));
          const o=cls(ctx,ci,i,P,true);res.flagged.push({file:name,face:m.face.id,surf:t,...o,dSurfAbs:Math.abs(o.dSurf)});}
      }));
      // interior (in no cycle)
      for(const v of flagged)if(!seen.has(key(v)))res.flagged.push({file:name,face:m.face.id,surf:t,v,kind:'interior',dSurf:L.surfDist(m.face.surface,P(v))});
      fr.flagged+=flagged.size;
    });
    res.files[name]=fr;
  }
  fs.writeFileSync(out,JSON.stringify(res));
  const tot=Object.values(res.files).reduce((a,f)=>({faces:a.faces+f.faces,verts:a.verts+f.verts,flagged:a.flagged+f.flagged,noCycle:a.noCycle+f.noCycle}),{faces:0,verts:0,flagged:0,noCycle:0});
  console.log(JSON.stringify({totals:tot,skipped:res.skipped.length,control:res.control}));
}
main();
