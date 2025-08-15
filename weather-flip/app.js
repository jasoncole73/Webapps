/* Weather-Flip JS with 3-hour forecast strip (free API), geolocation, dark mode, animations */
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
const hourlyEl = document.getElementById('hourly');
const hourlyStatusEl = document.getElementById('hourlyStatus');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const themeBtn = document.getElementById('themeBtn');
const geoBtn = document.getElementById('geoBtn');

const setStatus = (msg, cls = '') => { statusEl.className = 'status ' + cls; statusEl.textContent = msg || ''; };
const setHStatus = (msg, cls = '') => { hourlyStatusEl.className = 'status ' + cls; hourlyStatusEl.textContent = msg || ''; };

function saveZip(zip){ try { localStorage.setItem(STORAGE_KEY, zip); } catch {} }
function loadZip(){ try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_ZIP; } catch { return DEFAULT_ZIP; } }

async function fetchWeatherByZip(zip){
  if (!window.WEATHER_API_KEY) throw new Error('NO_KEY');
  const url = `https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) throw await buildHttpError(res);
  return res.json();
}
async function fetchForecastByZip(zip){
  if (!window.WEATHER_API_KEY) throw new Error('NO_KEY');
  const url = `https://api.openweathermap.org/data/2.5/forecast?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`;
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
async function fetchForecastByCoords(lat, lon){
  if (!window.WEATHER_API_KEY) throw new Error('NO_KEY');
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${window.WEATHER_API_KEY}&units=imperial`;
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

function titleCase(str){ return str.replace(/\b\w/g, c => c.toUpperCase()); }

function applyWeather(data){
  const { name, main, weather } = data || {};
  const w = (weather && weather[0]) || {};
  elLoc.textContent = name || '—';
  elTemp.textContent = main ? Math.round(main.temp) + '°F' : '—';
  elCond.textContent = w.description ? titleCase(w.description) : '—';
  if (w.icon){
    elIcon.src = `https://openweathermap.org/img/wn/${w.icon}@2x.png`;
    elIcon.alt = w.main || '';
  } else {
    elIcon.removeAttribute('src'); elIcon.alt = '';
  }
  themeByWeather(w.main, main?.temp);
  fxByWeather(w.main);
}

function renderHourly(forecast){
  hourlyEl.innerHTML = '';
  if (!forecast || !forecast.list){ setHStatus('No forecast data.', 'warn'); return; }
  const items = forecast.list.slice(0, 8); // next ~24h (3h steps)
  for (const it of items){
    const time = new Date(it.dt*1000);
    const hh = time.getHours();
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12 = (hh % 12) || 12;
    const tstr = `${h12}${ampm}`;
    const temp = Math.round(it.main?.temp ?? 0);
    const icon = it.weather?.[0]?.icon;
    const el = document.createElement('div');
    el.className = 'hour';
    el.innerHTML = `<div class="t">${tstr}</div>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="">
      <div class="temp">${temp}°</div>`;
    hourlyEl.appendChild(el);
  }
  setHStatus('');
}

