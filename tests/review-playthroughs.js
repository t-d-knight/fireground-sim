// Independent correctness checks found while reviewing complete player workflows.
// Run after npm run build. Optional SIM_HTML selects a saved comparison build.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  const html = fs.readFileSync(process.env.SIM_HTML || path.resolve(__dirname, '..', 'dist', 'index.html'), 'utf8')
    .replace('window.__sim={', 'window.__review={mkUnit,initialDispatch,beginFill,moveUnits,autoStep,arrive,defDeploy,firePathClear,reroute2,rvPos,ambCheck,edgePt,DS,OFF,FPS,flushOrders:typeof passPendingOrders==="function"?()=>{const was=advancingFrame;advancingFrame=true;try{passPendingOrders(performance.now())}finally{advancingFrame=was}}:()=>{}};window.__sim={');
  let failed = 0;
  async function check(name, run, verify) {
    if(process.env.REVIEW_ONLY&&!name.includes(process.env.REVIEW_ONLY))return;
    const p = await browser.newPage(); const errors=[];
    p.on('pageerror', e => errors.push(e.message));
    await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await p.setContent(html, { waitUntil:'domcontentloaded' });
    try { verify(await p.evaluate(run,{end:Number(process.env.REVIEW_END||6300)})); assert.deepEqual(errors,[]); console.log('OK',name); }
    catch(e) { failed++; console.error('FAIL',name,e); }
    finally { await p.close(); }
  }
  try {
    await check('early Make Tankers escalation counts the initial response once', () => {
      const w=window.__sim,r=window.__review,results=[];
      const count=()=>w.units.filter(u=>u.type!=='SUP').length+w.S.pend.filter(p=>p.o.type!=='SUP').length;
      for(const level of[10,15,20,30]){w.reset();while(w.S.mtLevel<level)document.getElementById('bMT').click();r.initialDispatch();const first=count();r.initialDispatch();results.push({level,first,again:count()})}
      w.reset();r.initialDispatch();document.getElementById('bMT').click();return{results,afterPaging:count()};
    }, x => {for(const r of x.results){assert.equal(r.first,r.level);assert.equal(r.again,r.level)}assert.equal(x.afterPaging,10)});

    await check('a previous defence position cannot swallow a later direct order', () => {
      const w=window.__sim,r=window.__review,u=r.mkUnit({type:'TK',name:'order crew',x:5830,y:-5574});w.units.push(u);
      w.issue(u,'defend',1000,-1000);const defence=u.defClick.slice();
      w.issue(u,'direct',2000,-2000,{playerClick:true});const first={...u.lastOrder};
      w.issue(u,'direct',...defence,{playerClick:true});
      return{defence,first,last:u.lastOrder};
    }, r => {assert.notEqual(r.first.wx,r.defence[0]);assert.equal(r.last.wx,r.defence[0]);assert.equal(r.last.wy,r.defence[1])});

    await check('a tanker joining a working strike team inherits the selected head mission', () => {
      const w=window.__sim,r=window.__review;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.F.brk=null;
      const lead=r.mkUnit({type:'TK',name:'working lead',x:4000,y:-4000}),join=r.mkUnit({type:'TK',name:'joining tanker',x:5830,y:-5574});w.units.push(lead,join);
      w.issue(lead,'direct',Math.SQRT1_2*w.F.s,-Math.SQRT1_2*w.F.s,{playerClick:true});lead.state='attack';lead.path=null;
      document.getElementById('bST').click();
      return{team:join.team,leadTeam:lead.team,type:join.target&&join.target.type,player:join.target&&join.target.playerHead,focus:join.target&&join.target.focusMain,independent:join.target!==lead.target};
    }, r => {assert.equal(r.team,r.leadTeam);assert.equal(r.type,'head');assert.equal(r.player,true);assert.equal(r.focus,true);assert.equal(r.independent,true)});

    await check('rotating a patrol crew onto the line preserves its explicit head mission', () => {
      const w=window.__sim,r=window.__review;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.F.brk=null;
      const lead=r.mkUnit({type:'TK',name:'tired lead',x:4000,y:-4000,eng:1500}),relief=r.mkUnit({type:'TK',name:'fresh relief',x:3500,y:-4500,state:'patrol',tac:'patrol',eng:0});w.units.push(lead,relief);
      w.issue(lead,'direct',Math.SQRT1_2*w.F.s,-Math.SQRT1_2*w.F.s,{playerClick:true});lead.state='head';lead.path=null;relief.preOrder={...lead.lastOrder};
      w.S.sel.add(lead.id);w.S.sel.add(relief.id);w.setMode('direct');document.getElementById('bRot').click();
      return{type:relief.target&&relief.target.type,player:relief.target&&relief.target.playerHead,focus:relief.target&&relief.target.focusMain};
    }, r => {assert.equal(r.type,'head');assert.equal(r.player,true);assert.equal(r.focus,true)});

    await check('an explicit repeat attack can retask a tanker travelling to rehab', () => {
      const w=window.__sim,r=window.__review;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;
      const h=[Math.SQRT1_2*w.F.s,-Math.SQRT1_2*w.F.s],u=r.mkUnit({type:'TK',name:'returning crew',x:5830,y:-5574});w.units.push(u);w.issue(u,'direct',...h,{playerClick:true});
      const oldPath=[[u.x,u.y],[5830,-5574]];u.state='moving';u.tgt={kind:'rehab'};u.path=oldPath;w.S.sel.add(u.id);w.setMode('direct');w.onMapClick(...h);
      return{kind:u.tgt&&u.tgt.kind,retained:u.path===oldPath,player:u.target&&u.target.playerHead};
    }, r => {assert.notEqual(r.kind,'rehab');assert.equal(r.retained,false);assert.equal(r.player,true)});

    await check('an explicit head order is not swallowed by a truck icon at the target', () => {
      const w=window.__sim,r=window.__review;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;
      const head=[Math.SQRT1_2*w.F.s,-Math.SQRT1_2*w.F.s],a=r.mkUnit({type:'TK',name:'selected one',x:5830,y:-5574}),b=r.mkUnit({type:'TK',name:'selected two',x:6000,y:-5574}),other=r.mkUnit({type:'TK',name:'truck at head',x:head[0],y:head[1]});w.units.push(a,b,other);w.S.sel=new Set([a.id,b.id]);
      w.setMode('direct');w.onMapClick(...head);
      const issued=w.S.sel.size===2&&w.S.sel.has(a.id)&&w.S.sel.has(b.id)&&[a,b].every(u=>u.lastOrder&&u.lastOrder.mode==='direct'&&u.target&&u.target.playerHead);
      w.onMapClick(...head);const switched=w.S.sel.size===1&&w.S.sel.has(other.id);
      return{issued,switched};
    }, r => {assert.equal(r.issued,true);assert.equal(r.switched,true)});

    await check('a head order queued without communications retains its original fire body', () => {
      const w=window.__sim,r=window.__review;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.S.comms=false;
      const h=[Math.SQRT1_2*w.F.s,-Math.SQRT1_2*w.F.s],u=r.mkUnit({type:'TK',name:'radio crew',x:5830,y:-5574});w.units.push(u);w.S.sel.add(u.id);w.setMode('direct');w.onMapClick(...h);
      const captured=!!(w.S.queued[0]&&w.S.queued[0][4]&&w.S.queued[0][4].headRequest&&w.S.queued[0][4].headRequest.focusMain);
      w.F.s=8000;w.F.lobes.push({ox:h[0]-Math.SQRT1_2*500,oy:h[1]+Math.SQRT1_2*500,dx:Math.SQRT1_2,dy:-Math.SQRT1_2,s:500,lb:5,kind:'s',held:false});
      const control=document.getElementById('fCom');control.checked=true;control.dispatchEvent(new Event('change',{bubbles:true}));r.flushOrders();
      return{captured,type:u.target&&u.target.type,main:u.target&&u.target.focusMain,player:u.target&&u.target.playerHead,queued:w.S.queued.length,pending:w.pendingOrders||0};
    }, r => {assert.equal(r.captured,true);assert.equal(r.type,'head');assert.equal(r.main,true);assert.equal(r.player,true);assert.equal(r.queued,0);assert.equal(r.pending,0)});

    await check('a wind-warning fallback does not overwrite an explicit rehab journey', () => {
      const w=window.__sim,r=window.__review;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.S.wcAt=w.S.t+100;w.S.comms=false;
      const path=[[0,0],[5830,-5574]],u=r.mkUnit({type:'TK',name:'rehab journey',x:0,y:0,state:'moving',tac:'direct',target:{type:'flank',side:1},tgt:{kind:'rehab'},path});w.units.push(u);r.autoStep();
      return{kind:u.tgt&&u.tgt.kind,pathRetained:u.path===path,state:u.state,fallback:!!u.safetyHold};
    }, r => {assert.equal(r.kind,'rehab');assert.equal(r.pathRetained,true);assert.equal(r.state,'moving');assert.equal(r.fallback,false)});

    await check('an unreachable work position is not replaced by a distant road endpoint', () => {
      const w=window.__sim,r=window.__review;w.NV.spd=new Float32Array(w.NV.w*w.NV.h);
      const start=w.nearestNode(5830,-5574);let goal=null,gap=0;
      for(const x of [0,4000,8000,12000,16000])for(const y of [-12000,-8000,-4000,0,4000,8000]){const n=w.nearestNode(x,y),d=Math.hypot(w.NX[n]-x,w.NY[n]-y);if(d>gap){gap=d;goal=[x,y]}}
      const u=r.mkUnit({type:'TK',name:'blocked work approach',x:w.NX[start],y:w.NY[start],target:{type:'point'}});w.units.push(u);w.NV.budget=4;
      const planned=r.reroute2(u,...goal,true),first={state:u.state,path:!!u.path};
      w.issue(u,'direct',...goal,{playerClick:true});
      return{gap,planned,first,last:{state:u.state,path:!!u.path,blocked:u.routeBlocked}};
    }, r => {assert.ok(r.gap>280);assert.equal(r.planned,false);assert.equal(r.first.path,false);assert.equal(r.last.path,false);assert.equal(r.last.state,'idle');assert.equal(r.last.blocked,true)});

    await check('ambulance arrival hands over only medical crews at the staging area', () => {
      const w=window.__sim,r=window.__review,rv=r.rvPos();w.S.amb={at:w.S.t,from:'test station'};
      const near=r.mkUnit({type:'TK',name:'at staging',x:rv[0],y:rv[1],state:'standdown',med:true}),far=r.mkUnit({type:'TK',name:'different refuge',x:rv[0]+2000,y:rv[1],state:'standdown',med:true});w.units.push(near,far);r.ambCheck();
      return{near:!!near.handed,far:!!far.handed};
    }, r => {assert.equal(r.near,true);assert.equal(r.far,false)});

    await check('cancelling a refill with Move cannot resurrect the abandoned attack after a later fill', () => {
      const w=window.__sim,r=window.__review;w.F.s=6000;w.F.hwL.fill(300);w.F.hwR.fill(300);w.F.gust=false;w.S.autoRefill=true;
      const h=r.FPS[0],source={x:h.x,y:h.y,src:{kind:'hyd',s:h}},head=[Math.SQRT1_2*w.F.s,-Math.SQRT1_2*w.F.s],order={mode:'direct',wx:head[0],wy:head[1],type:'head',playerClick:true,headRequest:{type:'head',playerHead:true,focusMain:true}};
      const u=r.mkUnit({type:'TK',name:'cancelled refill',x:source.x,y:source.y,state:'filling',water:1000,resume:order,lastOrder:order,fillT:100,fillSrc:source.src});w.units.push(u);
      w.issue(u,'go',source.x+200,source.y);const cancelled=!u.resume&&!(u.lastOrder&&u.lastOrder.mode==='direct');
      w.issue(u,'fill',source.x,source.y,{src:source.src});for(let i=0;i<3&&u.state!=='filling';i++)r.moveUnits();const reached=u.state==='filling';if(reached){u.fillT=1;w.tick()}
      return{cancelled,reached,resurrected:!!(u.target&&u.target.playerHead),water:u.water,cap:u.cap};
    }, r => {assert.equal(r.cancelled,true);assert.equal(r.reached,true);assert.equal(r.resurrected,false);assert.equal(r.water,r.cap)});

    await check('an exhausted support truck does not strand the last automatic refill', () => {
      const w=window.__sim,r=window.__review;w.S.autoRefill=true;w.S.heat=0;w.S.mayday=0;
      const sup=r.mkUnit({type:'SUP',name:'finite supply',x:4245,y:-5377,state:'wpoint',stock:3000});
      const a=r.mkUnit({type:'TK',name:'first fill',x:sup.x,y:sup.y,state:'filling',cap:3000,water:600,res:600,fillT:1,fillSrc:{kind:'sup',unit:sup}});
      const b=r.mkUnit({type:'TK',name:'last fill',x:sup.x,y:sup.y,state:'filling',cap:3000,water:600,res:600,fillT:1,fillSrc:{kind:'sup',unit:sup},resume:{mode:'direct',wx:1000,wy:-1000,type:'point',playerClick:true}});
      w.units.push(sup,a,b);r.moveUnits();
      const first={state:b.state,water:b.water,tgt:b.tgt&&b.tgt.kind,source:b.fillSrc&&b.fillSrc.unit&&b.fillSrc.unit.name};
      for(let i=0;i<120;i++)w.tick();
      return{first,last:{state:b.state,water:b.water,tgt:b.tgt&&b.tgt.kind},stock:sup.stock,log:w.S.log.slice(-5).map(x=>x.msg)};
    }, r => {assert.equal(r.stock,600);assert.ok(!(r.last.state==='idle'&&r.last.water===600),'crew stranded at reserve after source exhaustion: '+JSON.stringify(r))});

    await check('a light tanker can use remaining support water sufficient for its actual fill', () => {
      const w=window.__sim,r=window.__review;w.S.autoRefill=true;
      const sup=r.mkUnit({type:'SUP',name:'remaining supply',x:4245,y:-5377,state:'wpoint',stock:2000}),u=r.mkUnit({type:'TK',name:'light tanker',x:sup.x,y:sup.y,cap:2000,water:600,res:400});w.units.push(sup,u);w.S.waterPref='u'+sup.id;
      const sent=w.seekWater(u),nominated=!!(u.tgt&&u.tgt.src&&u.tgt.src.unit===sup);
      u.path=null;r.beginFill(u,{kind:'sup',unit:sup});for(let i=0;i<120;i++)r.moveUnits();
      return{sent,nominated,water:u.water,cap:u.cap,stock:sup.stock};
    }, r => {assert.equal(r.sent,true);assert.equal(r.nominated,true);assert.equal(r.water,r.cap);assert.equal(r.stock,600)});

    await check('automatic refill does not promise the same finite stock to two tankers', () => {
      const w=window.__sim,r=window.__review;w.S.autoRefill=true;
      const sup=r.mkUnit({type:'SUP',name:'booked supply',x:4245,y:-5377,state:'wpoint',stock:2000});
      const first=r.mkUnit({type:'TK',name:'booked tanker',x:4000,y:-5000,state:'moving',cap:2000,water:600,res:400,tgt:{kind:'fill',src:{kind:'sup',unit:sup}}});
      const second=r.mkUnit({type:'TK',name:'next tanker',x:sup.x,y:sup.y,cap:2000,water:600,res:400});w.units.push(sup,first,second);w.S.waterPref='u'+sup.id;
      const sent=w.seekWater(second);return{sent,source:second.tgt&&second.tgt.src&&second.tgt.src.unit===sup,kind:second.tgt&&second.tgt.src&&second.tgt.src.kind};
    }, r => {assert.equal(r.sent,true);assert.equal(r.source,false);assert.ok(['hyd','dam'].includes(r.kind))});

    await check('a moving support source cannot strand an arriving refill crew', () => {
      const w=window.__sim,r=window.__review;w.S.autoRefill=true;w.S.heat=0;w.S.mayday=0;
      const sup=r.mkUnit({type:'SUP',name:'departed supply',x:4245,y:-5377,state:'moving',stock:10000});
      const u=r.mkUnit({type:'TK',name:'late fill',x:4245,y:-5377,water:600,res:600,state:'moving',resume:{mode:'direct',wx:1000,wy:-1000,type:'point',playerClick:true}});
      w.units.push(sup,u);r.beginFill(u,{kind:'sup',unit:sup});for(let i=0;i<120;i++)w.tick();
      return{state:u.state,water:u.water,tgt:u.tgt&&u.tgt.kind,log:w.S.log.slice(-5).map(x=>x.msg)};
    }, r => {assert.ok(!(r.state==='idle'&&r.water===600),'crew stranded after source moved: '+JSON.stringify(r))});
    await check('a complete mixed-order exercise keeps dispatch, tasking and recovery connected', config => {
      const w=window.__sim,r=window.__review;w.S.seed=21;w.reset();w.S.heat=0;w.S.mayday=0;
      const $=id=>document.getElementById(id),accepted=new Set();
      while(w.S.mtLevel<30)$('bMT').click();$('bAIR').click();$('bUHT').click();
      const select=(start,count=5)=>{const T=w.units.filter(u=>u.type!=='SUP'&&!['offline','medical','burnover','retreat','standdown','rehab'].includes(u.state));w.S.sel=new Set(T.slice(start,start+count).map(u=>u.id));return T.slice(start,start+count)};
      const order=(mode,p,start=0,count=5)=>{const T=select(start,count);w.setMode(mode);w.onMapClick(...p);T.forEach(u=>{if(u.lastOrder&&u.lastOrder.mode===mode)accepted.add(mode)})};
      let queued=false,delivered=false,queueProbe=null;
      for(let t=0;t<config.end;t++){
        r.flushOrders();w.tick();const head=[Math.SQRT1_2*w.F.s,-Math.SQRT1_2*w.F.s],side=i=>r.edgePt(Math.floor(w.F.s*.5/r.DS)+r.OFF,i);
        if(w.S.t===600)order('direct',head);
        if(w.S.t===900)order('parallel',side(-1),5);
        if(w.S.t===1200){const T=select(10);w.setMode('defend');w.onMapClick(5000,-5000);w.onMapClick(5500,-5000);r.defDeploy();T.forEach(u=>{if(u.lastOrder&&u.lastOrder.mode==='defend')accepted.add('defend')})}
        if(w.S.t===1500)order('indirect',[head[0]+800,head[1]-800],15);
        if(w.S.t===1800){select(0,1);w.setMode('fill');const s=r.FPS[0];if(s)w.onMapClick(s.x,s.y)}
        if(w.S.t===2100){$('fCom').checked=false;$('fCom').dispatchEvent(new Event('change',{bubbles:true}));order('direct',head,20);queued=w.S.queued.length>0;queueProbe={comms:w.S.comms,selected:[...w.S.sel],count:w.S.queued.length,total:w.units.filter(u=>u.type!=='SUP').length}}
        if(w.S.t===2160){$('fCom').checked=true;$('fCom').dispatchEvent(new Event('change',{bubbles:true}));delivered=w.S.queued.length===0}
        if(w.S.t===2400)$('bST').click();
        if(w.S.t===2700){select(0,10);w.setMode('direct');$('bRot').click()}
        if(w.S.t===3000)order('patrol',side(-1),5);
        if(w.S.t===3900){select(0,5);w.setMode('go');$('bBail').click()}
        if(w.S.t===5700)$('bBailAll').click();
        for(const u of w.units){if(!Number.isFinite(u.x)||!Number.isFinite(u.y)||!Number.isFinite(u.water)||u.water<0||u.water>u.cap+1e-6)throw new Error('invalid appliance state '+u.name);if(u.path&&u.path.some(q=>!q.every(Number.isFinite)))throw new Error('invalid route '+u.name)}
      }
      return{end:config.end,seconds:w.S.t,level:w.S.mtLevel,accepted:[...accepted],queued,delivered,queueProbe,units:w.units.length,pendingAtEnd:w.pendingOrders||0,error:window.__tickErr||null};
    }, r => {assert.equal(r.seconds,r.end);assert.equal(r.level,30);assert.ok(r.units>=30);for(const mode of (r.end>=3000?['direct','parallel','indirect','defend','patrol']:['direct','parallel','indirect','defend']))assert.ok(r.accepted.includes(mode),mode+' never reached an appliance');assert.equal(r.queued,true,JSON.stringify(r));assert.equal(r.delivered,true,JSON.stringify(r));assert.equal(r.pendingAtEnd,0);assert.equal(r.error,null)});

  } finally { await browser.close(); }
  if(failed)process.exitCode=1;
})().catch(e => { console.error(e); process.exitCode=1; });
