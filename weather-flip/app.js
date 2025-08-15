/* Weather-Flip POP2 — single clock + animations + daily forecast */
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
const elFeels = document.getElementById('feelslike');
const elHum = document.getElementById('humidity');
const elWind = document.getElementById('wind');
const daysWrap = document.getElementById('days');
const form = document.getElementById('zipForm');
const input = document.getElementById('zipInput');
const statusEl = document.getElementById('status');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const geoBtn = document.getElementById('geoBtn');

const setStatus = (msg, cls = '') => { statusEl.className = 'status ' + cls; statusEl.textContent = msg || ''; };
function saveZip(zip){ try { localStorage.setItem(STORAGE_KEY, zip); } catch {} }
function loadZip(){ try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_ZIP; } catch { return DEFAULT_ZIP; } }

/* API helpers */
async function fetchWeatherByZip(zip){
  if (!window.WEATHER_API_KEY) throw new Error('NO_KEY');
  const u1 = `https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const u2 = `https://api.openweathermap.org/data/2.5/forecast?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const [cRes, fRes] = await Promise.all([fetch(u1), fetch(u2)]);
  if (!cRes.ok) throw await buildHttpError(cRes);
  if (!fRes.ok) throw await buildHttpError(fRes);
  return { current: await cRes.json(), forecast: await fRes.json() };
}
async function fetchWeatherByCoords(lat, lon){
  if (!window.WEATHER_API_KEY) throw new Error('NO_KEY');
  const u1 = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const u2 = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const [cRes, fRes] = await Promise.all([fetch(u1), fetch(u2)]);
  if (!cRes.ok) throw await buildHttpError(cRes);
  if (!fRes.ok) throw await buildHttpError(fRes);
  return { current: await cRes.json(), forecast: await fRes.json() };
}
async function buildHttpError(res){ const text = await res.text(); const e = new Error('HTTP_'+res.status); e.httpStatus=res.status; e.body=text; return e; }

/* Apply weather */
function applyWeatherBundle(bundle){
  const data = bundle.current;
  const { name, main, weather, sys, wind, dt, timezone } = data || {};
  const w = (weather && weather[0]) || {};
  elLoc.textContent = name || '—';
  elTemp.textContent = main ? Math.round(main.temp) + '°F' : '—';
  const desc = w.description ? w.description.replace(/\b\w/g, c => c.toUpperCase()) : '—';
  elCond.textContent = desc;
  elFeels.textContent = main ? `Feels like ${Math.round(main.feels_like)}°` : 'Feels like —';
  elHum.textContent = main ? `Humidity ${Math.round(main.humidity)}%` : 'Humidity —';
  elWind.textContent = wind ? `Wind ${Math.round(wind.speed)} mph` : 'Wind —';

  if (w.icon){ elIcon.src = `https://openweathermap.org/img/wn/${w.icon}@2x.png`; elIcon.alt = w.main || ''; }
  else { elIcon.removeAttribute('src'); elIcon.alt=''; }

  const isNight = inferNight(w.icon, sys, dt, timezone);
  themeByWeather(w.main, isNight);
  fxByWeather(w.main, isNight);

  // render days
  renderDaily(bundle.forecast);
}
function inferNight(iconCode, sys, dt, timezone){
  if (iconCode && /n$/.test(iconCode)) return true;
  if (sys && sys.sunrise && sys.sunset && dt){
    const local = dt + (timezone||0);
    return (local < sys.sunrise + (timezone||0)) || (local > sys.sunset + (timezone||0));
  }
  const h = new Date().getHours(); return (h<6||h>=19);
}

