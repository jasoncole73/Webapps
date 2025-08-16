/* Smooth cloud rendering + correct moon layering */
const STORAGE_KEY='weather_flip_zip'; const REFRESH_MS=10*60*1000; const DEFAULT_ZIP='10001';
window.setupClock=function(t){const p=v=>String(v).padStart(2,'0'); const u=()=>{const n=new Date(); t.value=[p(n.getHours()),p(n.getMinutes()),p(n.getSeconds())]; const sr=document.getElementById('sr-time'); if(sr) sr.textContent=t.value.join(':');}; u(); Tick.helper.interval(u,1000);};

const elLoc=document.getElementById('location'), elTemp=document.getElementById('temp'), elCond=document.getElementById('condition'), elIcon=document.getElementById('icon');
const form=document.getElementById('zipForm'), input=document.getElementById('zipInput'), statusEl=document.getElementById('status');
const fullscreenBtn=document.getElementById('fullscreenBtn'), geoBtn=document.getElementById('geoBtn');
const setStatus=(m,c='')=>{statusEl.className='status '+c; statusEl.textContent=m||''};
const ZIP_RE=/^\d{5}(-\d{4})?$/; const norm=z=>(z||'').trim().replace(/\s+/g,'');
function saveZip(z){try{localStorage.setItem('weather_flip_zip',z)}catch{}}
function loadZip(){try{return localStorage.getItem('weather_flip_zip')||DEFAULT_ZIP}catch{return DEFAULT_ZIP}}

async function fetchWeatherByZip(zip){ if(!window.WEATHER_API_KEY) throw new Error('NO_KEY'); const url=`https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`; const r=await fetch(url); if(!r.ok) throw await errOf(r); return r.json(); }
async function fetchWeatherByCoords(lat,lon){ if(!window.WEATHER_API_KEY) throw new Error('NO_KEY'); const url=`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${window.WEATHER_API_KEY}&units=imperial`; const r=await fetch(url); if(!r.ok) throw await errOf(r); return r.json(); }
async function errOf(res){ const t=await res.text(); const e=new Error('HTTP_'+res.status); e.httpStatus=res.status; e.body=t; return e; }

function applyWeather(d){ const {name,main,weather,sys,dt,timezone}=d||{}; const w=(weather&&weather[0])||{};
  elLoc.textContent=name||'—'; elTemp.textContent=main?Math.round(main.temp)+'°F':'—'; elCond.textContent=w.description?w.description.replace(/\b\w/g,c=>c.toUpperCase()):'—';
  if(w.icon){ elIcon.src=`https://openweathermap.org/img/wn/${w.icon}@2x.png`; elIcon.alt=w.main||''; } else { elIcon.removeAttribute('src'); elIcon.alt=''; }
  const night=isNight(w.icon,sys,dt,timezone); document.documentElement.classList.toggle('day',!night);
  themeByWeather(night); fxByWeather(w.main,night);
}

function isNight(iconCode, sys, dt, tz){ if(iconCode&&/n$/.test(iconCode)) return true; if(sys&&sys.sunrise&&sys.sunset&&typeof dt==='number'){ const local=dt+(tz||0); return local<sys.sunrise+(tz||0) || local>sys.sunset+(tz||0);} const h=new Date().getHours(); return (h<6||h>=19); }
function themeByWeather(night){ const r=document.documentElement; r.style.setProperty('--tile-bg',night?'#1b1f2a':'#2b2b2f'); r.style.setProperty('--tile-fg',night?'#e5e7eb':'#ffffff'); }

/* Canvas FX (smooth clouds) */
const canvas=document.getElementById('fx'); const ctx=canvas.getContext('2d'); let fxType='None', clouds=[], stars=[], lightningTimer=0;
function resize(){ canvas.width=canvas.clientWidth; canvas.height=canvas.clientHeight; } new ResizeObserver(resize).observe(document.querySelector('.container')); resize();

