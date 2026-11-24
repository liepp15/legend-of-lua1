'use strict';
// Legend of Lua — port web (HTML/CSS/JS) dari versi LÖVE2D asli
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const IM={},BUF={},K={},MS={x:0,y:0,l:false,r:false};
// ---------- definisi level & varian musuh ----------
const LV=[
 {n:'Level 1: Padang Hijau',map:'new1',st:[88,88],goal:70,sp:{bat:6,eye:4,skeleton:3}},
 {n:'Level 2: Lembah Senja',map:'new2',st:[88,88],goal:160,sp:{redbat:6,eye2:5,skeleton:6,spitter:4}},
 {n:'Level 3: Gua Raja Tengkorak',map:'new3',st:[88,552],goal:0,boss:true,sp:{brute:3,skeleton:4,redbat:4}}];
const VAR={ // varian musuh baru: b = sprite dasar, s = status tambahan
 redbat:{b:'bat',s:{hp:2,maxSp:115,mag:600,tint:'hue-rotate(150deg) saturate(2)'}},
 brute:{b:'skeleton',s:{hp:8,mag:28,stiff:true,scale:1.5,w:16,h:20,dmg:1,tint:'hue-rotate(200deg)'}},
 spitter:{b:'eye',s:{hp:4,chase:false,maxSp:60,tint:'hue-rotate(90deg) saturate(1.5)'}},
 boss:{b:'skeleton',s:{hp:40,mag:35,stiff:true,scale:3,w:30,h:36,dmg:1,tint:'hue-rotate(260deg) saturate(1.6)'}}};
let RUN={score:0,kills:0,time:0,saved:false,lv:0,lvScore:0,coins:0,cb:0,kb:0};
let AC=null,MAPS,S=1,VW=0,VH=0,G,D,P,cam={x:0,y:0},shk={t:0,m:0},cur={a:0,dir:0,fn:null,w:0};
const I=p=>IM['assets/sprites/'+p+'.png'];
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b,c,d)=>Math.hypot(c-a,d-b),norm=(x,y)=>{const l=Math.hypot(x,y)||1;return{x:x/l,y:y/l}};
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const box=(e,w,h)=>({x:e.x-w/2,y:e.y-h/2,w,h});

// ---------- aset & suara ----------
function sfx(n,v=1){if(!AC||GameData.load().sound===false)return;const b=BUF['assets/sounds/'+n+'.wav'];if(!b)return;const s=AC.createBufferSource(),g=AC.createGain();g.gain.value=v;s.buffer=b;s.connect(g).connect(AC.destination);s.start()}
async function initAudio(){if(AC)return;AC=new (window.AudioContext||window.webkitAudioContext)();for(const p of MANIFEST.wav){fetch(p).then(r=>r.arrayBuffer()).then(a=>AC.decodeAudioData(a)).then(b=>BUF[p]=b).catch(()=>{})}}
function loadImg(p){return new Promise(r=>{const i=new Image();i.onload=()=>{IM[p]=i;r()};i.onerror=r;i.src=p})}
// frame dari sprite sheet (kolom/baris mulai 0)
function fr(img,fw,fh,c,r,x,y,ox=0,oy=0,sx=1,sy=1){ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);ctx.drawImage(img,c*fw,r*fh,fw,fh,-ox,-oy,fw,fh);ctx.restore()}
function dr(img,x,y,ox=img.width/2,oy=img.height/2,rot=0,sx=1,sy=1){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(sx,sy);ctx.drawImage(img,-ox,-oy);ctx.restore()}

// ---------- state ----------
function newSave(){D={spd:1,dmgMul:1,shield:0,maxHealth:4,money:0,keys:0,outfit:5,item:{left:'sword',right:'bow',altL:'fire',altR:'fire'},arrows:25,maxArrows:30,bombs:10,maxBombs:20,brk:{},chests:{},dmg:1}}
function newPlayer(){return{x:276,y:164,vx:0,vy:0,kx:0,ky:0,hp:4,st:0,t:0,dirX:1,dirY:1,at:{x:1,y:0},walking:false,anim:0,inv:0,stun:0,rollCd:0,combo:0,aim:false,aimT:0,idle:0,dust:0,flash:0}}
G={st:0,paused:false,sel:0,dead:false};

function loadMap(name,dx,dy){
  const m=MAPS[name];G.name=name;G.M=m;G.walls=[];G.en=[];G.loot=[];G.arr=[];G.bombs=[];G.fb=[];G.pr=[];G.fx=[];G.pt=[];G.decals=[];G.chests=[];G.trees=[];G.npcs=[];G.trans=[];G.boom=null;G.pet=null;
  if(dx!==undefined){P.x=dx;P.y=dy}
  const o=m.objs,add=(x,y,w,h,name,type,extra)=>{if(name&&D.brk[name])return;const wl=Object.assign({x,y,w,h,name,type},extra);if(name&&name.startsWith('break')){wl.brk=true;if(name.includes('Rock')){wl.spr=I('environment/breakableRock')}else if(name.includes('Wall')){wl.spr=I('environment/breakableWall');wl.oy=-8}else if(name.includes('Door')){wl.spr=I('environment/lockedDoor');wl.oy=-4;wl.type='lockedDoor'}}G.walls.push(wl);return wl};
  (o.Walls||[]).forEach(a=>add(a.x,a.y,a.w,a.h,a.name,a.type));
  (o.Water||[]).forEach(a=>{add(a.x,a.y,a.w,a.h,null,'ground');G.water=G.water||[]});
  (o.Trees||[]).forEach(a=>{const t={x:a.x+2,y:a.y+2,w:12,h:10,spr:I('environment/tree'+(a.type||''))||I('environment/tree')};add(t.x,t.y,12,10);G.trees.push(t)});
  (o.Chests||[]).forEach(a=>{const big=a.type==='big',c={id:a.name,big,w:big?20:16,h:15,open:!!D.chests[a.name]};c.wx=a.x;c.wy=a.y;add(a.x,a.y,c.w,c.h);c.x=big?a.x:a.x+1;c.y=big?a.y-2:a.y-3;G.chests.push(c)});
  (o.Enemies||[]).forEach(a=>spawnEnemy(a.x,a.y,a.name,a.p.form));
  (o.Loot||[]).forEach(a=>spawnLoot(a.x,a.y,a.type,null,a.p.price));
  (o.NPC||[]).forEach(a=>G.npcs.push({x:a.x,y:a.y}));
  (o.Transitions||[]).forEach(a=>G.trans.push({x:a.x,y:a.y,w:a.w,h:a.h,to:mapId(a.name),dx:a.p.destX,dy:a.p.destY}));
  // pre-render tile layer
  const c=document.createElement('canvas');c.width=m.w*16;c.height=m.h*16;const x=c.getContext('2d');
  ['Background','Base','Objects','Objects2'].forEach(n=>{const l=m.layers.find(l=>l.name===n);if(!l)return;l.data.forEach((g,i)=>{if(!g)return;let fl=0;if(g>=100000){g-=100000;fl=1}let ts=null;for(const t of m.ts)if(t.first<=g)ts=t;const id=g-ts.first,im=IM[ts.img];if(im){const sx=(id%ts.cols)*16,sy=Math.floor(id/ts.cols)*16,dx=(i%m.w)*16,dy=Math.floor(i/m.w)*16;if(fl){x.save();x.translate(dx+16,dy);x.scale(-1,1);x.drawImage(im,sx,sy,16,16,0,0,16,16);x.restore()}else x.drawImage(im,sx,sy,16,16,dx,dy,16,16)}})});
  G.tiles=c;if(m.tint){const c2=document.createElement('canvas');c2.width=c.width;c2.height=c.height;const y=c2.getContext('2d');y.filter=m.tint;y.drawImage(c,0,0);G.tiles=c2} // warna senja sekali saja
  snapCam();
}
const MAPID={toTest:'test',toTest2:'test2',toTest3:'test3',toTestCave:'testCave',toTestCave2:'testCave2'};
function mapId(id){const m=MAPID[id]||id;return MAPS[m]?m:'test'}
function snapCam(){const t=camTarget();cam.x=t.x;cam.y=t.y}
function camTarget(){let x=P.x,y=P.y;const mw=G.M.w*16,mh=G.M.h*16;if(x<VW/2)x=VW/2;if(y<VH/2)y=VH/2;if(x>mw-VW/2)x=mw-VW/2;if(y>mh-VH/2)y=mh-VH/2;return{x,y}}
function shake(m,t){shk.m=m;shk.t=t}
function fade(fn){if(cur.a>0||cur.dir)return;cur.dir=1;cur.fn=fn}

