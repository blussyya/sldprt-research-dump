const C=require('./common');const f=process.argv[2];const L=C.load(f);console.log(Object.keys(L),L.error||'',L.display&&L.display.length,L.M&&L.M.faces.length);
