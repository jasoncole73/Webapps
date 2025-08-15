/* Weather-Flip with hourly (3h) + daily aggregation */
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
const themeBtn = document.getElementById('themeBtn');
const geoBtn = document.getElementById('geoBtn');
const hourStrip = document.getElementById('hourStrip');
const dayGrid = document.getElementById('dayGrid');

const setStatus = (msg, cls = '') => { statusEl.className = 'status ' + cls; statusEl.textContent = msg || ''; };

function saveZip(zip){ try { localStorage.setItem(STORAGE_KEY, zip); } catch {} }
function loadZip(){ try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_ZIP; } catch { return DEFAULT_ZIP; } }

async function owm(path, params){
  if (!window.WEATHER_API_KEY) throw new Error('NO_KEY');
  const url = new URL('https://api.openweathermap.org' + path);
  Object.entries(params || {}).forEach(([k,v]) => url.searchParams.set(k, v));
  url.searchParams.set('appid', window.WEATHER_API_KEY);
  url.searchParams.set('units', 'imperial');
  const res = await fetch(url.toString());
  if (!res.ok){
    const err = new Error('HTTP_' + res.status);
    err.httpStatus = res.status; err.body = await res.text();
    throw err;
  }
  return res.json();
}

async function fetchCurrentByZip(zip){ return owm('/data/2.5/weather', { zip: zip + ',US' }); }
async function fetchForecastByZip(zip){ return owm('/data/2.5/forecast', { zip: zip + ',US' }); }
async function fetchCurrentByCoords(lat,lon){ return owm('/data/2.5/weather', { lat, lon }); }
async function fetchForecastByCoords(lat,lon){ return owm('/data/2.5/forecast', { lat, lon }); }

function applyCurrent(data){
  const { name, main, weather } = data || {};
  const w = (weather && weather[0]) || {};
  elLoc.textContent = name || '—';
  elTemp.textContent = main ? Math.round(main.temp) + '°F' : '—';
  elCond.textContent = w.description ? w.description.replace(/\b\w/g, c => c.toUpperCase()) : '—';
  if (w.icon){ elIcon.src = `https://openweathermap.org/img/wn/${w.icon}@2x.png`; elIcon.alt = w.main || ''; }
  else { elIcon.removeAttribute('src'); elIcon.alt=''; }
  themeByWeather(w.main, main?.temp);
  fxByWeather(w.main);
}

function hslFrom(main){
  const map = {
    Clear:[48,100,60], Clouds:[220,6,60], Rain:[210,80,55], Drizzle:[210,70,60], Thunderstorm:[250,65,70], Snow:[210,25,90], Mist:[220,10,80], Fog:[220,10,80], Haze:[40,90,70]
  };
  return map[main] || [220,10,70];
}