// ---------- fisika sederhana ----------
function solid(b,ground=true,ignore){for(const w of G.walls){if(w===ignore)continue;if(!ground&&w.type==='ground')continue;if(hit(b,w))return w}return null}
function move(e,dx,dy,w,h,ground=true){e.x+=dx;let b=box(e,w,h),k=solid(b,ground);if(k){e.x=dx>0?k.x-w/2:k.x+k.w+w/2;e.hitW=k}
  e.y+=dy;b=box(e,w,h);k=solid(b,ground);if(k){e.y=dy>0?k.y-h/2:k.y+k.h+h/2;e.hitW=k}}

// ---------- musuh ----------
function spawnEnemy(x,y,type,form){
  const e={type,form:form||1,x,y,sx:x,sy:y,vx:0,vy:0,st:1,hp:3,flash:0,stun:0,t:0,an:Math.random(),flt:rnd(0,6),wt:rnd(.5,2.5),wd:{x:1,y:1},sc:Math.random()<.5?-1:1,w:12,h:16,maxSp:50,mag:300,chase:true,pt:0};
  if(type==='bat'){e.hp=1;e.w=11;e.h=9;e.maxSp=80;e.mag=450}
  else if(type==='eye'){e.hp=[2,3,4][e.form-1]||2;e.maxSp=[50,80,100][e.form-1]||50;e.mag=[300,450,500][e.form-1]||300}
  else if(type==='skeleton'){e.hp=3;e.mag=40;e.stiff=true;if(e.form===2)e.chase=false}
  const V=VAR[type];if(V){e.kind=type;e.type=V.b;Object.assign(e,V.s)}e.maxhp=e.hp;
  G.en.push(e);
}
function los(e){const d=norm(P.x-e.x,P.y-e.y);for(let i=1;i<=18;i++){const px=e.x+d.x*i*3,py=e.y+d.y*i*3;if(dist(px,py,P.x,P.y)<6)return true;if(solid({x:px-3,y:py-3,w:6,h:6},false))return false}return false}
function updEnemy(e,dt){
  e.flt+=dt;e.an+=dt;if(e.flash>0)e.flash-=dt;
  if(e.kind==='boss'&&e.st>=100)bossAI(e,dt);
  if(e.stun>0){e.stun-=dt;if(e.stun<=0)e.stun=0}
  e.vx*=Math.pow(.13,dt);e.vy*=Math.pow(.13,dt);
  if(!e.stun){
    const d=dist(e.x,e.y,P.x,P.y);
    if(e.st<99&&!G.dead&&(d<30||(d<100&&(e.st>=2||(e.sc===1?e.x<P.x:e.x>P.x))&&los(e)))){e.st=99;e.t=.5}
    if(e.st===99){e.t-=dt;if(e.t<=0)e.st=100}
    else if(e.st>=100){
      const dir=norm(P.x-e.x,P.y-e.y);
      if(e.chase){if(e.stiff){move(e,dir.x*e.mag*dt,dir.y*e.mag*dt,e.w,e.h)}else{e.vx+=dir.x*e.mag*dt;e.vy+=dir.y*e.mag*dt;const s=Math.hypot(e.vx,e.vy);if(s>e.maxSp){e.vx*=e.maxSp/s;e.vy*=e.maxSp/s}}}
      else{e.pt-=dt;if(e.pt<0){if(e.st===100){e.st=101;e.pt=1.2}else{e.st=100;e.pt=.4;spawnProj(e.x,e.y)}}if(e.st===101)move(e,dir.x*10*dt,dir.y*10*dt,e.w,e.h)}
      if(Math.abs(dir.x)>.1)e.sc=dir.x>0?1:-1;
    }else{ // wander
      e.wt-=dt;
      if(e.st===1&&e.wt<0){e.st=1.1;e.wt=rnd(.8,1.6);e.wd=dist(e.x,e.y,e.sx,e.sy)>30?norm(e.sx-e.x,e.sy-e.y):norm(rnd(-1,1),rnd(-1,1));e.sc=e.wd.x>=0?1:-1}
      else if(e.st===1.1){move(e,e.wd.x*15*dt,e.wd.y*15*dt,e.w,e.h);if(e.wt<0){e.st=1;e.wt=rnd(.5,2.5)}}
    }
  }
  move(e,e.vx*dt,e.vy*dt,e.w,e.h);
  if(e.st>=99&&!G.dead&&!e.stun&&hit(box(e,e.w,e.h),box(P,12,12)))hurtPlayer(e.dmg||.5,e);
}
function hurtEnemy(e,dmg,dx,dy,kb=120){
  dmg*=D.dmgMul||1;const bs=e.kind==='boss';e.hp-=dmg;e.flash=.15;e.stun=bs?0:.3;e.vx=dx*kb*(bs?.15:1);e.vy=dy*kb*(bs?.15:1);if(e.st<99)e.st=100;sfx('enemies/enemyHurt');
  if(e.hp<=0){e.dead=true;RUN.score+=10;RUN.lvScore+=10;RUN.kills++;if(e.kind==='boss')RUN.boss=true;sfx('enemies/enemyDie');G.fx.push({k:'dead',e,x:e.x,y:e.y,t:0});for(let i=0;i<8;i++)G.pt.push({x:e.x,y:e.y,vx:rnd(-40,40),vy:rnd(-50,-10),l:.5,c:'#e8e8e8'});
    const r=Math.random();if(r<.35)spawnLoot(e.x,e.y,'coin1',{x:rnd(-20,20),y:rnd(-20,20)});else if(r<.5)spawnLoot(e.x,e.y,'heart',{x:rnd(-20,20),y:rnd(-20,20)});else if(r<.6)spawnLoot(e.x,e.y,'arrow',{x:0,y:15});else if(r<.65)spawnLoot(e.x,e.y,'bomb',{x:0,y:15})}
}
// AI bos: tembakan melingkar, memanggil kelelawar, mengamuk saat hp < 50%
function bossAI(e,dt){
  e.bt=(e.bt||0)+dt;e.sm=(e.sm||0)+dt;
  if(!e.rage&&e.hp<e.maxhp/2){e.rage=true;e.mag*=1.7;e.tint='hue-rotate(320deg) saturate(2.2)';shake(2,.3)}
  if(e.bt>(e.rage?2:3)){e.bt=0;const n=e.rage?14:8;for(let i=0;i<n;i++){const a=i/n*6.283+Math.random()*.2;G.pr.push({x:e.x,y:e.y,vx:Math.cos(a)*70,vy:Math.sin(a)*70,t:4})}sfx('enemies/projectile')}
  if(e.sm>9){e.sm=0;spawnEnemy(e.x+20,e.y,'redbat');spawnEnemy(e.x-20,e.y,'redbat')}
}
function drawEnemy(e){ // pembungkus: skala & warna varian
  ctx.save();if(e.scale){ctx.translate(e.x,e.y+8);ctx.scale(e.scale,e.scale);ctx.translate(-e.x,-e.y-8)}
  if(e.tint)ctx.filter=e.tint;drawEnemy0(e);ctx.restore();
}
function drawEnemy0(e){
  const y=e.y-(e.type==='skeleton'?0:Math.sin(e.flt*4.5)*1.5);ctx.globalAlpha=1;
  dr(I(e.type==='eye'?'enemies/eye/eyeShadow':e.type==='bat'?'enemies/shadow':'enemies/shadowMed'),e.x,e.y+(e.type==='skeleton'?9:10));
  if(e.flash>0)ctx.filter='sepia(1) saturate(6) hue-rotate(-30deg)';
  const f=Math.floor(e.an/(e.type==='eye'?.3:e.type==='bat'?.15:.4))%2;
  if(e.stun>0&&e.type==='bat')dr(I('enemies/batDead'),e.x,e.y+3,8,8,0,e.sc);
  else if(e.stun>0&&e.type==='eye')dr(I('enemies/eye/eyeDead'+e.form),e.x,e.y+3,10,10);
  else if(e.type==='bat')fr(I('enemies/bat'),16,16,f,0,e.x,y,8,8,e.sc);
  else if(e.type==='eye'){fr(I('enemies/eye2/eyeBody'),20,20,f,0,e.x,y,10,10);const d=norm(P.x-e.x,P.y-e.y),ir=I('enemies/eye2/iris1');dr(ir,e.x+d.x*1.2,y-1.5+d.y*1.2)}
  else{const img=I(e.form===2?'enemies/skeleton/mage':'enemies/skeleton/knife'),c=e.form===2&&e.st===100&&e.pt>0&&e.pt<.4?2:f;if(e.stun>0)dr(I('enemies/skeleton/skeletonStun'),e.x,e.y,I('enemies/skeleton/skeletonStun').width/2,12,0,e.sc);else fr(img,20,24,c,0,e.x,e.y,10,12,e.sc)}
  ctx.filter='none';if(e.st===99)dr(I('enemies/alert'),e.x,e.y-14.5);
}
function spawnProj(x,y){const d=norm(P.x-x,P.y-y);G.pr.push({x,y,vx:d.x*60,vy:d.y*60,t:4});sfx('enemies/projectile')}