// Theming
function themeByWeather(main){
  const root = document.documentElement;
  const MAP = {
    Clear:  { bg:'#fff8e1', fg:'#0f172a', panel:'#ffffffcc', primary:'#fde68a', tileBG:'#2b2b2f', tileFG:'#fff',
              chipBG:'rgba(0,0,0,0.05)', chipFG:'#0f172a', chipB:'#00000014' },
    Clouds: { bg:'#f3f4f6', fg:'#111827', panel:'#ffffffcc', primary:'#9ca3af', tileBG:'#374151', tileFG:'#e5e7eb',
              chipBG:'rgba(0,0,0,0.05)', chipFG:'#111827', chipB:'#00000014' },
    Rain:   { bg:'#e5f2ff', fg:'#0f172a', panel:'#ffffffcc', primary:'#93c5fd', tileBG:'#1f2937', tileFG:'#ecfeff',
              chipBG:'rgba(0,0,0,0.04)', chipFG:'#0f172a', chipB:'#00000014' },
    Drizzle:{ bg:'#e5f2ff', fg:'#0f172a', panel:'#ffffffcc', primary:'#93c5fd', tileBG:'#1f2937', tileFG:'#ecfeff',
              chipBG:'rgba(0,0,0,0.04)', chipFG:'#0f172a', chipB:'#00000014' },
    Thunderstorm:{ bg:'#e9e7ff', fg:'#0f172a', panel:'#ffffffcc', primary:'#a5b4fc', tileBG:'#111827', tileFG:'#e5e7eb',
              chipBG:'rgba(0,0,0,0.05)', chipFG:'#0f172a', chipB:'#00000014' },
    Snow:   { bg:'#f8fafc', fg:'#0f172a', panel:'#ffffffcc', primary:'#cbd5e1', tileBG:'#334155', tileFG:'#f8fafc',
              chipBG:'rgba(0,0,0,0.04)', chipFG:'#0f172a', chipB:'#00000014' },
    Mist:   { bg:'#f1f5f9', fg:'#0f172a', panel:'#ffffffcc', primary:'#cbd5e1', tileBG:'#475569', tileFG:'#e5e7eb',
              chipBG:'rgba(0,0,0,0.05)', chipFG:'#0f172a', chipB:'#00000014' },
    Fog:    { bg:'#f1f5f9', fg:'#0f172a', panel:'#ffffffcc', primary:'#cbd5e1', tileBG:'#475569', tileFG:'#e5e7eb',
              chipBG:'rgba(0,0,0,0.05)', chipFG:'#0f172a', chipB:'#00000014' },
    Haze:   { bg:'#fef9c3', fg:'#0f172a', panel:'#ffffffcc', primary:'#f59e0b', tileBG:'#3f3f46', tileFG:'#fafaf9',
              chipBG:'rgba(0,0,0,0.05)', chipFG:'#0f172a', chipB:'#00000014' }
  };
  const c = MAP[main] || { bg:'#fffaf0', fg:'#101113', panel:'#ffffffcc', primary:'#e5e7eb', tileBG:'#2b2b2f', tileFG:'#ffffff',
                            chipBG:'rgba(0,0,0,0.04)', chipFG:'#101113', chipB:'#00000014' };
  const set = (k,v)=>document.documentElement.style.setProperty(k,v);
  set('--bg', c.bg); set('--fg', c.fg); set('--panel', c.panel); set('--primary', c.primary);
  set('--tile-bg', c.tileBG); set('--tile-fg', c.tileFG);
  set('--hour-chip-bg', c.chipBG); set('--hour-chip-fg', c.chipFG); set('--hour-chip-border', c.chipB);
}

