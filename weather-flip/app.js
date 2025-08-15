/* Weather-Flip Cleaned JS (current weather + animations, no hourly/daily/dark mode) */
const STORAGE_KEY = 'weather_flip_zip';
const REFRESH_MS = 10 * 60 * 1000;
const DEFAULT_ZIP = '10001'; // NYC

/* Flip clock */
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

/* DOM */
const elLoc = document.getElementById('location');
const elTemp = document.getElementById('temp');
const elCond = document.getElementById('condition');
const elIcon = document.getElementById('icon');
const form = document.getElementById('zipForm');
const input = document.getElementById('zipInput');
const statusEl = document.getElementById('status');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const geoBtn = document.getElementById('geoBtn');

const setStatus = (msg, cls = '') => {
  statusEl.className = 'status ' + cls;
  statusEl.textContent = msg || '';
};

function saveZip(zip){ try { localStorage.setItem(STORAGE_KEY, zip); } catch {} }
function loadZip(){ try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_ZIP; } catch { return DEFAULT_ZIP; } }

/* API helpers */
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
  const err = new Error('HTTP_' + res.status);
  err.httpStatus = res.status;
  err.body = text;
  return err;
}

/* Apply weather */
function applyWeather(data){
  const { name, main, weather, sys, dt, timezone } = data || {};
  const w = (weather && weather[0]) || {};
  elLoc.textContent = name || '—';
  elTemp.textContent = main ? Math.round(main.temp) + '°F' : '—';
  const desc = w.description ? w.description.replace(/\b\w/g, c => c.toUpperCase()) : '—';
  elCond.textContent = desc;

  if (w.icon){
    elIcon.src = `https://openweathermap.org/img/wn/${w.icon}@2x.png`;
    elIcon.alt = w.main || '';
  } else {
    elIcon.removeAttribute('src'); elIcon.alt='';
  }

  const isNight = inferNight(w.icon, sys, dt, timezone);
  themeByWeather(w.main, isNight);
  fxByWeather(w.main, isNight);
}

function inferNight(iconCode, sys, dt, timezone){
  if (iconCode && /n$/.test(iconCode)) return true; // icon like 10n
  if (sys && sys.sunrise && sys.sunset && dt){
    const local = dt + (timezone || 0);
    return (local < sys.sunrise + (timezone||0)) || (local > sys.sunset + (timezone||0));
  }
  const h = new Date().getHours();
  return (h < 6 || h >= 19);
}

/* Theming */
function themeByWeather(main, night){
  const root = document.documentElement;
  const DAY = {
    Clear:  ['#fff8e1','#111827','#ffffffcc','#fde68a','#2b2b2f','#ffffff'],
    Clouds: ['#f3f4f6','#111827','#ffffffcc','#c7d2fe','#374151','#e5e7eb'],
    Rain:   ['#e5f2ff','#0f172a','#ffffffcc','#93c5fd','#1f2937','#ecfeff'],
    Drizzle:['#e5f2ff','#0f172a','#ffffffcc','#93c5fd','#1f2937','#ecfeff'],
    Thunderstorm:['#e9e7ff','#0f172a','#ffffffcc','#a5b4fc','#111827','#e5e7eb'],
    Snow:   ['#f8fafc','#0f172a','#ffffffcc','#cbd5e1','#334155','#f8fafc'],
    Mist:   ['#f1f5f9','#0f172a','#ffffffcc','#cbd5e1','#475569','#e5e7eb'],
    Fog:    ['#f1f5f9','#0f172a','#ffffffcc','#cbd5e1','#475569','#e5e7eb'],
    Haze:   ['#fef9c3','#0f172a','#ffffffcc','#f59e0b','#3f3f46','#fafaf9']
  };
  const NIGHT = {
    Clear:  ['#0b1020','#e5e7eb','#11131a','#f59e0b','#1b1e27','#e5e7eb'],
    Clouds: ['#0f1424','#e5e7eb','#11131a','#9ca3af','#232838','#e5e7eb'],
    Rain:   ['#0d1220','#e5e7eb','#11131a','#60a5fa','#1b2234','#dbeafe'],
    Drizzle:['#0d1220','#e5e7eb','#11131a','#60a5fa','#1b2234','#dbeafe'],
    Thunderstorm:['#0a0e1a','#e5e7eb','#11131a','#818cf8','#141827','#e5e7eb'],
    Snow:   ['#0b1220','#e5e7eb','#11131a','#cbd5e1','#1f2a3a','#e5e7eb'],
    Mist:   ['#0c1120','#e5e7eb','#11131a','#94a3b8','#1c2433','#e5e7eb'],
    Fog:    ['#0c1120','#e5e7eb','#11131a','#94a3b8','#1c2433','#e5e7eb'],
    Haze:   ['#1a1720','#e5e7eb','#11131a','#f59e0b','#22212a','#e5e7eb']
  };
  const map = night ? NIGHT : DAY;
  const c = map[main] || (night ? NIGHT.Clear : DAY.Clear);
  root.style.setProperty('--bg', c[0]);
  root.style.setProperty('--fg', c[1]);
  root.style.setProperty('--panel', c[2]);
  root.style.setProperty('--primary', c[3]);
  root.style.setProperty('--tile-bg', c[4]);
  root.style.setProperty('--tile-fg', c[5]);
}