// ---------- loot ----------
function spawnLoot(x,y,type,dir,price){if(!I(({coin1:'items/coin1Sheet',coin2:'items/coin2Sheet',coin3:'items/coin3Sheet',arrow:'items/arrow',bomb:'items/bomb',key:'items/key',heart:'items/heart',container:'items/container',quiver:'items/quiver',sword2:'items/sword2'})[type]))return;G.loot.push({x,y,type,dir,bt:dir?.4:0,t:rnd(0,3)})}
function pickLoot(l){
  const t=l.type;
  if(t.startsWith('coin')){{const v={coin1:1,coin2:5,coin3:10}[t];D.money+=v;RUN.score+=v;RUN.lvScore+=v;RUN.coins+=v}sfx('items/coin-edit')}
  else if(t==='heart'){if(P.hp>=D.maxHealth)return false;P.hp=Math.min(D.maxHealth,P.hp+1);sfx('items/set')}
  else if(t==='arrow'){if(D.arrows>=D.maxArrows)return false;D.arrows=Math.min(D.maxArrows,D.arrows+5);sfx('items/set')}
  else if(t==='bomb'){if(D.bombs>=D.maxBombs)return false;D.bombs=Math.min(D.maxBombs,D.bombs+3);sfx('items/set')}
  else if(t==='key'){D.keys++;sfx('items/set')}
  else if(t==='container'){D.maxHealth++;P.hp=D.maxHealth;sfx('items/set')}
  else if(t==='quiver'){D.maxArrows+=10;D.arrows=D.maxArrows;sfx('items/set')}
  else if(t==='sword2'){D.dmg=2;sfx('items/set')}
  return true;
}
function drawLoot(l){
  const t=l.type,bob=Math.sin(l.t*4)*1.2,sh=I(t.startsWith('coin')?'items/lootShadow2':'items/lootShadow');
  dr(sh,l.x,l.y+5);
  if(t.startsWith('coin')){fr(I('items/'+t+'Sheet'),8,8,Math.floor(l.t/.2)%4,0,l.x,l.y+bob,4,4)}
  else{const sp=I('items/'+(t==='arrow'||t==='sword2'?t:t));dr(sp,l.x,l.y+bob,sp.width/2,sp.height/2,t==='arrow'||t==='sword2'?-Math.PI/2:0)}
}

