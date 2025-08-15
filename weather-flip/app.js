/* Weather-Flip Clean JS with moon/stars at night */
const STORAGE_KEY = 'weather_flip_zip';
const REFRESH_MS = 10 * 60 * 1000;
const DEFAULT_ZIP = '10001';

// Flip clock
window.setupClock = function(tick){
  const pad = v => String(v).padStart(2,'0');
  const update = () => {
    const now = new Date();
    tick.value = [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())];
    const sr = document.getElementById('sr-time');
    if (sr) sr.textContent = tick.value.join(':');
  };
  update();
  Tick.helper.interval(update, 1000);
};

// DOM
const elLoc = document.getElementById('location');
const elTemp = document.getElementById('temp');
const elCond = document.getElementById('condition');
const elIcon = document.getElementById('icon');
const form = document.getElementById('zipForm');
const input = document.getElementById('zipInput');
const statusEl = document.getElementById('status');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const geoBtn = document.getElementById('geoBtn');

const setStatus = (msg, cls = '') => { statusEl.className = 'status ' + cls; statusEl.textContent = msg || ''; };
function saveZip(zip){ try{ localStorage.setItem(STORAGE_KEY, zip); }catch{} }
function loadZip(){ try{ return localStorage.getItem(STORAGE_KEY) || DEFAULT_ZIP; }catch{ return DEFAULT_ZIP; } }

async function fetchWeatherByZip(zip){
  if (!window.WEATHER_API_KEY) throw new Error('NO_KEY');
  const url = `https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) throw await buildHttpError(res);
  return res.json();
}
async function fetchWeatherByCoords(lat, lon){
  if (!window.WEATHER_API_KEY) throw new Error('NO_KEY');
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) throw await buildHttpError(res);
  return res.json();
}
async function buildHttpError(res){
  const text = await res.text();
  const code = res.status;
  const err = new Error('HTTP_' + code);
  err.httpStatus = code;
  err.body = text;
  return err;
}

// Theming and FX
function isNight(nowUTC, sunriseUTC, sunsetUTC, tzOffsetSec){
  // Convert sunrise/sunset UTC to local by adding tz offset
  const nowLocal = nowUTC + tzOffsetSec;
  const sunriseLocal = sunriseUTC + tzOffsetSec;
  const sunsetLocal = sunsetUTC + tzOffsetSec;
  return nowLocal < sunriseLocal || nowLocal > sunsetLocal;
}

function applyWeather(data){
  const { name, main, weather, sys, dt, timezone } = data || {};
  const w = (weather && weather[0]) || {};
  elLoc.textContent = name || '—';
  elTemp.textContent = main ? Math.round(main.temp) + '°F' : '—';
  const desc = w.description ? w.description.replace(/\b\w/g, c => c.toUpperCase()) : '—';
  elCond.textContent = desc;
  if (w.icon){ elIcon.src = `https://openweathermap.org/img/wn/${w.icon}@2x.png`; elIcon.alt = w.main || ''; }
  else { elIcon.removeAttribute('src'); elIcon.alt=''; }
  const night = sys ? isNight(dt, sys.sunrise, sys.sunset, timezone||0) : false;
  themeByWeather(w.main, night);
  fxByWeather(w.main, night);
}

