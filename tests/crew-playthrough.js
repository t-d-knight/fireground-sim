// Mission-level invariants from normal-play failures: weather travel, contact,
// bounded roles, provisional shoulder work and refill replacement.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const html=fs.readFileSync(path.resolve(__dirname,'..','dist','index.html'),'utf8').replace('window.__sim={',`window.__crewTest={mkUnit,autoStep,crewStep,lineTask,linePlan,lineWork,linePoint,lineState,playerHeadGoal,playerHeadInPosition,playerHeadPincer,assignPlayerHeadRoles,firePathClear,fireRouteRisk,moveUnits,holdPlayerHead,neFrontSupported,supportNEFront,playerNEIndex,chooseWork,taskAuto,TACTICS,COORD,edgePt,blockJob(l){const original=reroute2;window.__routeAttempts=[];reroute2=(u,...args)=>{window.__routeAttempts.push(u.target.lobe===l?'blocked':'other');if(u.target.lobe===l){NV.budget--;return false}return original(u,...args)}},blockShoulder(side){const original=reroute2;reroute2=(u,...args)=>{if(u.target.shoulder===side){NV.budget--;return false}return original(u,...args)}}};window.__sim={`);
(async()=>{const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
 async function check(name,run,verify){const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));try{await page.evaluate(()=>window.requestAnimationFrame=()=>0);await page.setContent(html,{waitUntil:'domcontentloaded'});verify(await page.evaluate(run));assert.deepEqual(errors,[]);console.log('OK',name)}catch(e){console.error('FAIL',name,e);process.exitCode=1}finally{await page.close()}}
 try{
 await check('a gust pauses the work approach without cancelling safe distant travel',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=true;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);
  const u=r.mkUnit({type:'TK',name:'approaching crew',x:5300,y:-3200});w.units.push(u);w.issue(u,'direct',Math.SQRT1_2*w.F.s,-Math.SQRT1_2*w.F.s,{playerClick:true});
  const far={moving:u.state==='moving',hold:!!u.headHold,clear:u.path&&r.firePathClear(u.path)},g=r.playerHeadGoal(u);u.x=g[0]+Math.SQRT1_2*60;u.y=g[1]+Math.SQRT1_2*60;w.S.t=99;r.autoStep();const near=u.headHold&&u.state==='idle'&&!u.path;
  w.F.gust=false;w.S.t=100-u.id;w.NV.budget=4;r.autoStep();return{far,near,resumes:!u.headHold&&u.state==='moving'&&!!u.path};
 },x=>{assert.equal(x.far.moving,true);assert.equal(x.far.hold,false);assert.equal(x.far.clear,true);assert.equal(x.near,true);assert.equal(x.resumes,true)});
 await check('a crew outside working contact replans instead of sitting in the 280–320 m dead band',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);
  const u=r.mkUnit({type:'TK',name:'drifting crew',state:'attack',tac:'direct',target:{type:'head',playerHead:true,focusMain:true,shoulder:1,headRole:'pressure'}});w.units.push(u);const g=r.playerHeadGoal(u);u.x=g[0]-Math.SQRT1_2*300;u.y=g[1]+Math.SQRT1_2*300;const before=r.playerHeadInPosition(u);w.S.t=100-u.id;w.NV.budget=4;r.autoStep();return{before,moving:u.state==='moving'&&!!u.path};
 },x=>{assert.equal(x.before,false);assert.equal(x.moving,true)});
 await check('a ten-tanker head mission has bounded pressure, follow-up and reserve roles',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;
  for(let i=0;i<10;i++){const side=i%2?1:-1,u=r.mkUnit({type:'TK',name:'crew '+i,x:Math.SQRT1_2*5000+side*1000,y:-Math.SQRT1_2*5000+side*1000,tac:'direct',target:{type:'head',playerHead:true,focusMain:true,shoulder:side}});w.units.push(u)}
  r.assignPlayerHeadRoles();const counts={};let max=0;for(const u of w.units){counts[u.target.headRole]=(counts[u.target.headRole]||0)+1;const g=r.playerHeadGoal(u);max=Math.max(max,Math.hypot(g[0]-Math.SQRT1_2*6000,g[1]+Math.SQRT1_2*6000))}return{counts,max,pressureSides:w.units.filter(u=>u.target.headRole==='pressure').map(u=>u.target.shoulder)};
 },x=>{assert.deepEqual(x.counts,{pressure:4,followup:4,relief:2});assert.ok(x.max<1200);assert.equal(x.pressureSides.filter(v=>v===1).length,2);assert.equal(x.pressureSides.filter(v=>v===-1).length,2)});
 await check('disconnected shoulder follow-up stays provisional until the anchored flank connects',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;
  for(let slot=0;slot<2;slot++)w.units.push(r.mkUnit({type:'TK',name:'follow-up '+slot,state:'attack',tac:'direct',cap:10000,water:10000,res:500,target:{type:'head',playerHead:true,focusMain:true,shoulder:1,headRole:'followup',headSlot:slot}}));
  for(let i=0;i<350;i++){w.S.t++;for(const u of w.units){const g=r.playerHeadGoal(u);u.x=g[0];u.y=g[1]}r.crewStep()}
  const data=w.F.lineL,p=r.linePlan(1),knock=Object.values(data.knock).filter(v=>v>=1).length,mop=Object.values(data.mop).filter(v=>v>=1).length,disconnected=[...w.F.hL].reduce((a,b)=>a+b,0),lo=p.end-r.COORD.spacing;
  for(let i=p.anchor;i<lo;i++)w.F.hL[i]=1;w.S.t++;r.crewStep();return{knock,mop,disconnected,connected:[...w.F.hL].slice(lo,p.end+1).every(Boolean),pinched:!!w.F.pinched};
 },x=>{assert.ok(x.knock>0);assert.ok(x.mop>0);assert.equal(x.disconnected,0);assert.equal(x.connected,true);assert.equal(x.pinched,false)});
 await check('a local follow-up crew replaces a refilling pressure crew without overallocating the head',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;
  for(let i=0;i<10;i++)w.units.push(r.mkUnit({type:'TK',name:'crew '+i,state:'attack',tac:'direct',target:{type:'head',playerHead:true,focusMain:true,shoulder:i%2?1:-1}}));r.assignPlayerHeadRoles();for(const u of w.units){const g=r.playerHeadGoal(u);u.x=g[0];u.y=g[1]}
  const leaving=w.units.find(u=>u.target.shoulder===1&&u.target.headRole==='pressure'),oldFollowers=new Set(w.units.filter(u=>u.target.shoulder===1&&u.target.headRole==='followup').map(u=>u.id));leaving.state='filling';leaving.target=null;r.assignPlayerHeadRoles();const pressure=w.units.filter(u=>u.target&&u.target.shoulder===1&&u.target.headRole==='pressure');return{count:pressure.length,promoted:pressure.some(u=>oldFollowers.has(u.id))};
 },x=>{assert.equal(x.count,2);assert.equal(x.promoted,true)});
 await check('advancing one head bin does not abandon a partially knocked-down shoulder segment',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;
  const u=r.mkUnit({type:'TK',name:'steady follow-up',state:'attack',tac:'direct',target:{type:'head',playerHead:true,focusMain:true,shoulder:1,headRole:'followup',headSlot:0}});w.units.push(u);
  const first=r.lineTask(u,u.target);u.x=first.goal[0];u.y=first.goal[1];for(let i=0;i<5;i++){w.S.t++;r.lineWork(u,1)}const partial=first.data.knock[first.i];w.F.s+=40;const after=r.lineTask(u,u.target);for(let i=0;i<50;i++){w.S.t++;const q=r.lineTask(u,u.target);u.x=q.goal[0];u.y=q.goal[1];r.lineWork(u,1)}return{partial,same:first.i===after.i,completed:first.data.knock[first.i]>=1};
 },x=>{assert.ok(x.partial>0&&x.partial<1);assert.equal(x.same,true);assert.equal(x.completed,true)});
 await check('nearby follow-up crews keep their roles when their distance ranking changes',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;
  for(let i=0;i<10;i++)w.units.push(r.mkUnit({type:'TK',name:'steady crew '+i,state:'attack',tac:'direct',target:{type:'head',playerHead:true,focusMain:true,shoulder:i%2?1:-1}}));r.assignPlayerHeadRoles();for(const u of w.units){const q=r.playerHeadGoal(u);u.x=q[0];u.y=q[1]}
  const crew=w.units.filter(u=>u.target.headRole==='followup'&&u.target.shoulder===1),before=crew.map(u=>u.target.headSlot);crew[0].x-=Math.SQRT1_2*120;crew[0].y+=Math.SQRT1_2*120;r.assignPlayerHeadRoles();return{before,after:crew.map(u=>u.target.headSlot),roles:crew.map(u=>u.target.headRole)};
 },x=>{assert.deepEqual(x.after,x.before);assert.ok(x.roles.every(v=>v==='followup'))});
 await check('a pending water journey cannot be replaced by automatic combat tasking',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=4000;w.F.hwL.fill(300);w.F.hwR.fill(300);const u=r.mkUnit({type:'TK',name:'waiting for water',x:2000,y:-2000,water:601,res:600,autoManaged:true,waterWait:true});w.units.push(u);w.S.t=100-u.id;w.NV.budget=4;r.autoStep();return{target:u.target,state:u.state,wait:u.waterWait};
 },x=>{assert.equal(x.target,undefined);assert.equal(x.state,'idle');assert.equal(x.wait,true)});
 await check('settled head reserves patrol locally and pick up a small nearby spot',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;
  for(let i=0;i<10;i++)w.units.push(r.mkUnit({type:'TK',name:'reserve crew '+i,state:'attack',tac:'direct',target:{type:'head',playerHead:true,focusMain:true,shoulder:i%2?1:-1}}));r.assignPlayerHeadRoles();for(const u of w.units){const q=r.playerHeadGoal(u);u.x=q[0];u.y=q[1]}
  for(let i=100;i<110;i++){w.S.t=i;w.NV.budget=4;r.autoStep()}const reserve=w.units.filter(u=>u.target.headRole==='relief'),u=reserve[0],before=u.water,l={ox:u.x-30,oy:u.y,dx:1,dy:0,s:60,lb:5,kind:'s',held:false,work:0};w.F.lobes.push(l);
  for(let i=0;i<100;i++){w.S.t++;r.crewStep()}return{patrol:reserve.every(u=>u.state==='patrol'),spot:l.held,used:before-u.water};
 },x=>{assert.equal(x.patrol,true);assert.equal(x.spot,true);assert.ok(x.used>=0&&x.used<100)});
 await check('a patrolling shoulder crew resumes work when the advancing head exposes a new nearby segment',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;
  for(let i=0;i<10;i++)w.units.push(r.mkUnit({type:'TK',name:'wake crew '+i,state:'attack',tac:'direct',target:{type:'head',playerHead:true,focusMain:true,shoulder:i%2?1:-1}}));r.assignPlayerHeadRoles();for(const u of w.units){const q=r.playerHeadGoal(u);u.x=q[0];u.y=q[1]}
  const u=w.units.find(u=>u.target.shoulder===1&&u.target.headRole==='followup'&&u.target.headSlot===0),p=r.linePlan(1);for(let i=p.end-r.COORD.spacing;i<=p.end;i++){p.data.knock[i]=1;p.data.mop[i]=1;p.data.wet[i]=0}const q=r.linePoint(p,p.end);u.x=q[0];u.y=q[1];u.state='patrol';u.workRole='patrol';w.F.s+=40;w.S.t=100-u.id;w.NV.budget=4;r.autoStep();return{role:u.target.headRole,state:u.state,task:r.lineTask(u,u.target).role};
 },x=>{assert.equal(x.role,'followup');assert.equal(x.state,'attack');assert.equal(x.task,'knockdown')});
 await check('a valid projected line endpoint does not restart an unchanged long approach',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);
  const u=r.mkUnit({type:'TK',name:'committed line approach',x:2000,y:2000,state:'moving',tac:'direct',lastAuto:1,target:{type:'flank',side:1,lineRole:'knockdown'},tgt:{kind:'attack'}});w.units.push(u);const task=r.lineTask(u,u.target),g=task.goal,end=[g[0]+Math.SQRT1_2*60,g[1]+Math.SQRT1_2*60];u.planGoal=[...g];u.path=[[u.x,u.y],end];const saved=u.path,clear=r.firePathClear(saved);w.S.t=100-u.id;w.NV.budget=4;r.autoStep();const unchanged=u.path===saved&&u.lastAuto===1&&w.NV.budget===4;
  task.data.knock[task.front]=1;task.data.knock[task.front+1]=1;w.S.t+=r.COORD.interval;w.NV.budget=4;r.autoStep();return{clear,projection:Math.hypot(end[0]-g[0],end[1]-g[1]),unchanged,moved:u.path!==saved&&u.lastAuto===w.S.t};
 },x=>{assert.equal(x.clear,true);assert.ok(x.projection>40&&x.projection<80);assert.equal(x.unchanged,true);assert.equal(x.moved,true)});
 await check('legacy routes without committed-goal metadata retain an endpoint inside working reach',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;
  const u=r.mkUnit({type:'TK',name:'legacy projected route',x:2000,y:2000,state:'moving',tac:'direct',lastAuto:1,target:{type:'flank',side:1,lineRole:'knockdown'},tgt:{kind:'attack'}});w.units.push(u);const g=r.lineTask(u,u.target).goal;u.path=[[u.x,u.y],[g[0]+Math.SQRT1_2*60,g[1]+Math.SQRT1_2*60]];const saved=u.path;w.S.t=100-u.id;w.NV.budget=4;r.autoStep();return{unchanged:u.path===saved,budget:w.NV.budget};
 },x=>{assert.equal(x.unchanged,true);assert.equal(x.budget,4)});
 await check('post-change head orders approach the clicked NE sector rather than the old axis tip',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.wc=true;w.F.wcS=6000;w.F.hwL.fill(500);w.F.hwR.fill(500);w.F.gust=false;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);w.S.t=100;
  const index=85,q=r.edgePt(index,1),u=r.mkUnit({type:'TK',name:'NE approach',x:q[0]+Math.SQRT1_2*1000,y:q[1]+Math.SQRT1_2*1000});w.units.push(u);w.issue(u,'direct',...q,{playerClick:true});const goal=r.playerHeadGoal(u),along=goal[0]*Math.SQRT1_2-goal[1]*Math.SQRT1_2;
  return{index:u.target&&u.target.headIndex,along,distance:Math.hypot(goal[0]-q[0],goal[1]-q[1]),moving:u.state==='moving'&&!!u.path,clear:u.path&&r.firePathClear(u.path),hold:!!u.headHold};
 },x=>{assert.equal(x.index,85);assert.ok(Math.abs(x.along-2400)<1);assert.ok(x.distance>=200&&x.distance<300);assert.equal(x.moving,true);assert.equal(x.clear,true);assert.equal(x.hold,false)});
 await check('local NE air support permits provisional front work without global head credit',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.wc=true;w.F.wcS=6000;w.F.hwL.fill(500);w.F.hwR.fill(500);w.F.gust=false;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);w.S.t=100;const index=85;r.supportNEFront(index);
  for(let i=0;i<2;i++){const u=r.mkUnit({type:'TK',name:'NE worker '+i,state:'attack',tac:'direct',cap:8000,water:8000,res:500,target:{type:'head',playerHead:true,focusMain:true,headIndex:index,shoulder:i?1:-1}});w.units.push(u)}r.assignPlayerHeadRoles();for(const u of w.units){const g=r.playerHeadGoal(u);u.x=g[0]-Math.SQRT1_2*40;u.y=g[1]-Math.SQRT1_2*40}
  for(let i=0;i<45;i++){w.S.t++;w.NV.budget=4;r.autoStep();r.moveUnits();r.crewStep()}
  const data=w.F.lineL;return{work:Object.values(data.mop).filter(v=>v>0).length,water:w.units.reduce((a,u)=>a+u.water,0),global:w.F.headWork||0,progress:w.F.prog,green:[...w.F.hL].reduce((a,b)=>a+b,0),retained:w.units.every(u=>u.target&&u.target.headIndex===index)};
 },x=>{assert.ok(x.work>0);assert.ok(x.water<16000);assert.equal(x.global,0);assert.equal(x.progress,0);assert.equal(x.green,0);assert.equal(x.retained,true)});
 await check('NE crews do not work an unsupported sector or borrow a distant drop window',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.wc=true;w.F.wcS=6000;w.F.hwL.fill(500);w.F.hwR.fill(500);w.F.gust=false;w.S.t=100;const index=85;r.supportNEFront(index+24);
  const q=r.edgePt(index,1),u=r.mkUnit({type:'TK',name:'unsupported NE worker',x:q[0]-Math.SQRT1_2*60,y:q[1]-Math.SQRT1_2*60,state:'attack',tac:'direct',target:{type:'head',playerHead:true,focusMain:true,headIndex:index,shoulder:1,headRole:'pressure'}});w.units.push(u);const water=u.water;
  for(let i=0;i<30;i++){w.S.t++;r.crewStep()}return{water:u.water===water,localWork:Object.entries(w.F.lineL.mop).some(([i,v])=>Math.abs(+i-index)<=4&&v>0),global:w.F.headWork||0,supported:r.neFrontSupported(index)};
 },x=>{assert.equal(x.water,true);assert.equal(x.localWork,false);assert.equal(x.global,0);assert.equal(x.supported,false)});
 await check('expired NE support sends an exposed crew along a real descending-risk route into burnt refuge',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.wc=true;w.F.wcS=6000;w.F.hwL.fill(500);w.F.hwR.fill(500);w.F.gust=false;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);w.S.t=100;const index=85;r.supportNEFront(index);const q=r.edgePt(index,1),target={type:'head',playerHead:true,focusMain:true,headIndex:index,shoulder:1,headRole:'pressure'},u=r.mkUnit({type:'TK',name:'NE fallback',x:q[0]-Math.SQRT1_2*60,y:q[1]-Math.SQRT1_2*60,state:'attack',tac:'direct',target});w.units.push(u);
  w.S.t=341;w.NV.budget=4;const before=r.fireRouteRisk(u.x,u.y);r.holdPlayerHead(u);const escape=u.neEscape,planned=u.state==='moving'&&u.tgt&&u.tgt.kind==='safety'&&r.firePathClear(u.path);let descending=true,last=before;for(let i=0;i<160;i++){w.S.t++;r.moveUnits();const risk=r.fireRouteRisk(u.x,u.y);descending=descending&&risk<=last+.01;last=risk}return{before,planned,escape,descending,clear:last===0,black:w.burntAt(u.x,u.y),same:u.target===target,hold:u.headHold};
 },x=>{assert.ok(x.before>0);assert.equal(x.planned,true);assert.equal(x.escape,'black');assert.equal(x.descending,true);assert.equal(x.clear,true);assert.equal(x.black,true);assert.equal(x.same,true);assert.equal(x.hold,true)});
 await check('NE escape uses a clear outward route when crossing into black would increase exposure',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.wc=true;w.F.wcS=6000;w.F.hwL.fill(500);w.F.hwR.fill(500);w.F.gust=false;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);w.S.t=100;const index=85;r.supportNEFront(index);const q=r.edgePt(index,1),u=r.mkUnit({type:'TK',name:'NE outward escape',x:q[0]+Math.SQRT1_2*60,y:q[1]+Math.SQRT1_2*60,state:'attack',tac:'direct',target:{type:'head',playerHead:true,focusMain:true,headIndex:index,shoulder:1,headRole:'pressure'}});w.units.push(u);
  w.S.t=341;w.NV.budget=4;r.holdPlayerHead(u);const end=u.path&&u.path.at(-1);return{escape:u.neEscape,planned:u.state==='moving'&&u.tgt&&u.tgt.kind==='safety'&&r.firePathClear(u.path),risk:end&&r.fireRouteRisk(...end),green:end&&!w.burntAt(...end),hold:u.headHold};
 },x=>{assert.equal(x.escape,'outward');assert.equal(x.planned,true);assert.equal(x.risk,0);assert.equal(x.green,true);assert.equal(x.hold,true)});
 await check('nearby automatic crews can form a bounded coordinated head mission without an old road window',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.F.brk=null;w.F.airSlow=0;w.F.checkedUntil=0;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);w.NV.budget=4;
  const a=r.mkUnit({type:'TK',name:'automatic one',x:5300,y:-3200,autoManaged:true}),b=r.mkUnit({type:'TK',name:'automatic two',x:3200,y:-5300,autoManaged:true});w.units.push(a,b);const soloBefore=w.units.splice(1,1)[0],solo=r.chooseWork(a);w.units.push(soloBefore);const offered=r.chooseWork(a),accepted=r.taskAuto(a),saved=a.target,g=r.playerHeadGoal(a);a.x=g[0]+Math.SQRT1_2*60;a.y=g[1]+Math.SQRT1_2*60;a.state='attack';a.path=null;w.F.checkedUntil=1000;w.S.t=100-a.id;w.NV.budget=4;r.autoStep();return{retained:a.target===saved,solo:!!(solo&&solo.tg.autoHeadMission),offered:!!(offered&&offered.tg.autoHeadMission),accepted,automatic:a.autoManaged,body:!!(a.target&&a.target.playerHead&&a.target.autoHeadMission&&a.target.focusMain),metadata:!!(a.lastOrder&&a.lastOrder.playerClick&&a.lastOrder.headRequest===a.target)};
 },x=>{assert.equal(x.solo,false);assert.equal(x.offered,true);assert.equal(x.accepted,true);assert.equal(x.automatic,true);assert.equal(x.body,true);assert.equal(x.metadata,true);assert.equal(x.retained,true)});
 await check('automatic head initiative is local, bounded and subordinate to reported nearby spots',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.F.brk=null;const h=[Math.SQRT1_2*6000,-Math.SQRT1_2*6000];
  const a=r.mkUnit({type:'TK',name:'local',x:h[0]+500,y:h[1]+500,autoManaged:true}),b=r.mkUnit({type:'TK',name:'partner',x:h[0]-500,y:h[1]-500,autoManaged:true}),remote=r.mkUnit({type:'TK',name:'remote',x:20000,y:0,autoManaged:true});w.units.push(a,b,remote);const far=r.chooseWork(remote);const l={ox:a.x+100,oy:a.y,dx:1,dy:0,s:60,lb:5,kind:'s',reported:true,held:false,work:0};w.F.lobes.push(l);const spot=r.chooseWork(a);w.F.lobes=[];
  for(let i=0;i<8;i++)w.units.push(r.mkUnit({type:'TK',name:'head cohort '+i,x:h[0],y:h[1],state:'attack',autoManaged:true,target:{type:'head',playerHead:true,focusMain:true,autoHeadMission:true,shoulder:i%2?1:-1}}));const capped=r.chooseWork(a);return{remote:!!(far&&far.tg.autoHeadMission),spot:spot&&spot.tg.lobe===l,capped:!!(capped&&capped.tg.autoHeadMission)};
 },x=>{assert.equal(x.remote,false);assert.equal(x.spot,true);assert.equal(x.capped,false)});
 await check('an automatic long flank approach may review a much closer head mission without touching manual orders',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.F.brk=null;w.F.airSlow=0;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);
  const target={type:'flank',side:1,lineRole:'knockdown'},path=[[5300,-3200],[5300,-3000]],a=r.mkUnit({type:'TK',name:'automatic reviewer',x:5300,y:-3200,state:'moving',path,tgt:{kind:'attack'},autoManaged:true,tac:'direct',taskAt:0,lastAuto:1,target}),b=r.mkUnit({type:'TK',name:'local partner',x:3200,y:-5300,autoManaged:true});w.units.push(a,b);w.S.t=100-a.id;w.NV.budget=4;r.autoStep();const reviewed=!!(a.target&&a.target.autoHeadMission);
  const manual=r.mkUnit({type:'TK',name:'manual flank',x:5300,y:-3200,state:'moving',path,tgt:{kind:'attack'},autoManaged:false,tac:'direct',taskAt:0,lastAuto:1,target:{...target}});w.units.push(manual);manual.planGoal=r.lineTask(manual,manual.target).goal;const saved=manual.target;w.S.t=200-manual.id;w.NV.budget=4;r.autoStep();return{reviewed,manual:manual.target===saved&&!manual.target.autoHeadMission};
 },x=>{assert.equal(x.reviewed,true);assert.equal(x.manual,true)});
 await check('automatic crews try another reported job when the cheapest route is unavailable',()=>{
  const w=window.__sim,r=window.__crewTest;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);w.NV.budget=4;
  const blocked={ox:5600,oy:-3000,dx:1,dy:0,s:80,lb:5,kind:'s',reported:true,held:false,work:0},other={ox:5000,oy:-2100,dx:1,dy:0,s:80,lb:5,kind:'s',reported:true,held:false,work:0};w.F.lobes.push(blocked,other);
  const u=r.mkUnit({type:'TK',name:'available crew',x:5000,y:-3000});w.units.push(u);r.blockJob(blocked);const assigned=r.taskAuto(u);return{assigned,other:u.target&&u.target.lobe===other,attempts:window.__routeAttempts,budget:w.NV.budget};
 },x=>{assert.equal(x.assigned,true);assert.equal(x.other,true);assert.deepEqual(x.attempts,['blocked','other']);assert.ok(x.budget>=0)});
 await check('an assigned automatic crew changes jobs when its current approach becomes inaccessible',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);w.NV.budget=4;
  const l={ox:5000,oy:-2100,dx:1,dy:0,s:80,lb:5,kind:'s',reported:true,held:false,work:0};w.F.lobes.push(l);const u=r.mkUnit({type:'TK',name:'cut-off job',x:5000,y:-3000,state:'attack',tac:'direct',autoManaged:true,lastAuto:1,target:{type:'flank',side:1,lineRole:'knockdown'}});w.units.push(u);r.blockJob(undefined);w.S.t=100-u.id;r.autoStep();return{other:u.target&&u.target.lobe===l,moving:u.state==='moving'&&!!u.path,attempts:window.__routeAttempts,budget:w.NV.budget};
 },x=>{assert.equal(x.other,true);assert.equal(x.moving,true);assert.deepEqual(x.attempts,['blocked','other']);assert.ok(x.budget>=0)});
 await check('failed automatic alternatives preserve the previous route and ownership',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.NV.budget=4;
  const target={type:'flank',side:1,lineRole:'knockdown'},path=[[2000,2000],[2200,2000]],u=r.mkUnit({type:'TK',name:'holding previous route',x:2000,y:2000,state:'moving',path,tgt:{kind:'attack'},planGoal:[1000,1000],tac:'direct',autoManaged:true,lastAuto:1,target});w.units.push(u);r.blockJob(undefined);w.S.t=100-u.id;r.autoStep();return{path:u.path===path,target:u.target===target,budget:w.NV.budget,blocked:u.routeBlocked};
 },x=>{assert.equal(x.path,true);assert.equal(x.target,true);assert.ok(x.budget>=0)});
 await check('exhausted shared search budget does not defer an unattempted automatic job',()=>{
  const w=window.__sim,r=window.__crewTest;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);w.NV.budget=0;const l={ox:5600,oy:-3000,dx:1,dy:0,s:80,lb:5,kind:'s',reported:true,held:false,work:0};w.F.lobes.push(l);
  const u=r.mkUnit({type:'TK',name:'waiting for search',x:5000,y:-3000});w.units.push(u);const first=r.taskAuto(u),deferred=!!u.retryAt;w.NV.budget=4;const second=r.taskAuto(u);return{first,deferred,second};
 },x=>{assert.equal(x.first,false);assert.equal(x.deferred,false);assert.equal(x.second,true)});
 await check('an inaccessible manual shoulder tries the other side of the same fire',()=>{
  const w=window.__sim,r=window.__crewTest;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.NV.spd=new Float32Array(w.NV.w*w.NV.h).fill(12/3.6);w.NV.budget=4;
  const u=r.mkUnit({type:'TK',name:'alternate approach',x:5300,y:-3200,tac:'direct',target:{type:'head',playerHead:true,focusMain:true,shoulder:1,headRole:'pressure'}});w.units.push(u);r.blockShoulder(1);w.S.t=100-u.id;r.autoStep();return{side:u.target.shoulder,body:u.target.focusMain&&u.target.type==='head',moving:u.state==='moving'&&!!u.path,clear:u.path&&r.firePathClear(u.path),budget:w.NV.budget};
 },x=>{assert.equal(x.side,-1);assert.equal(x.body,true);assert.equal(x.moving,true);assert.equal(x.clear,true);assert.ok(x.budget>=0)});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