// ---------- jogador ----------
function hurtPlayer(d,src){
  if(P.inv>0||P.st===.5||G.dead)return;
  if(D.shield>0){D.shield--;P.inv=1;sfx('items/set');shake(1,.1);return}
  P.hp-=d;P.inv=1;P.stun=.25;P.st=10;sfx('player/playerHurt',.7);shake(1.5,.15);
  const k=norm(P.x-src.x,P.y-src.y);P.kx=k.x*150;P.ky=k.y*150;
  if(P.hp<=0){P.hp=0;G.dead=true;finishRun(false)}
}
// akhiri permainan & simpan hasil ke Local Storage (js/game-data.js)
function bank(done){const g=(RUN.coins-RUN.cb)*2+(RUN.kills-RUN.kb)*2+(done?20*(RUN.lv+1):0);RUN.cb=RUN.coins;RUN.kb=RUN.kills;if(g>0){GameData.addGold(g);RUN.gold=(RUN.gold||0)+g}}
function completeLevel(){G.won=true;bank(true);GameData.unlock(RUN.lv+2);sfx('items/chest');if(RUN.lv>=LV.length-1)finishRun(true)}
function finishRun(win){if(RUN.saved)return;RUN.saved=true;if(!win)bank(false);GameData.saveRun({score:RUN.score,kills:RUN.kills,time:Math.round(RUN.time),win,lv:RUN.lv+1,gold:RUN.gold||0})}
// Bidik otomatis: musuh terdekat dalam jangkauan; jika tidak ada, arah gerak terakhir. Tekan T untuk ganti ke bidik mouse.
let AUTO=true;const AIM_RANGE=150;
function autoTarget(){let b=null,bd=AIM_RANGE;for(const e of G.en){if(e.dead)continue;const d=dist(P.x,P.y,e.x,e.y);if(d<bd){bd=d;b=e}}return b}
function aimVec(x,y){if(AUTO){const t=autoTarget();return t?norm(t.x-x,t.y-y):(P.face||{x:0,y:1})}return norm(cam.x-VW/2+MS.x/S-x,cam.y-VH/2+MS.y/S-y)}
function useItem(slot){
  if(G.dead||G.paused||G.st!==1||![0,1.1].includes(P.st)&&P.st!==0)return;
  const it=D.item[slot];if(P.st!==0)return;
  const a=aimVec(P.x,P.y);
  if(it==='sword'){P.st=1;P.t=.08;P.at=a;P.combo++;P.dirX=a.x>=0?1:-1;P.dirY=a.y>0?1:-1;sfx('items/sword')}
  else if(it==='bomb'){if(D.bombs<1)return;D.bombs--;G.bombs.push({x:P.x,y:P.y+4,t:1.8});P.st=2;P.t=.25}
  else if(it==='boomerang'){if(G.boom)return;G.boom={x:P.x,y:P.y,d:a,ph:0,t:0,rot:0,hits:new Set()};sfx('items/boomerang');P.st=2;P.t=.2}
  else if(it==='fire'){G.fb.push({x:P.x+a.x*8,y:P.y+a.y*8,vx:a.x*120,vy:a.y*120,t:1.2});sfx('items/fire');P.st=2;P.t=.2}
}
function roll(){
  if(P.st!==0||P.rollCd>0||G.dead||G.paused||G.st!==1)return;
  let x=(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0),y=(K.KeyS||K.ArrowDown?1:0)-(K.KeyW||K.ArrowUp?1:0);
  if(!x&&!y)y=P.dirY;const d=norm(x,y);P.rd=d;P.st=.5;P.t=.33;P.aim=false;sfx('player/roll');if(x)P.dirX=x>0?1:-1;if(y)P.dirY=y>0?1:-1;
}
function updPlayer(dt){
  P.anim+=dt;if(P.inv>0)P.inv-=dt;if(P.rollCd>0)P.rollCd-=dt;
  P.kx*=Math.pow(.02,dt);P.ky*=Math.pow(.02,dt);
  let mv={x:0,y:0};
  if(P.st===0){
    const x=(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0),y=(K.KeyS||K.ArrowDown?1:0)-(K.KeyW||K.ArrowUp?1:0);
    if(x){P.dirX=x}if(y)P.dirY=y;else if(x)P.dirY=1;
    const v=norm(x,y);if(x||y){P.face=v;mv={x:v.x*90*D.spd,y:v.y*90*D.spd};if(!P.walking)P.walking=true;P.dust-=dt;if(P.dust<0){P.dust=.22;G.pt.push({x:P.x,y:P.y+6,vx:-v.x*8,vy:-v.y*8-3,l:.3,c:'#cfc7b0',s:1.5})}P.idle=0}
    else{if(P.walking){P.walking=false;P.stopT=.66;P.anim=0}P.idle+=dt}
    // busur
    const bowSlot=D.item.left==='bow'&&MS.l?'left':D.item.right==='bow'&&MS.r?'right':null;
    if(bowSlot){P.aim=true;const a=aimVec(P.x,P.y);P.dirX=a.x>=0?1:-1;P.dirY=a.y>0?1:-1;mv.x*=.6;mv.y*=.6}
    else if(P.aim){P.aim=false;if(D.arrows>0){D.arrows--;const a=aimVec(P.x,P.y);G.arr.push({x:P.x+a.x*6,y:P.y+a.y*6,d:a,t:4});sfx('items/arrow');P.st=3.1;P.t=.25}}
  }else if(P.st===.5){mv={x:P.rd.x*150,y:P.rd.y*150};P.t-=dt;if(P.t<0){P.st=0;P.rollCd=.3}}
  else if(P.st===1){mv={x:P.at.x*90,y:P.at.y*90};P.t-=dt;if(P.t<0){P.st=1.1;P.t=.25;swordHit();G.fx.push({k:'slice',x:P.x,y:P.y+1,a:P.at,t:0,c:P.combo})}}
  else if(P.st===1.1||P.st===2||P.st===3.1){P.t-=dt;if(P.t<0)P.st=0}
  else if(P.st===10){P.stun-=dt;if(P.stun<=0){P.st=0}}
  else if(P.st===12){}
  move(P,(mv.x+P.kx)*dt,(mv.y+P.ky)*dt,12,12);
  // pintu terkunci
  if(D.keys>0){for(const w of G.walls)if(w.type==='lockedDoor'&&hit({x:P.x-7,y:P.y-7,w:14,h:14},w)){w.dead=true;D.keys--;D.brk[w.name]=true;shake(1,.1)}}
  G.walls=G.walls.filter(w=>!w.dead);
  // transisi
  if(!cur.dir&&(P.st===0||P.st===.5)){for(const t of G.trans)if(hit(box(P,12,12),t)){P.st=12;fade(()=>{loadMap(t.to,t.dx,t.dy);P.st=0;P.walking=false});break}}
}
function swordHit(){
  const dmg=D.dmg;for(const e of G.en){if(e.dead)continue;const d=dist(P.x,P.y,e.x,e.y);if(d>26)continue;const v=norm(e.x-P.x,e.y-P.y);if(v.x*P.at.x+v.y*P.at.y>.3||d<10)hurtEnemy(e,dmg,v.x,v.y)}
}
function drawPlayer(){
  const sheet=IM['assets/sprites/player/playerSheet'+D.outfit+'.png'],up=P.dirY<0;
  if(P.stun>0)ctx.filter='sepia(1) saturate(5) hue-rotate(-30deg)';
  else if(P.inv>0)ctx.globalAlpha=Math.floor(P.inv/.05)%2?.55:.8;
  let c=0,r=up?1:0;const fw=19,fh=21;
  if(P.st===.5){r=up?4:3;c=Math.min(2,Math.floor((.33-P.t)/.11))}
  else if(P.st===1||P.st===1.1||P.st===2||P.st===3.1||P.aim){c=P.st===1||P.aim?0:1;if(P.st===2||P.st===3.1)c=1;if(P.aim)c=1}
  else if(P.walking)c=Math.floor(P.anim/.14)%2;
  else if(P.stopT>0){P.stopT-=1/60;r=up?6:5;c=Math.min(2,Math.floor((.66-P.stopT)/.22))}
  else{r=up?8:7;if(up)c=Math.floor(P.anim/.22)%2;else{const t=P.anim%3.8;c=t<1.2?0:t<1.3?1:t<3.7?2:3}}
  dr(I('player/playerShadow'),P.x,P.y+5);
  const sw=I('items/sword'),b=aimVec(P.x,P.y+1);let sl=-1;
  if(P.st===1.1){const rot=P.combo%2?-Math.PI/2:Math.PI/2,t=Math.atan2(P.at.y,P.at.x)+rot,vx=Math.cos(t),vy=Math.sin(t);if(vy>0)sl=1;if(sl===-1)dr(sw,P.x+vx*12,P.y+1+vy*12,sw.width/2,sw.height/2,t)}
  const aiming=P.aim||P.st===3.1,bow=I(P.aim&&D.arrows>0&&MS.l|MS.r?'items/bow1':'items/bow2');
  const bang=Math.atan2(b.y,b.x),bowUp=bang<-.25&&bang>-Math.PI+.25;
  if(aiming&&bowUp)dr(bow,P.x+b.x*6,P.y+1+b.y*6,bow.width/2,bow.height/2,bang,1,b.x<0?-1:1);
  {const pf=ctx.filter,cs=GameData.load().cos||{};if(P.stun<=0&&cs.hue)ctx.filter='hue-rotate('+cs.hue+'deg)';fr(sheet,fw,fh,c,r,P.x,P.y,9.5,15,P.dirX);ctx.filter=pf;Cos.draw(ctx,P.x,P.y,up,P.dirX,cs)}
  if(aiming&&!bowUp)dr(bow,P.x+b.x*6,P.y+1+b.y*6,bow.width/2,bow.height/2,bang,1,b.x<0?-1:1);
  if(P.st===1.1&&sl===1){const rot=P.combo%2?-Math.PI/2:Math.PI/2,t=Math.atan2(P.at.y,P.at.x)+rot;dr(sw,P.x+Math.cos(t)*12,P.y+1+Math.sin(t)*12,sw.width/2,sw.height/2,t)}
  ctx.filter='none';ctx.globalAlpha=1;
}

