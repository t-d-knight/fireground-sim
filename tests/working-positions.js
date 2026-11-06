// A hose-work position can be inside a passable cell without being its centre.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const html=fs.readFileSync(process.env.SIM_HTML||path.resolve(__dirname,'..','dist/index.html'),'utf8')
 .replace('window.__sim={','window.__positionTest={firePathClear,navCell};window.__sim={');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
 try{
  for(const realMap of[false,true]){
   const p=await browser.newPage();await p.evaluate(()=>window.requestAnimationFrame=()=>0);await p.setContent(html,{waitUntil:'domcontentloaded'});
   const result=await p.evaluate(realMap=>{
    const w=window.__sim,n=w.NV,r=window.__positionTest;
    let start=[190,150],goal=[293.4119606206938,123.70633313592238];
    if(!realMap){n.spd=new Float32Array(n.w*n.h);for(let y=30;y<=210;y+=60)n.spd[r.navCell(190,y)]=12/3.6;goal=[100,30]}
    const route=w.navRoute(...start,...goal,null,80),end=route&&route.path.at(-1);
    return{route:!!route,gap:end&&Math.hypot(end[0]-goal[0],end[1]-goal[1]),passable:end&&n.spd[r.navCell(...end)]>0,fireClear:route&&r.firePathClear(route.path)};
   },realMap);
   assert.equal(result.route,true,JSON.stringify(result));assert.ok(result.gap<=80,JSON.stringify(result));assert.equal(result.passable,true);assert.equal(result.fireClear,true);
   console.log('OK',realMap?'real ignition-area obstacle permits a reachable hose position':'working endpoint uses reachable cell interior within hose range');await p.close();
  }
  const p=await browser.newPage();await p.evaluate(()=>window.requestAnimationFrame=()=>0);await p.setContent(html,{waitUntil:'domcontentloaded'});
  const tooFar=await p.evaluate(()=>{const w=window.__sim,n=w.NV,r=window.__positionTest;n.spd=new Float32Array(n.w*n.h);for(let y=30;y<=210;y+=60)n.spd[r.navCell(190,y)]=12/3.6;return w.navRoute(190,150,0,30,null,80)===null});
  assert.equal(tooFar,true);console.log('OK inaccessible work beyond hose reach remains rejected');await p.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