/* Canvas FX */
const canvas = document.getElementById('fx');
const ctx = canvas.getContext('2d');
let fxType = 'None';
let particles = [];
let stars = [];
let lightningTimer = 0;

function resizeCanvas(){
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
const ro = new ResizeObserver(resizeCanvas);
ro.observe(document.querySelector('.container'));
resizeCanvas();

function fxClear(){ fxType='None'; particles=[]; stars=[]; lightningTimer=0; ctx.clearRect(0,0,canvas.width,canvas.height); }
function fxSun(){ fxType='Sun'; particles=[]; stars=[]; lightningTimer=0; }
function fxMoon(){ fxType='Moon'; particles=[]; stars = Array.from({length: 80}, () => ({
  x: Math.random()*canvas.width, y: Math.random()*canvas.height*0.6, a: Math.random()*0.6+0.2, r: Math.random()*1.4+0.6
})); lightningTimer=0; }
function fxClouds(){ fxType='Clouds'; particles = Array.from({length: 12}, () => ({
  x: Math.random()*canvas.width, y: Math.random()*180+20, w: 80+Math.random()*120, h: 28+Math.random()*22, v: 0.2+Math.random()*0.3
})); stars=[]; lightningTimer=0; }
function fxRain(){ fxType='Rain'; particles = Array.from({length: 160}, () => ({
  x: Math.random()*canvas.width, y: Math.random()*canvas.height, l: 12+Math.random()*18, v: 3+Math.random()*3
})); stars=[]; lightningTimer=0; }
function fxStorm(){ fxType='Storm'; fxRain(); lightningTimer = 0; } // same drops + flashes
function fxSnow(){ fxType='Snow'; particles = Array.from({length: 140}, () => ({
  x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: 1+Math.random()*2, v: 0.4+Math.random()*0.6
})); stars=[]; lightningTimer=0; }
function fxFog(){ fxType='Fog'; particles = Array.from({length: 6}, (_,i)=>({ y: 40+i*60, off: Math.random()*1000 })); stars=[]; lightningTimer=0; }

function fxByWeather(main, night){
  if (night) {
    if (main === 'Rain' || main === 'Drizzle') fxRain();
    else if (main === 'Thunderstorm') fxStorm();
    else if (main === 'Snow') fxSnow();
    else if (main === 'Mist' || main === 'Fog' || main === 'Haze') fxFog();
    else if (main === 'Clouds') fxClouds();
    else fxMoon();
    return;
  }
  if (main === 'Rain' || main === 'Drizzle') fxRain();
  else if (main === 'Thunderstorm') fxStorm();
  else if (main === 'Snow') fxSnow();
  else if (main === 'Mist' || main === 'Fog' || main === 'Haze') fxFog();
  else if (main === 'Clouds') fxClouds();
  else fxSun();
}

function animate(){
  requestAnimationFrame(animate);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (fxType === 'Sun'){
    const cx = 160, cy = 90, r=55;
    const grd = ctx.createRadialGradient(cx,cy,10,cx,cy,r*3);
    grd.addColorStop(0,'rgba(255,210,80,0.9)');
    grd.addColorStop(1,'rgba(255,210,80,0.0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx,cy,r*3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,80,0.55)'; ctx.lineWidth = 3;
    const t = Date.now()*0.001;
    for (let i=0;i<12;i++){
      const ang = t + (Math.PI*2/12)*i;
      const x1 = cx + Math.cos(ang)*r;
      const y1 = cy + Math.sin(ang)*r;
      const x2 = cx + Math.cos(ang)*(r+22);
      const y2 = cy + Math.sin(ang)*(r+22);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }
  } else if (fxType === 'Moon'){
    const cx = 140, cy = 90, r = 34;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg');
    ctx.beginPath(); ctx.arc(cx+10,cy-6,r,0,Math.PI*2); ctx.fill(); // crescent
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    stars.forEach(s => { ctx.globalAlpha = s.a*(0.7+0.3*Math.sin((Date.now()*0.002)+(s.x+s.y))); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); });
    ctx.globalAlpha = 1;
  } else if (fxType === 'Clouds'){
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    particles.forEach(p => {
      drawCloud(p.x,p.y,p.w,p.h);
      p.x += p.v; if (p.x - p.w > canvas.width) p.x = -p.w;
    });
  } else if (fxType === 'Rain'){
    ctx.strokeStyle = 'rgba(180,200,255,0.7)'; ctx.lineWidth = 1.2;
    particles.forEach(p => {
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x+2, p.y+p.l); ctx.stroke();
      p.y += p.v*4; p.x += 1.2; if (p.y > canvas.height) { p.y = -20; p.x = Math.random()*canvas.width; }
    });
  } else if (fxType === 'Storm'){
    ctx.strokeStyle = 'rgba(180,200,255,0.7)'; ctx.lineWidth = 1.2;
    particles.forEach(p => {
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x+2, p.y+p.l); ctx.stroke();
      p.y += p.v*4.6; p.x += 1.3; if (p.y > canvas.height) { p.y = -20; p.x = Math.random()*canvas.width; }
    });
    lightningTimer--;
    if (lightningTimer <= 0){
      if (Math.random() < 0.02){
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
        lightningTimer = 30;
      }
    }
  } else if (fxType === 'Snow'){
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      p.y += p.v; p.x += Math.sin(p.y*0.01)*0.4;
      if (p.y > canvas.height) { p.y = -5; p.x = Math.random()*canvas.width; }
    });
  } else if (fxType === 'Fog'){
    particles.forEach((p,i) => {
      const y = (p.y + Math.sin((Date.now()+p.off)*0.0003)*10);
      const grd = ctx.createLinearGradient(0,y,0,y+80);
      grd.addColorStop(0,'rgba(255,255,255,0.0)');
      grd.addColorStop(0.5,'rgba(255,255,255,0.15)');
      grd.addColorStop(1,'rgba(255,255,255,0.0)');
      ctx.fillStyle = grd; ctx.fillRect(0,y-20,canvas.width,80);
    });
  }
}
function drawCloud(x,y,w,h){
  ctx.beginPath();
  ctx.arc(x+w*0.2,y+h*0.6,h*0.6,Math.PI*1,Math.PI*2);
  ctx.arc(x+w*0.45,y+h*0.45,h*0.7,Math.PI*1,Math.PI*2);
  ctx.arc(x+w*0.7,y+h*0.6,h*0.6,Math.PI*1,Math.PI*2);
  ctx.rect(x,y+h*0.6,w,h*0.4);
  ctx.fill();
}
animate();