// ---------- proyektil & bom ----------
function explode(x,y){
  sfx('items/explosion');shake(2.5,.3);G.fx.push({k:'boom',x,y,t:0});G.decals.push({x,y,r:rnd(0,6)});if(G.decals.length>25)G.decals.shift();
  for(const e of G.en)if(!e.dead&&dist(x,y,e.x,e.y)<30){const v=norm(e.x-x,e.y-y);hurtEnemy(e,2,v.x,v.y,180)}
  if(dist(x,y,P.x,P.y)<24)hurtPlayer(1,{x,y});
  for(const w of G.walls)if(w.brk&&w.type!=='lockedDoor'&&dist(x,y,w.x+w.w/2,w.y+w.h/2)<34){w.dead=true;D.brk[w.name]=true;for(let i=0;i<10;i++)G.pt.push({x:w.x+w.w/2,y:w.y+w.h/2,vx:rnd(-50,50),vy:rnd(-60,-10),l:.7,c:'#8a7a68',s:2})}
  G.walls=G.walls.filter(w=>!w.dead);
}
function updProj(dt){
  for(const a of G.arr){a.t-=dt;a.x+=a.d.x*230*dt;a.y+=a.d.y*230*dt;if(solid({x:a.x-3,y:a.y-3,w:6,h:6},false)){a.dead=true}
    for(const e of G.en)if(!e.dead&&hit({x:a.x-3,y:a.y-3,w:6,h:6},box(e,e.w,e.h))){hurtEnemy(e,1,a.d.x,a.d.y,100);a.dead=true;break}if(a.t<0)a.dead=true}
  for(const f of G.fb){f.t-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;if(solid({x:f.x-3,y:f.y-3,w:6,h:6},false))f.dead=true;for(const e of G.en)if(!e.dead&&hit({x:f.x-3,y:f.y-3,w:6,h:6},box(e,e.w,e.h))){hurtEnemy(e,1,f.vx/120,f.vy/120);f.dead=true;break}if(f.t<0)f.dead=true}
  for(const p of G.pr){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(solid({x:p.x-3,y:p.y-3,w:6,h:6},false)||p.t<0)p.dead=true;if(hit({x:p.x-3,y:p.y-3,w:6,h:6},box(P,12,12))&&!G.dead){hurtPlayer(.5,p);p.dead=true}}
  for(const b of G.bombs){b.t-=dt;if(b.t<=0){b.dead=true;explode(b.x,b.y)}}
  const b=G.boom;if(b){b.t+=dt;b.rot+=dt*20;
    if(b.ph===0){b.x+=b.d.x*170*dt;b.y+=b.d.y*170*dt;if(b.t>.45||solid({x:b.x-3,y:b.y-3,w:6,h:6},false)){b.ph=1;b.hits.clear()}}
    else{const d=norm(P.x-b.x,P.y-b.y);b.x+=d.x*190*dt;b.y+=d.y*190*dt;if(dist(b.x,b.y,P.x,P.y)<8)G.boom=null}
    if(G.boom){for(const e of G.en)if(!e.dead&&!b.hits.has(e)&&dist(b.x,b.y,e.x,e.y)<10){b.hits.add(e);const v=norm(e.x-b.x,e.y-b.y);hurtEnemy(e,1,v.x,v.y,100)}
      for(const l of G.loot)if(dist(b.x,b.y,l.x,l.y)<10){l.x=b.x;l.y=b.y}}}
  G.arr=G.arr.filter(a=>!a.dead);G.fb=G.fb.filter(a=>!a.dead);G.pr=G.pr.filter(a=>!a.dead);G.bombs=G.bombs.filter(a=>!a.dead);
}

