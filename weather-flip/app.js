/* One-clock global observer + PoP + new animations (wind, heavy snow, parallax clouds, rainbow) */
const STORAGE_KEY='weather_flip_zip'; const REFRESH_MS=10*60*1000; const DEFAULT_ZIP='10001';

/* Flip clock */
window.setupClock=function(t){const p=v=>String(v).padStart(2,'0'); const u=()=>{const n=new Date(); t.value=[p(n.getHours()),p(n.getMinutes()),p(n.getSeconds())]; const sr=document.getElementById('sr-time'); if(sr) sr.textContent=t.value.join(':'); }; u(); Tick.helper.interval(u,1000);};

/* Aggressive mirror killer: watch the whole page */
(function killMirrorsGlobal(){
  const root=document.getElementById('appRoot') || document.body;
  const isTimeText = (txt)=>/^\s*\d{1,2}:\d{2}:\d{2}\s*$/.test(txt||'');
  const hideIfTime = (el)=>{ if(!el || el.closest('.tick')) return; if(isTimeText(el.textContent)){ el.style.display='none'; el.classList.add('digital-time'); } };
  root.querySelectorAll('*').forEach(hideIfTime);
  const mo=new MutationObserver(muts=>{ muts.forEach(m=>{ if(m.type==='childList'){ m.addedNodes.forEach(n=>{ if(n.nodeType===1){ hideIfTime(n); n.querySelectorAll&&n.querySelectorAll('*').forEach(hideIfTime);} }); } else if(m.type==='characterData'){ const el=m.target.parentElement; if(el) hideIfTime(el); } }); });
  mo.observe(root,{childList:true,subtree:true,characterData:true});
})();

/* Elements */
const elLoc=document.getElementById('location'), elTemp=document.getElementById('temp'), elCond=document.getElementById('condition'), elIcon=document.getElementById('icon'), elPrecip=document.getElementById('precip');
const form=document.getElementById('zipForm'), input=document.getElementById('zipInput'), statusEl=document.getElementById('status');
const fullscreenBtn=document.getElementById('fullscreenBtn'), geoBtn=document.getElementById('geoBtn');
const setStatus=(m,c='')=>{statusEl.className='status '+c; statusEl.textContent=m||''};
const ZIP_RE=/^\d{5}(-\d{4})?$/; const norm=z=>(z||'').trim().replace(/\s+/g,'');
function saveZip(z){try{localStorage.setItem(STORAGE_KEY,z)}catch{}}
function loadZip(){try{return localStorage.getItem(STORAGE_KEY)||DEFAULT_ZIP}catch{return DEFAULT_ZIP}}

/* API calls */
async function httpErr(res){ const t=await res.text(); const e=new Error('HTTP_'+res.status); e.httpStatus=res.status; e.body=t; return e; }
async function fetchWeatherByZip(zip){ if(!window.WEATHER_API_KEY) throw new Error('NO_KEY'); const url=`https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`; const r=await fetch(url); if(!r.ok) throw await httpErr(r); return r.json(); }
async function fetchForecastByZip(zip){ if(!window.WEATHER_API_KEY) throw new Error('NO_KEY'); const url=`https://api.openweathermap.org/data/2.5/forecast?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`; const r=await fetch(url); if(!r.ok) throw await httpErr(r); return r.json(); }
async function fetchWeatherByCoords(lat,lon){ if(!window.WEATHER_API_KEY) throw new Error('NO_KEY'); const url=`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${window.WEATHER_API_KEY}&units=imperial`; const r=await fetch(url); if(!r.ok) throw await httpErr(r); return r.json(); }
async function fetchForecastByCoords(lat,lon){ if(!window.WEATHER_API_KEY) throw new Error('NO_KEY'); const url=`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${window.WEATHER_API_KEY}&units=imperial`; const r=await fetch(url); if(!r.ok) throw await httpErr(r); return r.json(); }

/* Apply weather */
let lastWind=0, lastTempF=0, lastMain='';
function applyWeather(d){ const {name,main,weather,sys,dt,timezone,wind}=d||{}; const w=(weather&&weather[0])||{};
  elLoc.textContent=name||'—'; elTemp.textContent=main?Math.round(main.temp)+'°F':'—'; elCond.textContent=w.description?w.description.replace(/\b\w/g,c=>c.toUpperCase()):'—';
  if(w.icon){ elIcon.src=`https://openweathermap.org/img/wn/${w.icon}@2x.png`; elIcon.alt=w.main||''; } else { elIcon.removeAttribute('src'); elIcon.alt=''; }
  lastWind = (wind && wind.speed) ? wind.speed : 0;
  lastTempF = main ? main.temp : 0;
  lastMain = w.main || '';
  const night=isNight(w.icon,sys,dt,timezone); document.documentElement.classList.toggle('day',!night);
  themeByWeather(night); fxByWeather(lastMain,night,lastWind,lastTempF);
}
function isNight(iconCode, sys, dt, tz){ if(iconCode&&/n$/.test(iconCode)) return true; if(sys&&sys.sunrise&&sys.sunset&&typeof dt==='number'){ const local=dt+(tz||0); return local<sys.sunrise+(tz||0) || local>sys.sunset+(tz||0);} const h=new Date().getHours(); return (h<6||h>=19); }
function themeByWeather(night){ const r=document.documentElement; r.style.setProperty('--tile-bg',night?'#1b1f2a':'#2b2b2f'); r.style.setProperty('--tile-fg',night?'#e5e7eb':'#ffffff'); }