function fxClear(){ fxType='None'; clouds=[]; stars=[]; lightningTimer=0; ctx.clearRect(0,0,canvas.width,canvas.height); }
function fxSun(){ fxType='Sun'; clouds=[]; stars=[]; lightningTimer=0; }
function fxMoon(){ fxType='Moon'; clouds=[]; stars = Array.from({length:90},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height*0.6,a:Math.random()*0.6+0.2,r:Math.random()*1.3+0.6})); }
function makeClouds(){ clouds = Array.from({length:6},()=>({ x:Math.random()*canvas.width, y:60+Math.random()*140, w:160+Math.random()*200, h:50+Math.random()*30, v:0.05+Math.random()*0.12, a:0.65+Math.random()*0.15 })); }
function fxCloudsDay(){ fxType='CloudsDay'; makeClouds(); stars=[]; }
function fxCloudsNight(){ fxType='CloudsNight'; makeClouds(); if(stars.length===0) stars = Array.from({length:70},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height*0.6,a:Math.random()*0.6+0.2,r:Math.random()*1.2+0.5})); }
function fxRain(){ fxType='Rain'; makeClouds(); }
function fxSnow(){ fxType='Snow'; makeClouds(); }
function fxFog(){ fxType='Fog'; makeClouds(); }
function fxStorm(){ fxType='Storm'; makeClouds(); lightningTimer=0; }

function fxByWeather(main,night){
  if(night){
    if(main==='Rain'||main==='Drizzle') fxRain();
    else if(main==='Thunderstorm') fxStorm();
    else if(main==='Snow') fxSnow();
    else if(main==='Mist'||main==='Fog'||main==='Haze') fxFog();
    else if(main==='Clouds') fxCloudsNight();
    else fxMoon();
  }else{
    if(main==='Rain'||main==='Drizzle') fxRain();
    else if(main==='Thunderstorm') fxStorm();
    else if(main==='Snow') fxSnow();
    else if(main==='Mist'||main==='Fog'||main==='Haze') fxFog();
    else if(main==='Clouds') fxCloudsDay();
    else fxSun();
  }
}