function renderHourly(list, tz){
  hourStrip.innerHTML = '';
  const items = list.slice(0,8);
  items.forEach(entry => {
    const date = new Date((entry.dt + tz) * 1000);
    const time = date.toUTCString().split(' ')[4].slice(0,5); // HH:MM
    const hour = date.getUTCHours();
    const ampm = hour>=12 ? 'PM':'AM';
    const hr12 = ((hour+11)%12+1);
    const label = `${hr12}${ampm}`;
    const ic = entry.weather?.[0]?.icon || '';
    const main = entry.weather?.[0]?.main || '';
    const temp = Math.round(entry.main?.temp ?? 0);
    const hue = hslFrom(main);
    const chipBg = `hsl(${hue[0]} ${hue[1]}% ${Math.max(88, hue[2]+20)}% / 1)`;
    const icoBg = `hsl(${hue[0]} ${Math.min(70,hue[1]+10)}% ${Math.min(60,hue[2])}% / 1)`;

    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<div class="t">${label}</div>
      <div class="ico" style="background:${icoBg}"><img alt="" src="https://openweathermap.org/img/wn/${ic}.png" width="22" height="22"/></div>
      <div class="temp">${temp}°</div>`;
    hourStrip.appendChild(div);
  });
}

function renderDaily(list, tz){
  // Aggregate 3h entries into per-day min/max + representative icon (noonish)
  dayGrid.innerHTML = '';
  const byDay = {};
  list.forEach(entry => {
    const local = new Date((entry.dt + tz) * 1000); // shift to local
    const key = local.toISOString().slice(0,10);
    byDay[key] = byDay[key] || { temps:[], icons:[], mains:[], noonDelta:Infinity, noonIcon:null, date:local };
    const d = byDay[key];
    d.temps.push(entry.main?.temp);
    d.icons.push(entry.weather?.[0]?.icon);
    d.mains.push(entry.weather?.[0]?.main);
    // pick closest to 12:00 local
    const delta = Math.abs(local.getHours() - 12);
    if (delta < d.noonDelta){ d.noonDelta = delta; d.noonIcon = entry.weather?.[0]?.icon; }
  });
  const keys = Object.keys(byDay).slice(0,5);
  keys.forEach(k => {
    const d = byDay[k];
    const min = Math.round(Math.min(...d.temps));
    const max = Math.round(Math.max(...d.temps));
    const icon = d.noonIcon || d.icons[0];
    const main = d.mains[0] || 'Clear';
    const date = new Date(k + 'T00:00:00Z');
    // Using tz isn't precise here, but for label it's ok
    const wday = date.toLocaleDateString(undefined, { weekday:'short' });
    const hue = hslFrom(main);
    const icoBg = `hsl(${hue[0]} ${Math.min(70,hue[1]+10)}% ${Math.min(60,hue[2])}% / 1)`;

    const card = document.createElement('div');
    card.className = 'day';
    card.innerHTML = `<div class="wday">${wday}</div>
      <div class="dico" style="background:${icoBg}"><img alt="" src="https://openweathermap.org/img/wn/${icon}.png" width="26" height="26"/></div>
      <div class="range"><strong>${max}°</strong> / ${min}°</div>`;
    dayGrid.appendChild(card);
  });
}

function titleCase(str){ return str.replace(/\b\w/g, c => c.toUpperCase()); }

function themeByWeather(main){
  const root = document.documentElement;
  const MAP = {
    Clear:  { bg:'#fff8e1', fg:'#0f172a', panel:'#ffffffcc', primary:'#fde68a', tileBG:'#2b2b2f', tileFG:'#fff', chip:'#fff' },
    Clouds: { bg:'#f3f4f6', fg:'#111827', panel:'#ffffffcc', primary:'#9ca3af', tileBG:'#374151', tileFG:'#e5e7eb', chip:'#fff' },
    Rain:   { bg:'#e5f2ff', fg:'#0f172a', panel:'#ffffffcc', primary:'#93c5fd', tileBG:'#1f2937', tileFG:'#ecfeff', chip:'#fff' },
    Drizzle:{ bg:'#e5f2ff', fg:'#0f172a', panel:'#ffffffcc', primary:'#93c5fd', tileBG:'#1f2937', tileFG:'#ecfeff', chip:'#fff' },
    Thunderstorm:{ bg:'#e9e7ff', fg:'#0f172a', panel:'#ffffffcc', primary:'#a5b4fc', tileBG:'#111827', tileFG:'#e5e7eb', chip:'#fff' },
    Snow:   { bg:'#f8fafc', fg:'#0f172a', panel:'#ffffffcc', primary:'#cbd5e1', tileBG:'#334155', tileFG:'#f8fafc', chip:'#fff' },
    Mist:   { bg:'#f1f5f9', fg:'#0f172a', panel:'#ffffffcc', primary:'#cbd5e1', tileBG:'#475569', tileFG:'#e5e7eb', chip:'#fff' },
    Fog:    { bg:'#f1f5f9', fg:'#0f172a', panel:'#ffffffcc', primary:'#cbd5e1', tileBG:'#475569', tileFG:'#e5e7eb', chip:'#fff' },
    Haze:   { bg:'#fef9c3', fg:'#0f172a', panel:'#ffffffcc', primary:'#f59e0b', tileBG:'#3f3f46', tileFG:'#fafaf9', chip:'#fff' }
  };
  const c = MAP[main] || { bg:'#fffaf0', fg:'#101113', panel:'#ffffffcc', primary:'#e5e7eb', tileBG:'#2b2b2f', tileFG:'#ffffff', chip:'#fff' };
  root.style.setProperty('--bg', c.bg);
  root.style.setProperty('--fg', c.fg);
  root.style.setProperty('--panel', c.panel);
  root.style.setProperty('--primary', c.primary);
  root.style.setProperty('--tile-bg', c.tileBG);
  root.style.setProperty('--tile-fg', c.tileFG);
  root.style.setProperty('--chip', c.chip);
}

// FX canvas (same as previous version, lightly adapted)
const canvas = document.getElementById('fx'); const ctx = canvas.getContext('2d');
let fxType = 'None'; let particles = [];
function resizeCanvas(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
const ro = new ResizeObserver(resizeCanvas); ro.observe(document.querySelector('.container')); resizeCanvas();
function fxClear(){ particles = []; fxType='None'; ctx.clearRect(0,0,canvas.width,canvas.height); }
function fxSnow(){ fxType='Snow'; particles = Array.from({length:120}, ()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*2+1,v:Math.random()*0.6+0.4})); }
function fxRain(){ fxType='Rain'; particles = Array.from({length:140}, ()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,l:Math.random()*18+12,v:Math.random()*3+3})); }
function fxSun(){ fxType='Sun'; particles = Array.from({length:12}, (_,i)=>({angle:(Math.PI*2/12)*i})); }
function fxClouds(){ fxType='Clouds'; particles = Array.from({length:8}, ()=>({x:Math.random()*canvas.width,y:Math.random()*120+30,w:80+Math.random()*120,h:30+Math.random()*25,v:0.2+Math.random()*0.3})); }
function fxFog(){ fxType='Fog'; particles = Array.from({length:5}, ()=>({x:0,y:Math.random()*200+80,w:canvas.width,h:60+Math.random()*60,v:0.2+Math.random()*0.2})); }
let lightningTimer = 0;
function fxByWeather(main){
  if (main === 'Snow') fxSnow();
  else if (main === 'Rain' || main === 'Drizzle') fxRain();
  else if (main === 'Thunderstorm'){ fxRain(); lightningTimer = Date.now(); }
  else if (main === 'Clear') fxSun();
  else if (main === 'Clouds') fxClouds();
  else if (main === 'Mist' || main === 'Fog') fxFog();
  else fxClear();
}
function animate(){
  requestAnimationFrame(animate);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (fxType === 'Snow'){
    ctx.fillStyle='rgba(255,255,255,0.9)';
    particles.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); p.y+=p.v; p.x+=Math.sin(p.y*0.01)*0.3; if (p.y>canvas.height){ p.y=-5; p.x=Math.random()*canvas.width; } });
  } else if (fxType === 'Rain'){
    ctx.strokeStyle='rgba(180,200,255,0.7)'; ctx.lineWidth=1.2;
    particles.forEach(p=>{ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+2,p.y+p.l); ctx.stroke(); p.y+=p.v*4; p.x+=1.2; if (p.y>canvas.height){ p.y=-20; p.x=Math.random()*canvas.width; } });
  } else if (fxType === 'Sun'){
    const cx = canvas.width - 120, cy = 120, r = 60;
    const grd = ctx.createRadialGradient(cx,cy,10,cx,cy,r*2); grd.addColorStop(0,'rgba(255,220,90,0.9)'); grd.addColorStop(1,'rgba(255,220,90,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx,cy,r*2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,200,80,0.65)'; ctx.lineWidth=3; const t = Date.now()*0.001;
    for (let i=0;i<12;i++){ const ang=t+(Math.PI*2/12)*i; const x1=cx+Math.cos(ang)*r; const y1=cy+Math.sin(ang)*r; const x2=cx+Math.cos(ang)*(r+22); const y2=cy+Math.sin(ang)*(r+22); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
  } else if (fxType === 'Clouds'){
    ctx.fillStyle='rgba(255,255,255,0.7)';
    particles.forEach(p=>{ ctx.beginPath(); ctx.ellipse(p.x,p.y,p.w,p.h,0,0,Math.PI*2); ctx.fill(); p.x+=p.v; if (p.x-p.w>canvas.width) p.x=-p.w; });
  } else if (fxType === 'Fog'){
    ctx.fillStyle='rgba(220,225,230,0.35)';
    particles.forEach(p=>{ ctx.fillRect(p.x,p.y,p.w,p.h); p.x+=p.v; if (p.x>canvas.width) p.x=-p.w; });
  }
  if (fxType === 'Rain' && Math.random()<0.004 || fxType==='Thunderstorm'){
    if (Date.now()-lightningTimer<120){ ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(0,0,canvas.width,canvas.height); } else if (Math.random() < 0.002){ lightningTimer = Date.now(); }
  }
}
animate();

async function loadByZip(zip){
  input.value = zip;
  setStatus('Fetching weather…', 'warn');
  try {
    const [cur, forecast] = await Promise.all([fetchCurrentByZip(zip), fetchForecastByZip(zip)]);
    applyCurrent(cur);
    const tz = forecast.city?.timezone ?? 0;
    renderHourly(forecast.list, tz);
    renderDaily(forecast.list, tz);
    setStatus(`Updated for ${zip}`, 'ok');
  } catch (err){ console.error(err); handleError(err); }
}

async function loadByCoords(lat, lon){
  setStatus('Fetching weather…', 'warn');
  try {
    const [cur, forecast] = await Promise.all([fetchCurrentByCoords(lat,lon), fetchForecastByCoords(lat,lon)]);
    applyCurrent(cur);
    const tz = forecast.city?.timezone ?? 0;
    renderHourly(forecast.list, tz);
    renderDaily(forecast.list, tz);
    setStatus('Updated for your location', 'ok');
  } catch (err){ console.error(err); handleError(err); }
}

function handleError(err){
  if (err.message === 'NO_KEY') setStatus('Add your OpenWeatherMap key in config.js.', 'err');
  else if (err.httpStatus === 401) setStatus('Invalid API key (401).', 'err');
  else if (err.httpStatus === 404) setStatus('Not found (404).', 'err');
  else if (err.httpStatus === 429) setStatus('Rate limited (429).', 'err');
  else setStatus('Could not fetch weather.', 'err');
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const zip = (input.value || '').trim();
  if (!/^\d{5}$/.test(zip)) { input.focus(); setStatus('Please enter a 5‑digit ZIP.', 'err'); return; }
  saveZip(zip); loadByZip(zip);
});

geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation){ setStatus('Geolocation not supported.', 'err'); return; }
  setStatus('Locating…', 'warn');
  navigator.geolocation.getCurrentPosition(p => loadByCoords(p.coords.latitude, p.coords.longitude),
    () => setStatus('Location permission denied.', 'err'),
    { enableHighAccuracy:false, timeout:8000, maximumAge:60000 });
});

setInterval(() => loadByZip(loadZip()), REFRESH_MS);

function toggleFullscreen(){
  const root = document.documentElement;
  if (!document.fullscreenElement){ document.documentElement.requestFullscreen?.(); root.classList.add('fullscreen'); fullscreenBtn.textContent='⛶ Exit full screen'; }
  else { document.exitFullscreen?.(); root.classList.remove('fullscreen'); fullscreenBtn.textContent='⛶ Full screen'; }
}
fullscreenBtn.addEventListener('click', toggleFullscreen);

themeBtn.addEventListener('click', () => {
  const root = document.documentElement;
  root.classList.toggle('dark');
  themeBtn.textContent = root.classList.contains('dark') ? '☀️ Light mode' : '🌙 Dark mode';
});

// Boot
const initialZip = loadZip();
loadByZip(initialZip);