/* Canvas FX with new modes */
const canvas=document.getElementById('fx'); const ctx=canvas.getContext('2d');
let fxType='None', layers=[], stars=[], lightningTimer=0, windStreaks=[], snowflakes=[];
function resize(){ canvas.width=canvas.clientWidth; canvas.height=canvas.clientHeight; } new ResizeObserver(resize).observe(document.querySelector('.container')); resize();
function fxClear(){ fxType='None'; layers=[]; stars=[]; lightningTimer=0; windStreaks=[]; snowflakes=[]; ctx.clearRect(0,0,canvas.width,canvas.height); }

function fxSun(){ fxClear(); fxType='Sun'; }
function fxMoon(){ fxClear(); fxType='Moon'; stars = Array.from({length:90},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height*0.6,a:Math.random()*0.6+0.2,r:Math.random()*1.3+0.6})); }
function makeParallaxClouds(){ layers=[
  {v:0.06,a:0.55,clouds:genClouds(4,0.25)},
  {v:0.10,a:0.70,clouds:genClouds(5,0.45)},
  {v:0.16,a:0.85,clouds:genClouds(6,0.65)},
]; }
function genClouds(n,yFactor){
  const arr=[]; for(let i=0;i<n;i++){ const w=140+Math.random()*220, h=40+Math.random()*32; arr.push({ x:Math.random()*canvas.width, y:60+canvas.height*yFactor*(0.15+Math.random()*0.2), w, h }); } return arr;
}
function fxCloudsDay(){ fxClear(); fxType='CloudsDay'; makeParallaxClouds(); }
function fxCloudsNight(){ fxClear(); fxType='CloudsNight'; makeParallaxClouds(); if(stars.length===0) stars = Array.from({length:70},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height*0.6,a:Math.random()*0.6+0.2,r:Math.random()*1.2+0.5})); }
function fxRain(){ fxClear(); fxType='Rain'; makeParallaxClouds(); }
function fxStorm(){ fxClear(); fxType='Storm'; makeParallaxClouds(); lightningTimer=0; }
function fxSnow(light=false){ fxClear(); fxType= light ? 'Snow' : 'HeavySnow'; makeParallaxClouds();
  const count = light ? 140 : 220;
  snowflakes = Array.from({length:count},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r: light? (1+Math.random()*2) : (1.5+Math.random()*3.5), v:(light? 0.4:0.9)+Math.random()*0.8, drift:Math.random()*2, gust:Math.random()*0.6}));
}
function fxFog(){ fxClear(); fxType='Fog'; makeParallaxClouds(); }
function fxWindy(){ fxClear(); fxType='Wind'; windStreaks = Array.from({length:120},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height, l:20+Math.random()*40, s:0.8+Math.random()*1.4})); makeParallaxClouds(); }
function fxRainbow(){ fxClear(); fxType='Rainbow'; makeParallaxClouds(); }

function fxByWeather(main,night,windSpeed,tempF){
  if(night){
    if(main==='Rain'||main==='Drizzle'){ fxRain(); }
    else if(main==='Thunderstorm'){ fxStorm(); }
    else if(main==='Snow'){ fxSnow(tempF>28); }
    else if(main==='Mist'||main==='Fog'||main==='Haze'){ fxFog(); }
    else if(main==='Clouds'){ fxCloudsNight(); }
    else { fxMoon(); }
  }else{
    if(main==='Rain'||main==='Drizzle'){ fxRainbow(); }
    else if(main==='Thunderstorm'){ fxStorm(); }
    else if(main==='Snow'){ fxSnow(tempF>28); }
    else if(main==='Mist'||main==='Fog'||main==='Haze'){ fxFog(); }
    else if(main==='Clouds'){ fxCloudsDay(); }
    else { fxSun(); }
  }
  if(windSpeed>=10 && fxType!=='Storm'){ fxWindy(); }
}