// ---------- update utama ----------
function update(dt){
  if(cur.dir){cur.a+=cur.dir*dt/.25;if(cur.dir>0&&cur.a>=1){cur.a=1;cur.dir=-1;cur.fn&&cur.fn()}else if(cur.dir<0&&cur.a<=0){cur.a=0;cur.dir=0}}
  if(G.st!==1||G.paused||G.won)return;
  if(!G.dead){RUN.time+=dt;const lv=LV[RUN.lv];if(lv.boss?RUN.boss:RUN.lvScore>=lv.goal)completeLevel();
    if(D.buff&&D.buff.regen){RUN.rg=(RUN.rg||0)+dt;if(RUN.rg>12){RUN.rg=0;P.hp=Math.min(D.maxHealth,P.hp+.5)}}}
  const cs=GameData.load().cos||{},pet=PETS.find(q=>q.id===cs.pet); // pet mengikuti & menarik loot
  if(pet){const g=G.pet||(G.pet={x:P.x,y:P.y,t:0}),f=P.face||{x:0,y:1};g.t+=dt;g.x+=(P.x-f.x*10+(f.x>=0?-14:14)-g.x)*Math.min(1,5*dt);g.y+=(P.y-f.y*6-2-g.y)*Math.min(1,5*dt);
    if(!G.dead)for(const l of G.loot)if(!l.bt&&dist(l.x,l.y,P.x,P.y)<pet.magnet){const d=norm(P.x-l.x,P.y-l.y);l.x+=d.x*100*dt;l.y+=d.y*100*dt}}
  if(!G.dead){if(MS.l&&!MS.lh){MS.lh=true;if(D.item.left!=='bow')useItem(K.ShiftLeft||K.ShiftRight?'altL':'left')}if(!MS.l)MS.lh=false;
    if(MS.r&&!MS.rh){MS.rh=true;if(D.item.right!=='bow')useItem(K.ShiftLeft||K.ShiftRight?'altR':'right')}if(!MS.r)MS.rh=false;updPlayer(dt)}
  G.en.forEach(e=>updEnemy(e,dt));G.en=G.en.filter(e=>!e.dead);
  G.loot.forEach(l=>{l.t+=dt;if(l.bt>0){l.bt-=dt;l.x+=l.dir.x*dt;l.y+=l.dir.y*dt}else if(!G.dead&&dist(l.x,l.y,P.x,P.y)<10&&pickLoot(l))l.dead=true});G.loot=G.loot.filter(l=>!l.dead);
  G.chests.forEach(c=>{if(!c.open&&dist(c.x+c.w/2,c.y+c.h/2,P.x,P.y)<24){c.open=true;D.chests[c.id]=true;sfx('items/chest');const cx=c.x+(c.big?10:7),cy=c.y+8,L={test1:['coin2','coin1','coin1','coin2'],test2:['coin3','coin3'],test3:['coin2','coin2','coin2','coin2'],testKey:['key']}[c.id]||['coin2','coin1','coin1'],V=[[-1,0],[-1,1],[1,1],[1,0]];L.forEach((t,i)=>{const v=norm(...V[i%4]);spawnLoot(cx,cy,t,{x:v.x*30,y:v.y*30})})}});
  updProj(dt);
  G.fx.forEach(f=>f.t+=dt);G.fx=G.fx.filter(f=>f.t<({dead:.45,slice:.25,boom:.45})[f.k]);
  G.pt.forEach(p=>{p.l-=dt;p.vy+=250*dt;p.x+=p.vx*dt;p.y+=p.vy*dt});G.pt=G.pt.filter(p=>p.l>0);
  const t=camTarget();cam.x+=(t.x-cam.x)*Math.min(1,8*dt);cam.y+=(t.y-cam.y)*Math.min(1,8*dt);if(shk.t>0)shk.t-=dt;
}