/* Daily rendering from 3-hour forecast */
function renderDaily(forecast){
  try{
    daysWrap.innerHTML = '';
    const list = forecast?.list || [];
    if (!list.length) return;

    const tz = forecast.city?.timezone || 0;
    const dayMap = new Map();
    for (const item of list){
      const t = (item.dt + tz) * 1000;
      const d = new Date(t);
      const key = d.getUTCFullYear()+'-'+(d.getUTCMonth()+1)+'-'+d.getUTCDate();
      const entry = dayMap.get(key) || { hi:-Infinity, lo:Infinity, samples:[], target:null };
      entry.hi = Math.max(entry.hi, item.main.temp_max);
      entry.lo = Math.min(entry.lo, item.main.temp_min);
      entry.samples.push(item);
      // pick sample closest to noon local
      const hour = d.getUTCHours();
      const score = Math.abs(12 - hour);
      if (!entry.target || score < entry.target.score){ entry.target = { item, score }; }
      dayMap.set(key, entry);
    }
    // create cards for next 5 distinct days
    const keys = Array.from(dayMap.keys()).slice(0,5);
    keys.forEach((key,i) => {
      const entry = dayMap.get(key);
      const d = new Date(Date.parse(key+' UTC'));
      const dow = d.toLocaleDateString(undefined,{ weekday:'short' });
      const el = document.createElement('div');
      el.className = 'day';
      el.innerHTML = `
        <div class="dow">${dow}</div>
        <img class="ic" alt="" src="https://openweathermap.org/img/wn/${entry.target.item.weather[0].icon}.png"/>
        <div><span class="hi">${Math.round(entry.hi)}°</span> <span class="lo">/ ${Math.round(entry.lo)}°</span></div>
      `;
      daysWrap.appendChild(el);
    });
  }catch(e){ console.error('renderDaily failed', e); }
}

/* Theme + FX */
function themeByWeather(main, night){
  const root = document.documentElement;
  // Keep darker pop theme; adjust primary tint per condition
  const tint = {
    Clear: night ? '#f59e0b' : '#fde68a',
    Clouds: night ? '#9ca3af' : '#c7d2fe',
    Rain: '#93c5fd',
    Drizzle: '#93c5fd',
    Thunderstorm: '#a5b4fc',
    Snow: '#cbd5e1',
    Mist: '#cbd5e1',
    Fog: '#cbd5e1',
    Haze: '#f59e0b',
  }[main] || (night ? '#94a3b8' : '#60a5fa');
  root.style.setProperty('--primary', tint);
  // tile/bg colors fixed in CSS
}

