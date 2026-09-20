#!/usr/bin/env node
'use strict';
/**
 * Static server for the browser viewer.
 *
 * Serves the repository root so viewer/web/index.html can reach the real files it depends on
 * (viewer/mesh-data.js, viewer/inflate.js and both parser cores) instead of carrying copies.
 * Node's built-in http and fs only -- no dependencies, like the rest of the project.
 *
 *   node viewer/serve.js                 http://localhost:8080/viewer/web/index.html
 *   node viewer/serve.js --port 9000
 *   node viewer/serve.js --open          also launch the default browser
 *   node viewer/serve.js --host 0.0.0.0  listen on every interface (default: localhost only)
 *
 * Ctrl-C to stop.
 */
const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');
const {spawn}=require('child_process');

const ROOT=path.resolve(__dirname,'..');
const ENTRY='/viewer/web/index.html';

const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8',
 '.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8',
 '.md':'text/plain; charset=utf-8','.wasm':'application/wasm','.map':'application/json',
 '.stl':'application/octet-stream','.step':'text/plain; charset=utf-8',
 '.sldprt':'application/octet-stream'};

function arg(name,def){
 const i=process.argv.indexOf(name);
 return i>=0&&process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:def;
}
const has=n=>process.argv.indexOf(n)>=0;

function send(res,code,body,type,extra){
 res.writeHead(code,Object.assign({'Content-Type':type||'text/plain; charset=utf-8',
   'Cache-Control':'no-store'},extra||{}));
 res.end(body);
}

const server=http.createServer(function(req,res){
 let pathname;
 try{ pathname=decodeURIComponent(url.parse(req.url).pathname||'/'); }
 catch(e){ return send(res,400,'Bad request'); }

 if(pathname==='/'||pathname==='/index.html')
  return send(res,302,'',null,{Location:ENTRY});

 // Browsers request this unprompted; answering keeps the console clean.
 if(pathname==='/favicon.ico')
  return send(res,204,'');

 // Resolve inside the repository root; anything that escapes it is refused.
 const target=path.resolve(ROOT,'.'+path.posix.normalize(pathname));
 if(target!==ROOT&&!target.startsWith(ROOT+path.sep))
  return send(res,403,'Forbidden');

 fs.stat(target,function(err,st){
  if(err||!st.isFile())
   return send(res,404,'Not found: '+pathname+'\n');
  const type=TYPES[path.extname(target).toLowerCase()]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Content-Length':st.size,'Cache-Control':'no-store'});
  fs.createReadStream(target).pipe(res);
 });
});

function openBrowser(target){
 const cmd=process.platform==='darwin'?'open':process.platform==='win32'?'start':'xdg-open';
 const child=process.platform==='win32'
  ? spawn('cmd',['/c','start','',target],{detached:true,stdio:'ignore'})
  : spawn(cmd,[target],{detached:true,stdio:'ignore'});
 child.on('error',function(){ /* no browser here; the URL is printed anyway */ });
 child.unref();
}

function listen(port,attempt){
 server.once('error',function(e){
  if(e.code==='EADDRINUSE'&&attempt<12){
   console.log('port '+port+' busy, trying '+(port+1)+'…');
   return listen(port+1,attempt+1);
  }
  console.error('cannot listen: '+e.message);
  process.exit(1);
 });
 server.listen(port,host,function(){
  const shown=host==='0.0.0.0'?'localhost':host;
  const link='http://'+shown+':'+port+ENTRY;
  console.log('');
  console.log('  DisplayLists viewer  ' + link);
  console.log('  serving              ' + ROOT);
  console.log('  stop                 Ctrl-C');
  console.log('');
  if(has('--open'))openBrowser(link);
 });
}

const host=arg('--host','127.0.0.1');
listen(Number(arg('--port','8080')),0);

process.on('SIGINT',function(){ console.log('\nstopped'); process.exit(0); });