// ---------- gambar ----------
function drawWorld(){
  const M=G.M,ox=Math.round((cam.x-VW/2)*S)/S,oy=Math.round((cam.y-VH/2)*S)/S;let sx=0,sy=0;if(shk.t>0){sx=rnd(-1,1)*shk.m;sy=rnd(-1,1)*shk.m}
  ctx.save();ctx.translate(-ox+sx,-oy+sy);ctx.drawImage(G.tiles,0,0);
  G.decals.forEach(d=>dr(I('effects/scorch3'),d.x,d.y,undefined,undefined,d.r));
  for(const f of G.fx)if(f.k==='slice'&&0)0;
  const ents=[];
  G.trees.forEach(t=>ents.push({y:t.y+t.h,d:()=>dr(t.spr,t.x+6,t.y,t.spr.width/2,t.spr.height*.75)}));
  G.walls.forEach(w=>{if(w.spr)ents.push({y:w.y+w.h,d:()=>dr(w.spr,w.x+w.w/2,w.y+w.h/2+(w.oy||0))})});
  G.chests.forEach(c=>ents.push({y:c.y+c.h,d:()=>ctx.drawImage(I('environment/chest'+(c.big?'Big':'')+(c.open?'Open':'Closed')),c.x,c.y)}));
  G.npcs.forEach(n=>ents.push({y:n.y,d:()=>dr(I('npc/merchant'),n.x,n.y)}));
  G.en.forEach(e=>{if(Math.abs(e.x-cam.x)<VW/2+48&&Math.abs(e.y-cam.y)<VH/2+48)ents.push({y:e.y+8,d:()=>drawEnemy(e)})}); // hanya gambar musuh yang terlihat
  if(!G.dead)ents.push({y:P.y+6,d:drawPlayer});
  {const cs=GameData.load().cos||{},pc=PETS.find(q=>q.id===cs.pet);if(pc&&G.pet)ents.push({y:G.pet.y+8,d:()=>Cos.drawPet(ctx,I,pc,G.pet.x,G.pet.y,G.pet.t,cs.petHue)})}
  G.loot.forEach(l=>ents.push({y:l.y,d:()=>drawLoot(l)}));
  G.bombs.forEach(b=>ents.push({y:b.y,d:()=>{const f=Math.floor(b.t*(b.t<.7?14:5))%2;fr(I('items/bombSheet'),12,12,f,0,b.x,b.y,6,6)}}));
  ents.sort((a,b)=>a.y-b.y).forEach(e=>e.d());
  G.arr.forEach(a=>{dr(I('effects/shadows/arrow'),a.x,a.y+6);dr(I('items/arrow'),a.x,a.y,undefined,undefined,Math.atan2(a.d.y,a.d.x))});
  G.fb.forEach(f=>dr(I('effects/fireball'),f.x,f.y));
  G.pr.forEach(p=>dr(I(Math.floor(p.t*8)%2?'effects/darkMagicB':'effects/darkMagicW'),p.x,p.y));
  if(G.boom){dr(I('effects/shadows/boomerang'),G.boom.x,G.boom.y+6);dr(I('items/boomerang'),G.boom.x,G.boom.y,undefined,undefined,G.boom.rot)}
  for(const f of G.fx){
    if(f.k==='boom'){const i=Math.min(5,Math.floor(f.t/.075));fr(I('effects/explosion'),32,32,i,0,f.x,f.y,16,16)}
    else if(f.k==='slice'){const s=I('effects/sliceAnim'),i=Math.min(1,Math.floor(f.t/.12));ctx.save();ctx.translate(f.x,f.y);ctx.rotate(Math.atan2(f.a.y,f.a.x));ctx.scale(1,f.c%2?-1:1);ctx.drawImage(s,i*23,0,23,39,-2,-19.5,23,39);ctx.restore()}
    else if(f.k==='dead'){ctx.globalAlpha=1-f.t/.45;dr(I(f.e.type==='bat'?'enemies/batDead':f.e.type==='eye'?'enemies/eye/eyeDead'+f.e.form:'enemies/skeleton/skeletonStun'),f.x,f.y-f.t*20,undefined,undefined,0,f.e.sc);ctx.globalAlpha=1}}
  G.pt.forEach(p=>{ctx.fillStyle=p.c;ctx.globalAlpha=Math.min(1,p.l*3);const s=p.s||1.5;ctx.fillRect(p.x-s/2,p.y-s/2,s,s)});ctx.globalAlpha=1;
  if(AUTO&&!G.dead){const t=autoTarget();if(t){ctx.strokeStyle='#ff4040';ctx.lineWidth=1;ctx.beginPath();ctx.arc(t.x,t.y,9+Math.sin(performance.now()/150),0,6.3);ctx.stroke()}}
  if(M.dark){const d=I('effects/darkness-wide');ctx.fillStyle='#000';const x0=P.x-d.width/2,y0=P.y-d.height/2;ctx.fillRect(x0-200,y0-200,d.width+400,200);ctx.fillRect(x0-200,y0+d.height,d.width+400,200);ctx.fillRect(x0-200,y0,200,d.height);ctx.fillRect(x0+d.width,y0,200,d.height);ctx.drawImage(d,x0,y0)}
  ctx.restore();
}
function text(t,x,y,size,font='VT323',al='center',col='#fff'){ctx.font=size*S+'px '+font;ctx.textAlign=al;ctx.textBaseline='top';ctx.fillStyle=col;ctx.fillText(t,x,y)}
const ITEMS=['sword','bow','bomb','boomerang','fire'];
const ICON={sword:'items/sword',bow:'items/bowIcon',bomb:'items/bomb',boomerang:'items/boomerang',fire:'items/fire-icon'};
function icon(it,x,y,s){const im=I(ICON[it]),k=Math.min(11/im.width,11/im.height)*s;ctx.drawImage(im,x+8*s-im.width*k/2,y+8*s-im.height*k/2,im.width*k,im.height*k)}
function drawHUD(){
  ctx.save();ctx.scale(1,1);
  for(let i=0;i<D.maxHealth;i++){const im=I(P.hp-i===.5?'ui/heart-half':P.hp>i?'ui/heart':'ui/heart-empty');ctx.drawImage(im,6+i*15*S,6,im.width*S,im.height*S)}
  const ci=I('items/coinIcon');ctx.drawImage(ci,cv.width-23*S,cv.height-10*S,ci.width*1.5*S,ci.height*1.5*S);text(String(D.money),cv.width-12*S,cv.height-11*S,6.5,'KPS','left');
  ['left','right'].forEach((s,i)=>{const bx=cv.width-(19+i*19)*S,by=6,it=D.item[s],b=I('ui/itemBox');ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(bx+1,by+1,16*S,16*S);ctx.drawImage(b,bx,by,b.width*S,b.height*S);ctx.save();ctx.translate(bx,by);icon(it,0,0,S);ctx.restore();
    const n=it==='bow'?D.arrows:it==='bomb'?D.bombs:-1;if(n>=0){const ab=I('ui/ammoBox');ctx.drawImage(ab,bx+2.5*S,by+19*S,ab.width*S,ab.height*S);text(String(n),bx+9.2*S,by+19.8*S,4.5,'KPS','center',(it==='bow'?D.arrows===D.maxArrows:D.bombs===D.maxBombs)?'#0f0':'#fff')}
    text(i?'R':'L',bx+8*S,by+16.5*S-0,3.5,'KPS','center','#ccc')});
  ctx.restore();
}
const fmt=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
function drawRunInfo(){
  const lv=LV[RUN.lv];text(lv.n,cv.width/2,3*S,6,'VT323','center','#ffd34a');
  text(lv.boss?'Kalahkan bos!':'Poin '+RUN.lvScore+' / '+lv.goal,cv.width/2,10*S,7,'VT323');
  text('Waktu '+fmt(RUN.time)+'   Rekor '+GameData.load().highScore+'   Auto-aim '+(AUTO?'ON':'OFF')+' (T)',cv.width/2,18*S,5,'VT323','center','#ccc');
  const bo=G.en.find(e=>e.kind==='boss');
  if(bo){const w=120*S,x=cv.width/2-w/2,y=cv.height-12*S;ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(x-2,y-2,w+4,6*S+4);ctx.fillStyle='#e04040';ctx.fillRect(x,y,w*Math.max(0,bo.hp)/bo.maxhp,6*S);text('RAJA TENGKORAK',cv.width/2,y-9*S,6)}
}
function drawPause(){
  ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(0,0,cv.width,cv.height);
  text('Equip items',cv.width/2,8*S,10,'VT323');text('Left click: equip to Left   Right click: equip to Right   Esc / Tab: close',cv.width/2,cv.height-14*S,7,'VT323');
  const n=ITEMS.length,sz=24*S,gap=8*S,x0=cv.width/2-(n*sz+(n-1)*gap)/2,y0=cv.height/2-sz/2;
  ITEMS.forEach((it,i)=>{const x=x0+i*(sz+gap);ctx.fillStyle=i===G.sel?'rgba(255,255,255,.28)':'rgba(255,255,255,.1)';ctx.fillRect(x,y0,sz,sz);ctx.strokeStyle='#fff';ctx.lineWidth=S/2;ctx.strokeRect(x,y0,sz,sz);ctx.save();ctx.translate(x,y0);icon(it,0,0,1.5*S);ctx.restore();
    text(it,x+sz/2,y0+sz+3*S,6,'VT323');const tag=(D.item.left===it?'L':'')+(D.item.right===it?' R':'');if(tag)text(tag.trim(),x+sz/2,y0-9*S,8,'VT323','center','#ffd34a')});
  const cu=I('ui/pause/cursor');void cu;
}
function pauseIndex(){const n=ITEMS.length,sz=24*S,gap=8*S,x0=cv.width/2-(n*sz+(n-1)*gap)/2,y0=cv.height/2-sz/2;for(let i=0;i<n;i++){const x=x0+i*(sz+gap);if(MS.x>=x&&MS.x<=x+sz&&MS.y>=y0&&MS.y<=y0+sz)return i}return -1}
function draw(){
  ctx.imageSmoothingEnabled=false;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#1a1a1a';ctx.fillRect(0,0,cv.width,cv.height);
  if(G.st===0){
    const L=['Press BackSpace to toggle fullscreen.','Press Esc to close menus.','','Use WASD or Arrow Keys to move.','Press the Spacebar to roll.','Press Tab or E to equip items.','Use the mouse to aim and attack.','','Press the Spacebar to start!'],Y=[10,22,0,47,59,71,83,0,111];
    text('LEGEND OF LUA',cv.width/2,0.5*S,9,'VT323','center','#ffd34a');
    L.forEach((t,i)=>t&&text(t,cv.width/2,Y[i]*S,12));
  }else{
    ctx.setTransform(S,0,0,S,0,0);drawWorld();ctx.setTransform(1,0,0,1,0,0);drawHUD();drawRunInfo();if(G.paused)drawPause();
    if(G.won){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,cv.width,cv.height);const last=RUN.lv>=LV.length-1;text(last?'QUEST COMPLETE!':'LEVEL SELESAI!',cv.width/2,38*S,20,'VT323','center','#ffd34a');text('Skor '+RUN.score+'  |  Waktu '+fmt(RUN.time)+'  |  Emas +'+(RUN.gold||0),cv.width/2,66*S,10,'VT323');text(last?'Spasi: main lagi dari Level 1  (Toko & Katalog di bar atas)':'Spasi: lanjut ke Level '+(RUN.lv+2),cv.width/2,82*S,9,'VT323')}
    if(G.dead){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,cv.width,cv.height);text('GAME OVER',cv.width/2,45*S,20,'VT323','center','#e04040');text('Press the Spacebar to try again',cv.width/2,75*S,10,'VT323')}
  }
  if(cur.a>0){ctx.fillStyle='rgba(0,0,0,'+cur.a+')';ctx.fillRect(0,0,cv.width,cv.height)}
}