function drawSoftCloud(x,y,w,h,alpha){
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter = 'blur(2px)';
  const r = h/2;
  const bumps = [
    {dx: -w*0.2, dy: 0, rr: r*0.9},
    {dx: -w*0.05, dy: -r*0.4, rr: r*1.1},
    {dx:  w*0.15, dy: -r*0.2, rr: r*1.0},
    {dx:  w*0.35, dy: 0, rr: r*0.9}
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  bumps.forEach(b => { ctx.beginPath(); ctx.arc(x+b.dx, y+b.dy, b.rr, 0, Math.PI*2); ctx.fill(); });
  ctx.fillRect(x-w*0.35, y, w*0.7, r);
  ctx.restore();
}

function drawSun(){ const cx=180,cy=100,r=55; const g=ctx.createRadialGradient(cx,cy,10,cx,cy,r*3); g.addColorStop(0,'rgba(255,210,80,.9)'); g.addColorStop(1,'rgba(255,210,80,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r*3,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(255,200,80,.55)'; ctx.lineWidth=3; const t=Date.now()*0.001; for(let i=0;i<12;i++){ const a=t+(Math.PI*2/12)*i, x1=cx+Math.cos(a)*r, y1=cy+Math.sin(a)*r, x2=cx+Math.cos(a)*(r+22), y2=cy+Math.sin(a)*(r+22); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); } }
function drawMoon(){ const cx=120,cy=100,r=36; ctx.fillStyle='rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--bg'); ctx.beginPath(); ctx.arc(cx+10,cy-6,r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.9)'; stars.forEach(s=>{ ctx.globalAlpha=s.a*(0.7+0.3*Math.sin((Date.now()*0.002)+(s.x+s.y))); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); }); ctx.globalAlpha=1; }

function animate(){
  requestAnimationFrame(animate);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Background gradient drift
  const grd = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
  grd.addColorStop(0,'rgba(0,0,0,0)');
  grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if (fxType==='Sun') {
    drawSun();
  }

  // Draw clouds first
  if (['CloudsDay','CloudsNight','Rain','Snow','Fog','Storm'].includes(fxType)) {
    clouds.forEach(c => {
      drawSoftCloud(c.x, c.y, c.w, c.h, c.a);
      c.x += c.v; if (c.x - c.w*0.35 > canvas.width) c.x = -c.w*0.35;
    });
  }

  // Then moon (so clouds are behind it)
  if (fxType==='CloudsNight') {
    drawMoon();
  } else if (fxType==='Moon') {
    drawMoon();
  }

  // Precip effects (raindrops / snow) after clouds
  if (fxType==='Rain' || fxType==='Storm') {
    ctx.strokeStyle = 'rgba(180,200,255,.7)'; ctx.lineWidth = 1.1;
    for (let i=0;i<140;i++){
      const x = (i*17 + Date.now()*0.35) % canvas.width;
      const y = (i*29 + Date.now()*0.9) % canvas.height;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+2, y+14); ctx.stroke();
    }
    if (fxType==='Storm' && Math.random()<0.02){
      ctx.fillStyle='rgba(255,255,255,.45)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    }
  } else if (fxType==='Snow') {
    ctx.fillStyle='rgba(255,255,255,.95)';
    for (let i=0;i<120;i++){
      const x = (i*23 + Math.sin((Date.now()+i*100)*0.002)*20 + canvas.width) % canvas.width;
      const y = (i*31 + Date.now()*0.15) % canvas.height;
      ctx.beginPath(); ctx.arc(x,y,1.4,0,Math.PI*2); ctx.fill();
    }
  } else if (fxType==='Fog') {
    for (let i=0;i<6;i++){
      const y = 40 + i*60 + Math.sin((Date.now()+i*500)*0.0003)*10;
      const g = ctx.createLinearGradient(0,y,0,y+90);
      g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(0.5,'rgba(255,255,255,.14)'); g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g; ctx.fillRect(0,y-25,canvas.width,90);
    }
  }
}
animate();

/* UI handlers */
input.addEventListener('input', ()=>{ if(ZIP_RE.test(norm(input.value))) setStatus('', '') });
form.addEventListener('submit', e=>{ e.preventDefault(); const z=norm(input.value); if(!ZIP_RE.test(z)){ input.focus(); setStatus('Please enter a 5‑digit ZIP (or ZIP+4).','err'); return;} saveZip(z); load(z); });
geoBtn.addEventListener('click', ()=>{
  if(!navigator.geolocation){ setStatus('Geolocation not supported.','err'); return; }
  setStatus('Locating…','warn');
  navigator.geolocation.getCurrentPosition(async p=>{ try{ const d=await fetchWeatherByCoords(p.coords.latitude,p.coords.longitude); applyWeather(d); setStatus('Updated for your location','ok'); } catch(e){ handleErr(e); } }, err=> setStatus('Location permission denied.','err'), { enableHighAccuracy:false, timeout:8000, maximumAge:60000 });
});
function handleErr(e){ console.error(e); setStatus('Could not fetch weather.','err'); }
setInterval(()=>load(loadZip()), REFRESH_MS);
function toggleFS(){ const r=document.documentElement; if(!document.fullscreenElement){ document.documentElement.requestFullscreen?.(); r.classList.add('fullscreen'); fullscreenBtn.textContent='⛶ Exit full screen'; } else { document.exitFullscreen?.(); r.classList.remove('fullscreen'); fullscreenBtn.textContent='⛶ Full screen'; } }
fullscreenBtn.addEventListener('click', toggleFS);

async function load(zip){ input.value=zip; setStatus('Fetching weather…','warn'); try{ const d=await fetchWeatherByZip(zip); applyWeather(d); setStatus(`Updated for ${zip}`,'ok'); } catch(e){ console.error(e); setStatus('Could not fetch weather.','err'); } }

const initialZip = loadZip(); load(initialZip);