/* Canvas FX */
const canvas = document.getElementById('fx');
const ctx = canvas.getContext('2d');
let fxType = 'None';
let particles = [];
let stars = [];
let lightningTimer = 0;

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
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
    const cx = 160, cy = 120, r=55;
    const grd = ctx.createRadialGradient(cx,cy,10,cx,cy,r*3);
    grd.addColorStop(0,'rgba(255,210,90,0.85)');
    grd.addColorStop(1,'rgba(255,210,90,0.0)');
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
    const cx = 140, cy = 110, r = 34;
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0b0f18'; ctx.beginPath(); ctx.arc(cx+10,cy-6,r,0,Math.PI*2); ctx.fill(); // crescent
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    stars.forEach(s => { ctx.globalAlpha = s.a*(0.7+0.3*Math.sin((Date.now()*0.002)+(s.x+s.y))); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); });
    ctx.globalAlpha = 1;
  } else if (fxType === 'Clouds'){
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    particles.forEach(p => { drawCloud(p.x,p.y,p.w,p.h); p.x += p.v; if (p.x - p.w > canvas.width) p.x = -p.w; });
  } else if (fxType === 'Rain'){
    ctx.strokeStyle = 'rgba(180,200,255,0.7)'; ctx.lineWidth = 1.2;
    particles.forEach(p => { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x+2, p.y+p.l); ctx.stroke();
      p.y += p.v*4; p.x += 1.2; if (p.y > canvas.height) { p.y = -20; p.x = Math.random()*canvas.width; } });
  } else if (fxType === 'Storm'){
    ctx.strokeStyle = 'rgba(180,200,255,0.7)'; ctx.lineWidth = 1.2;
    particles.forEach(p => { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x+2, p.y+p.l); ctx.stroke();
      p.y += p.v*4.6; p.x += 1.3; if (p.y > canvas.height) { p.y = -20; p.x = Math.random()*canvas.width; } });
    lightningTimer--; if (lightningTimer <= 0){ if (Math.random() < 0.02){ ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height); lightningTimer = 30; } }
  } else if (fxType === 'Snow'){
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      p.y += p.v; p.x += Math.sin(p.y*0.01)*0.4; if (p.y > canvas.height) { p.y = -5; p.x = Math.random()*canvas.width; } });
  } else if (fxType === 'Fog'){
    particles.forEach(p => { const y = (p.y + Math.sin((Date.now()+p.off)*0.0003)*10);
      const grd = ctx.createLinearGradient(0,y,0,y+80);
      grd.addColorStop(0,'rgba(255,255,255,0.0)'); grd.addColorStop(0.5,'rgba(255,255,255,0.12)'); grd.addColorStop(1,'rgba(255,255,255,0.0)');
      ctx.fillStyle = grd; ctx.fillRect(0,y-20,canvas.width,80); });
  }
}
function drawCloud(x,y,w,h){
  ctx.beginPath();
  ctx.arc(x+w*0.2,y+h*0.6,h*0.6,Math.PI,Math.PI*2);
  ctx.arc(x+w*0.45,y+h*0.45,h*0.7,Math.PI,Math.PI*2);
  ctx.arc(x+w*0.7,y+h*0.6,h*0.6,Math.PI,Math.PI*2);
  ctx.rect(x,y+h*0.6,w,h*0.4);
  ctx.fill();
}
animate();

/* Load + events */
async function loadFromZip(zip){
  input.value = zip;
  setStatus('Fetching weather…','warn');
  try{
    const bundle = await fetchWeatherByZip(zip);
    applyWeatherBundle(bundle);
    setStatus(`Updated for ${zip}`,'ok');
  }catch(err){ handleError(err); }
}
function handleError(err){
  console.error(err);
  if (err.message === 'NO_KEY') setStatus('Add your OpenWeatherMap key in config.js (window.WEATHER_API_KEY = "...").','err');
  else if (err.httpStatus === 401) setStatus('Invalid API key (401).','err');
  else if (err.httpStatus === 404) setStatus('ZIP not found (404).','err');
  else if (err.httpStatus === 429) setStatus('Rate limited (429).','err');
  else setStatus('Could not fetch weather.','err');
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const zip = (input.value||'').trim();
  if (!/^\d{5}$/.test(zip)){ input.focus(); setStatus('Please enter a 5‑digit ZIP.','err'); return; }
  saveZip(zip); loadFromZip(zip);
});
geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation){ setStatus('Geolocation not supported.','err'); return; }
  setStatus('Locating…','warn');
  navigator.geolocation.getCurrentPosition(async pos => {
    try{ const bundle = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude); applyWeatherBundle(bundle); setStatus('Updated for your location','ok'); }
    catch(err){ handleError(err); }
  }, err => setStatus('Location permission denied.','err'), { enableHighAccuracy:false, timeout:8000, maximumAge:60000 });
});
setInterval(() => loadFromZip(loadZip()), REFRESH_MS);

/* Fullscreen */
function toggleFullscreen(){
  const root = document.documentElement;
  if (!document.fullscreenElement){ document.documentElement.requestFullscreen?.(); root.classList.add('fullscreen'); fullscreenBtn.textContent = '⛶ Exit full screen'; }
  else { document.exitFullscreen?.(); root.classList.remove('fullscreen'); fullscreenBtn.textContent = '⛶ Full screen'; }
}
fullscreenBtn.addEventListener('click', toggleFullscreen);

/* Boot */
loadFromZip(loadZip());
