/* Optional real-browser smoke test. Start ../serve.js first. Requires Playwright + Chromium. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.VIEWER_URL||'http://127.0.0.1:8080/parser/v0.3/web/index.html');
 await page.click('#legacy-demo');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('11 faces'));
 const data=fs.readFileSync(path.resolve(__dirname,'../../../test files new/SW2022/C15_torus/model.SLDPRT'));
 await page.setInputFiles('#file',{name:'external-copy.SLDPRT',mimeType:'application/octet-stream',buffer:data});
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('modern DisplayLists')&&document.querySelector('#status').textContent.includes('1 faces'));
 // Exercise actual drop handler with an arbitrary filename, not a corpus lookup.
 const legacy=fs.readFileSync(path.resolve(__dirname,'../../../test files new/SW2011/C10_cube_shell_1mm/model.SLDPRT')).toString('base64');
 await page.evaluate(base64=>{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([bytes],'dropped-part.SLDPRT'));window.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true}));},legacy);
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('legacy OLE2')&&document.querySelector('#status').textContent.includes('11 faces'));
 await page.click('#t-sheet');await page.waitForFunction(()=>document.querySelector('#sheet-img').naturalWidth>0);
 assert.deepEqual(await page.locator('#sheet-img').evaluate(e=>[e.naturalWidth,e.naturalHeight]),[1584,1058]);
 assert((await page.locator('#sheet-download').getAttribute('href')).startsWith('data:image/png'));
 await page.setInputFiles('#file',{name:'invalid.SLDPRT',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')});
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Could not load'));
 assert.equal(await page.locator('#r-faces').innerText(),'11');
 assert.deepEqual(errors,[]);
 console.log('Browser smoke passed: modern/legacy file input, external drop, PNG sheet, invalid input.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