function themeByWeather(main, night){
  const root = document.documentElement;
  const mapDay = {
    Clear:  { bg:'#fff8e1', fg:'#0f172a', panel:'#ffffff', primary:'#fde68a', tileBG:'#2b2b2f', tileFG:'#fff' },
    Clouds: { bg:'#f3f4f6', fg:'#111827', panel:'#ffffff', primary:'#9ca3af', tileBG:'#374151', tileFG:'#e5e7eb' },
    Rain:   { bg:'#e5f2ff', fg:'#0f172a', panel:'#ffffff', primary:'#93c5fd', tileBG:'#1f2937', tileFG:'#ecfeff' },
    Drizzle:{ bg:'#e5f2ff', fg:'#0f172a', panel:'#ffffff', primary:'#93c5fd', tileBG:'#1f2937', tileFG:'#ecfeff' },
    Thunderstorm:{ bg:'#e9e7ff', fg:'#0f172a', panel:'#ffffff', primary:'#a5b4fc', tileBG:'#111827', tileFG:'#e5e7eb' },
    Snow:   { bg:'#f8fafc', fg:'#0f172a', panel:'#ffffff', primary:'#cbd5e1', tileBG:'#334155', tileFG:'#f8fafc' },
    Mist:   { bg:'#f1f5f9', fg:'#0f172a', panel:'#ffffff', primary:'#cbd5e1', tileBG:'#475569', tileFG:'#e5e7eb' },
    Fog:    { bg:'#f1f5f9', fg:'#0f172a', panel:'#ffffff', primary:'#cbd5e1', tileBG:'#475569', tileFG:'#e5e7eb' },
    Haze:   { bg:'#fef9c3', fg:'#0f172a', panel:'#ffffff', primary:'#f59e0b', tileBG:'#3f3f46', tileFG:'#fafaf9' }
  };
  const mapNight = {
    Clear:  { bg:'#0b1020', fg:'#e5e7eb', panel:'#111827', primary:'#60a5fa', tileBG:'#0f172a', tileFG:'#e5e7eb' },
    Clouds: { bg:'#0f1220', fg:'#e5e7eb', panel:'#111827', primary:'#94a3b8', tileBG:'#111827', tileFG:'#e5e7eb' },
    Rain:   { bg:'#0b1220', fg:'#e5e7eb', panel:'#111827', primary:'#60a5fa', tileBG:'#0b1220', tileFG:'#e5e7eb' },
    Drizzle:{ bg:'#0b1220', fg:'#e5e7eb', panel:'#111827', primary:'#60a5fa', tileBG:'#0b1220', tileFG:'#e5e7eb' },
    Thunderstorm:{ bg:'#0b0f1a', fg:'#e5e7eb', panel:'#0f172a', primary:'#a5b4fc', tileBG:'#0b0f1a', tileFG:'#e5e7eb' },
    Snow:   { bg:'#0b111a', fg:'#e5e7eb', panel:'#0f172a', primary:'#cbd5e1', tileBG:'#0f172a', tileFG:'#f8fafc' },
    Mist:   { bg:'#0b0f14', fg:'#e5e7eb', panel:'#0f172a', primary:'#94a3b8', tileBG:'#0f172a', tileFG:'#e5e7eb' },
    Fog:    { bg:'#0b0f14', fg:'#e5e7eb', panel:'#0f172a', primary:'#94a3b8', tileBG:'#0f172a', tileFG:'#e5e7eb' },
    Haze:   { bg:'#1a1510', fg:'#e5e7eb', panel:'#111827', primary:'#f59e0b', tileBG:'#1f1b16', tileFG:'#f1f5f9' }
  };
  const c = (night?mapNight:mapDay)[main] || (night?mapNight.Clear:mapDay.Clear);
  root.style.setProperty('--bg', c.bg);
  root.style.setProperty('--fg', c.fg);
  root.style.setProperty('--panel', c.panel);
  root.style.setProperty('--primary', c.primary);
  root.style.setProperty('--tile-bg', c.tileBG);
  root.style.setProperty('--tile-fg', c.tileFG);
}

// FX
const canvas = document.getElementById('fx');
const ctx = canvas.getContext('2d');
let fxType = 'None';
let particles = [];
function resizeCanvas(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
const ro = new ResizeObserver(resizeCanvas); ro.observe(document.querySelector('.container')); resizeCanvas();

function fxClear(){ particles = []; fxType = 'None'; ctx.clearRect(0,0,canvas.width,canvas.height); }
function fxSnow(){ fxType='Snow'; particles = Array.from({length:120},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*2+1,v:Math.random()*0.6+0.4})); }
function fxRain(){ fxType='Rain'; particles = Array.from({length:140},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,l:Math.random()*18+12,v:Math.random()*3+3})); }
function fxSun(){ fxType='Sun'; }
function fxMoon(){ fxType='Moon'; }
function fxClouds(){ fxType='Clouds'; particles = Array.from({length:10},()=>({x:Math.random()*canvas.width,y:Math.random()*120+20,w:120+Math.random()*120,h:40+Math.random()*20,v:0.2+Math.random()*0.4,alpha:0.5})); }
function fxFog(){ fxType='Fog'; particles = Array.from({length:6},()=>({x:0,y:Math.random()*canvas.height, w:canvas.width, h:40+Math.random()*40, v:0.15+Math.random()*0.25, alpha:0.08})); }
function fxThunder(){ fxType='Thunder'; particles = Array.from({length:120},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,l:Math.random()*18+12,v:Math.random()*3+3})); }

function fxByWeather(main, night){
  if (night && (main==='Clear' || main==='Clouds')) { if (main==='Clouds') fxClouds(); else fxMoon(); return; }
  if (main==='Snow') fxSnow();
  else if (main==='Rain' || main==='Drizzle') fxRain();
  else if (main==='Thunderstorm') fxThunder();
  else if (main==='Clouds') fxClouds();
  else if (main==='Mist' || main==='Fog' || main==='Haze') fxFog();
  else fxSun();
}