function drawSoftCloud(x,y,w,h,a){
  ctx.save(); ctx.globalAlpha=a; ctx.filter='blur(2px)';
  const r=h/2; const bumps=[{dx:-w*0.2,dy:0,rr:r*0.9},{dx:-w*0.05,dy:-r*0.4,rr:r*1.1},{dx:w*0.15,dy:-r*0.2,rr:r*1.0},{dx:w*0.35,dy:0,rr:r*0.9}];
  ctx.fillStyle='rgba(255,255,255,0.95)'; bumps.forEach(b=>{ ctx.beginPath(); ctx.arc(x+b.dx,y+b.dy,b.rr,0,Math.PI*2); ctx.fill(); }); ctx.fillRect(x-w*0.35,y,w*0.7,r); ctx.restore();
}
function drawSun(){ const cx=180,cy=100,r=55; const g=ctx.createRadialGradient(cx,cy,10,cx,cy,r*3); g.addColorStop(0,'rgba(255,210,80,.9)'); g.addColorStop(1,'rgba(255,210,80,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r*3,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(255,200,80,.55)'; ctx.lineWidth=3; const t=Date.now()*0.001; for(let i=0;i<12;i++){ const a=t+(Math.PI*2/12)*i, x1=cx+Math.cos(a)*r, y1=cy+Math.sin(a)*r, x2=cx+Math.cos(a)*(r+22), y2=cy+Math.sin(a)*(r+22); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); } }
function drawMoon(){ const cx=120,cy=100,r=36; ctx.fillStyle='rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--bg'); ctx.beginPath(); ctx.arc(cx+10,cy-6,r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.9)'; stars.forEach(s=>{ ctx.globalAlpha=s.a*(0.7+0.3*Math.sin((Date.now()*0.002)+(s.x+s.y))); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); }); ctx.globalAlpha=1; }
function drawRainbow(){
  const x=canvas.width*0.15, y=canvas.height*0.2, R=220;
  const arc=(r,c1,c2)=>{ const g=ctx.createLinearGradient(0,y,0,y+R); g.addColorStop(0,c1); g.addColorStop(1,c2); ctx.strokeStyle=g; ctx.lineWidth=14; ctx.beginPath(); ctx.arc(x,y,R-r,Math.PI*0.05,Math.PI*0.95); ctx.stroke(); };
  const cols=['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#4b0082','#8f00ff'];
  cols.forEach((c,i)=>arc(i*10, c, c+'80'));
}

function animate(){
  requestAnimationFrame(animate);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(fxType==='Sun') drawSun();
  if(fxType==='Moon') drawMoon();
  if(['CloudsDay','CloudsNight','Rain','Snow','HeavySnow','Fog','Storm','Wind','Rainbow'].includes(fxType)){
    layers.forEach((lay,idx)=>{
      lay.clouds.forEach(c=>{
        const a = lay.a*(fxType==='CloudsNight' ? 0.9 : 1);
        drawSoftCloud(c.x,c.y,c.w,c.h,a);
        c.x += lay.v; if (c.x - c.w*0.35 > canvas.width) c.x = -c.w*0.35;
      });
    });
  }
  if(fxType==='CloudsNight'){ drawMoon(); }
  if(fxType==='Rain' || fxType==='Storm' || fxType==='Rainbow'){
    ctx.strokeStyle='rgba(180,200,255,.7)'; ctx.lineWidth=1.1;
    for (let i=0;i<140;i++){
      const x=(i*17+Date.now()*0.35)%canvas.width;
      const y=(i*29+Date.now()*0.9)%canvas.height;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+2,y+14); ctx.stroke();
    }
    if(fxType==='Storm' && Math.random()<0.02){
      ctx.fillStyle='rgba(255,255,255,.45)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    }
  }
  if(fxType==='Snow' || fxType==='HeavySnow'){
    ctx.fillStyle='rgba(255,255,255,.95)';
    snowflakes.forEach(s=>{
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
      s.y += s.v; s.x += Math.sin((s.y+s.drift)*0.02)*(fxType==='HeavySnow'?1.2:0.5) + (fxType==='HeavySnow'?0.6:0);
      if(s.y>canvas.height){ s.y=-5; s.x=Math.random()*canvas.width; }
    });
  }
  if(fxType==='Fog'){
    for (let i=0;i<6;i++){
      const y=40+i*60+Math.sin((Date.now()+i*500)*0.0003)*10;
      const g=ctx.createLinearGradient(0,y,0,y+90);
      g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(0.5,'rgba(255,255,255,.14)'); g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g; ctx.fillRect(0,y-25,canvas.width,90);
    }
  }
  if(fxType==='Wind'){
    ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1;
    windStreaks.forEach(s=>{
      ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x+ s.l, s.y+ (Math.random()*2-1)); ctx.stroke();
      s.x += s.s*3.2; s.y += Math.sin((s.x+s.y)*0.002);
      if(s.x>canvas.width) { s.x=-20; s.y=Math.random()*canvas.height; }
    });
  }
  if(fxType==='Rainbow'){ drawRainbow(); }
}
animate();

/* PoP (chance of precipitation) — highest chance in next 12 hours */
function applyPoPFromForecast(forecast){
  try {
    const list = (forecast && forecast.list) || [];
    if (!list.length) { elPrecip.textContent = '—'; return; }
    const now = Date.now() / 1000;
    const next12 = list.filter(it => it.dt >= now && it.dt <= now + 12*3600);
    const windowList = next12.length ? next12 : list.slice(0, 4);
    let popMax = 0;
    windowList.forEach(it => {
      const p = (typeof it.pop === 'number') ? it.pop : 0;
      if (p > popMax) popMax = p;
      const has