/* Main load */
async function load(zip){
  input.value = zip;
  setStatus('Fetching weather…','warn');
  try {
    const data = await fetchWeatherByZip(zip);
    applyWeather(data);
    setStatus(`Updated for ${zip}`,'ok');
  } catch (err){
    handleError(err);
  }
}
function handleError(err){
  console.error(err);
  if (err.message === 'NO_KEY'){
    setStatus('Add your OpenWeatherMap key in config.js (window.WEATHER_API_KEY = "...").','err');
  } else if (err.httpStatus === 401){
    setStatus('Invalid API key (401). Check config.js or wait for activation.','err');
  } else if (err.httpStatus === 404){
    setStatus('ZIP not found (404). Try another 5‑digit ZIP.','err');
  } else if (err.httpStatus === 429){
    setStatus('Rate limited (429). Please wait and try again.','err');
  } else {
    setStatus('Could not fetch weather. Network or CORS error.','err');
  }
  elLoc.textContent = '—'; elTemp.textContent = '—'; elCond.textContent = '—';
  elIcon.removeAttribute('src'); elIcon.alt='';
  fxClear();
}

/* Events */
form.addEventListener('submit', e => {
  e.preventDefault();
  const zip = (input.value || '').trim();
  if (!/^\d{5}$/.test(zip)) { input.focus(); setStatus('Please enter a 5‑digit ZIP.','err'); return; }
  saveZip(zip);
  load(zip);
});

geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation){ setStatus('Geolocation not supported.','err'); return; }
  setStatus('Locating…','warn');
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const data = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      applyWeather(data);
      setStatus('Updated for your location','ok');
    } catch (err){ handleError(err); }
  }, err => setStatus('Location permission denied.','err'), { enableHighAccuracy:false, timeout:8000, maximumAge:60000 });
});

/* Auto refresh */
setInterval(() => load(loadZip()), REFRESH_MS);

/* Fullscreen */
function toggleFullscreen(){
  const root = document.documentElement;
  if (!document.fullscreenElement){
    document.documentElement.requestFullscreen?.();
    root.classList.add('fullscreen');
    fullscreenBtn.textContent = '⛶ Exit full screen';
  } else {
    document.exitFullscreen?.();
    root.classList.remove('fullscreen');
    fullscreenBtn.textContent = '⛶ Full screen';
  }
}
fullscreenBtn.addEventListener('click', toggleFullscreen);

/* Boot */
const initialZip = loadZip();
load(initialZip);