function animate(){
  requestAnimationFrame(animate);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (fxType==='Sun'){
    const cx = 140, cy = 80, r = 40;
    const grd = ctx.createRadialGradient(cx,cy,10,cx,cy,r*2);
    grd.addColorStop(0,'rgba(255,220,90,0.9)'); grd.addColorStop(1,'rgba(255,220,90,0.0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx,cy,r*2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,80,0.65)'; ctx.lineWidth = 3;
    const t = Date.now()*0.001;
    for (let i=0;i<10;i++){ const ang=t+(Math.PI*2/10)*i, x1=cx+Math.cos(ang)*r, y1=cy+Math.sin(ang)*r, x2=cx+Math.cos(ang)*(r+18), y2=cy+Math.sin(ang)*(r+18); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
  } else if (fxType==='Moon'){
    const cx = 140, cy = 80, r = 26;
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(cx+10,cy-6,r*0.9,0,Math.PI*2); ctx.fill(); // crescent
    // stars
    ctx.fillStyle='rgba(255,255,255,0.9)';
    for(let i=0;i<40;i++){ const x=Math.random()*canvas.width, y=Math.random()*160; ctx.fillRect(x,y,1,1); }
  } else if (fxType==='Snow'){
    ctx.fillStyle='rgba(255,255,255,0.9)';
    particles.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); p.y+=p.v; p.x+=Math.sin(p.y*0.01)*0.3; if(p.y>canvas.height){p.y=-5; p.x=Math.random()*canvas.width;} });
  } else if (fxType==='Rain' || fxType==='Thunder'){
    ctx.strokeStyle='rgba(180,200,255,0.7)'; ctx.lineWidth=1.2;
    particles.forEach(p=>{ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+2,p.y+p.l); ctx.stroke(); p.y+=p.v*4; p.x+=1.2; if(p.y>canvas.height){p.y=-20; p.x=Math.random()*canvas.width;} });
    if (fxType==='Thunder' && Math.random()<0.01){ ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
  } else if (fxType==='Clouds'){
    ctx.fillStyle='rgba(255,255,255,0.85)';
    particles.forEach(p=>{ ctx.beginPath(); ctx.roundRect?.(p.x,p.y,p.w,p.h,20); ctx.fill(); p.x+=p.v; if(p.x>canvas.width+20) p.x=-p.w; });
  } else if (fxType==='Fog'){
    ctx.fillStyle='rgba(255,255,255,0.25)';
    particles.forEach(p=>{ ctx.fillRect(p.x,p.y, p.w, p.h); p.x+=p.v; if(p.x>canvas.width) p.x=-p.w; });
  }
}
animate();

// Loaders
async function load(zip){
  input.value = zip;
  setStatus('Fetching weather…','warn');
  try{
    const data = await fetchWeatherByZip(zip);
    applyWeather(data);
    setStatus(`Updated for ${zip}`,'ok');
  }catch(err){ console.error(err); handleError(err); }
}
function handleError(err){
  if (err.message==='NO_KEY') setStatus('Add your OpenWeatherMap key in config.js','err');
  else if (err.httpStatus===401) setStatus('Invalid API key (401).','err');
  else if (err.httpStatus===404) setStatus('ZIP not found (404).','err');
  else if (err.httpStatus===429) setStatus('Rate limited (429).','err');
  else setStatus('Could not fetch weather.','err');
  elLoc.textContent='—'; elTemp.textContent='—'; elCond.textContent='—'; elIcon.removeAttribute('src'); elIcon.alt=''; fxClear();
}

// Events
form.addEventListener('submit', e=>{ e.preventDefault(); const zip=(input.value||'').trim(); if(!/^\d{5}$/.test(zip)){ setStatus('Please enter a 5‑digit ZIP.','err'); input.focus(); return; } saveZip(zip); load(zip); });
geoBtn.addEventListener('click', ()=>{
  if (!navigator.geolocation){ setStatus('Geolocation not supported.','err'); return; }
  setStatus('Locating…','warn');
  navigator.geolocation.getCurrentPosition(async pos=>{
    const {latitude,longitude}=pos.coords;
    try{ const data=await fetchWeatherByCoords(latitude,longitude); applyWeather(data); setStatus('Updated for your location','ok'); }
    catch(err){ console.error(err); handleError(err); }
  }, err=> setStatus('Location permission denied.','err'), {timeout:8000, maximumAge:60000});
});
setInterval(()=>load(loadZip()), REFRESH_MS);

// Fullscreen
function toggleFullscreen(){
  const root=document.documentElement;
  if(!document.fullscreenElement){ document.documentElement.requestFullscreen?.(); root.classList.add('fullscreen'); fullscreenBtn.textContent='⛶ Exit full screen'; }
  else{ document.exitFullscreen?.(); root.classList.remove('fullscreen'); fullscreenBtn.textContent='⛶ Full screen'; }
}
fullscreenBtn.addEventListener('click', toggleFullscreen);

// Boot
const initialZip = loadZip(); load(initialZip);