// ---------- input & loop ----------
// ---------- level ----------
function applyMeta(){ // terapkan upgrade toko, buff, dan karakter terpilih
  const g=GameData.load(),o=g.owned||{},ch=CHARS.find(c=>c.id===(g.cos||{}).char)||CHARS[0];
  D.outfit=ch.id;D.spd=1+(o.boots?.15:0)+(ch.spd||0);D.dmg=o.sword2?2:1;D.dmgMul=1+(ch.dmg||0);D.maxHealth=4+(o.heart||0)+(ch.hp||0);
  D.maxArrows+=o.quiver?10:0;D.arrows=D.maxArrows;D.maxBombs+=o.bombbag?10:0;D.bombs=Math.min(D.maxBombs,10+(o.bombbag?5:0));
  D.buff={};for(const k of['dmg','shield','regen'])if((g.stock||{})[k]>0){D.buff[k]=true;GameData.useStock(k)}
  if(D.buff.shield)D.shield=2;if(D.buff.dmg)D.dmgMul*=1.5;
}
function reachable(sx,sy){ // sel yang bisa dijangkau dari titik awal (agar musuh tidak muncul di area terkunci)
  const C=8,cw=Math.ceil(G.M.w*16/C),ch=Math.ceil(G.M.h*16/C),seen=new Uint8Array(cw*ch),q=[[Math.floor(sx/C),Math.floor(sy/C)]],out=[];seen[q[0][1]*cw+q[0][0]]=1;
  while(q.length){const[cx,cy]=q.pop();out.push([cx*C+C/2,cy*C+C/2]);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=cw||ny>=ch||seen[ny*cw+nx])continue;seen[ny*cw+nx]=1;if(!solid({x:nx*C-1,y:ny*C-1,w:10,h:10}))q.push([nx,ny])}}
  return out}
function spawnLevel(lv){
  const cells=reachable(P.x,P.y).filter(c=>dist(c[0],c[1],P.x,P.y)>110),free=(x,y,w,h)=>!solid({x:x-w/2,y:y-h/2,w,h});
  const pick=()=>{for(let i=0;i<300;i++){const c=cells[Math.floor(Math.random()*cells.length)];if(c&&free(c[0],c[1],16,16)&&!G.en.some(e=>dist(e.x,e.y,c[0],c[1])<40))return c}return null};
  for(const k in lv.sp)for(let i=0;i<lv.sp[k];i++){const c=pick();if(c)spawnEnemy(c[0],c[1],k.replace(/\d$/,''),+(k.match(/\d$/)||[1])[0])}
  if(lv.boss){const far=cells.slice().sort((a,b)=>dist(b[0],b[1],P.x,P.y)-dist(a[0],a[1],P.x,P.y)).find(c=>free(c[0],c[1],34,40));
    if(far){spawnEnemy(far[0],far[1],'boss');G.en[G.en.length-1].st=100}}
}
function startGame(i=0,keep=false){
  const lv=LV[i];
  if(!keep){RUN={score:0,kills:0,time:0,saved:false,lv:i,lvScore:0,coins:0,cb:0,kb:0};newSave();applyMeta();P=newPlayer();P.hp=D.maxHealth}
  else{RUN.lv=i;RUN.lvScore=0;P.hp=Math.min(D.maxHealth,P.hp+1)}
  G.st=1;G.dead=false;G.won=false;G.paused=false;P.st=0;P.inv=0;P.stun=0;
  loadMap(lv.map,lv.st[0],lv.st[1]);spawnLevel(lv);
}
function initLevel(){const q=+(new URLSearchParams(location.search).get('lv'))||1;return clamp(Math.min(q,GameData.load().progress||1)-1,0,LV.length-1)}
addEventListener('keydown',e=>{
  initAudio();if(e.code!=='F5'&&e.code!=='F12'&&!e.ctrlKey)e.preventDefault();if(e.repeat)return;K[e.code]=true;
  if(e.code==='Backspace'){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{})}
  if(G.st===0){if(e.code==='Space'){sfx('ui/select');fade(startGame)}return}
  if(G.dead||G.won){if(e.code==='Space'){const n=G.won&&RUN.lv<LV.length-1;fade(()=>startGame(G.won?(n?RUN.lv+1:0):RUN.lv,n))}return}
  if(['Tab','KeyE','Enter'].includes(e.code)){G.paused=!G.paused;sfx(G.paused?'ui/menu-open':'ui/menu-close')}
  else if(e.code==='Escape'&&G.paused){G.paused=false;sfx('ui/menu-close')}
  else if(e.code==='Space')roll();
  else if(e.code==='KeyC'){{const ids=CHARS.map(c=>c.id),k=ids.indexOf(D.outfit);D.outfit=ids[(k+1)%ids.length]}}
  else if(e.code==='KeyT'){AUTO=!AUTO}
});
addEventListener('keyup',e=>K[e.code]=false);
addEventListener('blur',()=>{for(const k in K)K[k]=false;MS.l=MS.r=false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
function mpos(e){const r=cv.getBoundingClientRect();MS.x=(e.clientX-r.left)*cv.width/r.width;MS.y=(e.clientY-r.top)*cv.height/r.height}
addEventListener('mousemove',mpos);
addEventListener('mousedown',e=>{initAudio();mpos(e);if(e.button===0)MS.l=true;if(e.button===2)MS.r=true;
  if(G.paused){const i=pauseIndex();if(i>=0){const s=e.button===2?'right':'left',o=s==='left'?'right':'left';if(D.item[o]===ITEMS[i])D.item[o]=D.item[s];D.item[s]=ITEMS[i];sfx('ui/click')}}});
addEventListener('mouseup',e=>{if(e.button===0)MS.l=false;if(e.button===2)MS.r=false});
function resize(){const d=devicePixelRatio||1,w=cv.parentElement;cv.width=Math.floor(w.clientWidth*d);cv.height=Math.floor(w.clientHeight*d);S=(7.3/1200)*cv.height;VW=cv.width/S;VH=cv.height/S;if(G.M)snapCam()}
addEventListener('resize',resize);
let last=0;
function loop(t){const dt=Math.min(.05,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(loop)}
(async()=>{
  if(!Auth.requireLogin())return;
  resize();
  await Promise.all(MANIFEST.png.map(loadImg));
  MAPS=await (await fetch('assets/maps/maps.json')).json();
  startGame(initLevel());window.restartGame=()=>fade(()=>startGame(RUN.lv));
  document.getElementById('load').remove();requestAnimationFrame(loop);
})();