// Weather FX on canvas
const canvas = document.getElementById('fx');
const ctx = canvas.getContext('2d');
let fxType = 'None';
let particles = [];
function resizeCanvas(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
const ro = new ResizeObserver(resizeCanvas);
ro.observe(document.querySelector('.container'));
resizeCanvas();

function fxClear(){ particles = []; fxType = 'None'; ctx.clearRect(0,0,canvas.width,canvas.height); }
function fxSnow(){
  fxType = 'Snow';
  particles = Array.from({length: 120}, () => ({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*2+1, v: Math.random()*0.6+0.4 }));
}
function fxRain(){
  fxType = 'Rain';
  particles = Array.from({length: 140}, () => ({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, l: Math.random()*18+12, v: Math.random()*3+3 }));
}
function fxClouds(){
  fxType = 'Clouds';
  particles = Array.from({length: 14}, () => ({ x: Math.random()*canvas.width, y: Math.random()*120 + 40, r: Math.random()*40+30, v: Math.random()*0.3+0.1 }));
}
let flashTimer = 0;
function fxStorm(){
  fxRain();
  fxType = 'Storm';
  flashTimer = 0;
}
function fxFog(){
  fxType = 'Fog';
  particles = Array.from({length: 8}, () => ({ x: Math.random()*canvas.width, y: Math.random()*180 + 60, w: canvas.width*0.6, h: 60, v: Math.random()*0.2+0.05 }));
}
function fxSun(){
  fxType = 'Sun';
}

function fxByWeather(main){
  if (main === 'Snow') fxSnow();
  else if (main === 'Rain' || main === 'Drizzle') fxRain();
  else if (main === 'Thunderstorm') fxStorm();
  else if (main === 'Clouds') fxClouds();
  else if (main === 'Mist' || main === 'Fog' || main === 'Haze') fxFog();
  else if (main === 'Clear') fxSun();
  else fxClear();
}

function animate(){
  requestAnimationFrame(animate);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (fxType === 'Snow'){
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); p.y += p.v; p.x += Math.sin(p.y*0.01)*0.3; if (p.y > canvas.height) { p.y = -5; p.x = Math.random()*canvas.width; } });
  } else if (fxType === 'Rain' || fxType === 'Storm'){
    ctx.strokeStyle = 'rgba(180,200,255,0.7)'; ctx.lineWidth = 1.2;
    particles.forEach(p => { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x+2, p.y+p.l); ctx.stroke(); p.y += p.v*4; p.x += 1.2; if (p.y > canvas.height) { p.y = -20; p.x = Math.random()*canvas.width; } });
    if (fxType === 'Storm'){ // lightning flash
      flashTimer += 1;
      if (Math.random() < 0.01 || flashTimer > 600){
        flashTimer = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
    }
  } else if (fxType === 'Clouds'){
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    particles.forEach(p => { ctx.beginPath(); ctx.ellipse(p.x,p.y,p.r*1.6,p.r,0,0,Math.PI*2); ctx.fill(); p.x += p.v; if (p.x - p.r*1.6 > canvas.width) { p.x = -p.r*3; } });
  } else if (fxType === 'Fog'){
    particles.forEach(p => { const grd = ctx.createLinearGradient(0,p.y,0,p.y+p.h); grd.addColorStop(0,'rgba(240,240,240,0.08)'); grd.addColorStop(1,'rgba(240,240,240,0.18)'); ctx.fillStyle = grd; ctx.fillRect(p.x,p.y,p.w,p.h); p.x += p.v; if (p.x > canvas.width) p.x = -p.w; });
  } else if (fxType === 'Sun'){
    const cx = 140, cy = 100, r = 60;
    const grd = ctx.createRadialGradient(cx,cy,10,cx,cy,r*2);
    const isDark = document.documentElement.classList.contains('dark');
    grd.addColorStop(0, isDark ? 'rgba(255,220,90,0.6)' : 'rgba(255,220,90,0.9)');
    grd.addColorStop(1,'rgba(255,220,90,0.0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx,cy,r*2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(255,200,80,0.45)' : 'rgba(255,200,80,0.65)'; ctx.lineWidth = 3;
    const t = Date.now()*0.001;
    for (let i=0;i<12;i++){ const ang = t + (Math.PI*2/12)*i; const x1 = cx + Math.cos(ang)*r; const y1 = cy + Math.sin(ang)*r; const x2 = cx + Math.cos(ang)*(r+22); const y2 = cy + Math.sin(ang)*(r+22); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
  }
}
animate();

async function load(zip){
  input.value = zip;
  setStatus('Fetching weather…', 'warn'); setHStatus('');
  try {
    const [cur, fc] = await Promise.all([fetchWeatherByZip(zip), fetchForecastByZip(zip)]);
    applyWeather(cur);
    renderHourly(fc);
    setStatus(`Updated for ${zip}`, 'ok');
  } catch (err){
    console.error(err);
    handleError(err);
  }
}

function handleError(err){
  if (err.message === 'NO_KEY'){
    setStatus('Add your OpenWeatherMap key in config.js (window.WEATHER_API_KEY = "...").', 'err');
    setHStatus('');
  } else if (err.httpStatus === 401){
    setStatus('Invalid API key (401). Check config.js or wait for activation.', 'err');
    setHStatus('Hourly: invalid API key (401).', 'err');
  } else if (err.httpStatus === 404){
    setStatus('ZIP not found (404). Try another 5‑digit ZIP.', 'err');
    setHStatus('');
  } else if (err.httpStatus === 429){
    setStatus('Rate limited (429). Please wait and try again.', 'err');
    setHStatus('Hourly: rate limited (429).', 'err');
  } else {
    setStatus('Could not fetch weather. Network or CORS error.', 'err');
    setHStatus('');
  }
  elLoc.textContent = '—'; elTemp.textContent = '—'; elCond.textContent = '—';
  elIcon.removeAttribute('src'); elIcon.alt='';
  hourlyEl.innerHTML = '';
  fxClear();
}

// Form submit
form.addEventListener('submit', e => {
  e.preventDefault();
  const zip = (input.value || '').trim();
  if (!/^\d{5}$/.test(zip)) { input.focus(); setStatus('Please enter a 5‑digit ZIP.', 'err'); return; }
  saveZip(zip);
  load(zip);
});

// Geo button
geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation){ setStatus('Geolocation not supported in this browser.', 'err'); return; }
  setStatus('Locating…', 'warn');
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    try {
      const [cur, fc] = await Promise.all([fetchWeatherByCoords(latitude, longitude), fetchForecastByCoords(latitude, longitude)]);
      applyWeather(cur);
      renderHourly(fc);
      setStatus('Updated for your location', 'ok');
    } catch (err){ console.error(err); handleError(err); }
  }, err => {
    setStatus('Location permission denied.', 'err');
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
});

// Auto refresh
setInterval(() => load(loadZip()), REFRESH_MS);

// Fullscreen
function toggleFullscreen(){
  const root = document.documentElement;
  if (!document.fullscreenElement){ document.documentElement.requestFullscreen?.(); root.classList.add('fullscreen'); fullscreenBtn.textContent = '⛶ Exit full screen'; }
  else { document.exitFullscreen?.(); root.classList.remove('fullscreen'); fullscreenBtn.textContent = '⛶ Full screen'; }
}
fullscreenBtn.addEventListener('click', toggleFullscreen);

// Dark mode toggle
themeBtn.addEventListener('click', () => {
  const root = document.documentElement;
  root.classList.toggle('dark');
  themeBtn.textContent = root.classList.contains('dark') ? '☀️ Light mode' : '🌙 Dark mode';
});

// Boot
const initialZip = loadZip();
load(initialZip);
