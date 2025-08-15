/* Weather-Flip Pop JS */
const STORAGE_KEY = 'weather_flip_zip';
const REFRESH_MS = 10 * 60 * 1000;
const DEFAULT_ZIP = '10001';

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
const elFeels = document.getElementById('feels');
const elWind = document.getElementById('wind');
const elHum = document.getElementById('hum');
const fcRow = document.getElementById('forecastRow');
const form = document.getElementById('zipForm');
const input = document.getElementById('zipInput');
const statusEl = document.getElementById('status');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const geoBtn = document.getElementById('geoBtn');

const setStatus = (msg, cls = '') => { statusEl.className = 'status ' + cls; statusEl.textContent = msg || ''; };
function saveZip(zip){ try { localStorage.setItem(STORAGE_KEY, zip); } catch {} }
function loadZip(){ try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_ZIP; } catch { return DEFAULT_ZIP; } }

/* API */
async function fetchWeatherByZip(zip){
  if (!window.WEATHER_API_KEY) throw new Error('NO_KEY');
  const url = `https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) throw await buildHttpError(res);
  return res.json();
}
async function fetchForecastByZip(zip){
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
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) throw await buildHttpError(res);
  return res.json();
}
async function buildHttpError(res){
  const text = await res.text();
  const err = new Error('HTTP_' + res.status); err.httpStatus = res.status; err.body = text; return err;
}

/* Apply current weather */
function applyWeather(data){
  const { name, main, weather, wind, sys, dt, timezone } = data || {};
  const w = (weather && weather[0]) || {};
  elLoc.textContent = name || '—';
  elTemp.textContent = main ? Math.round(main.temp) + '°F' : '—';
  elCond.textContent = w.description ? w.description.replace(/\b\w/g, c => c.toUpperCase()) : '—';
  elFeels.textContent = main && typeof main.feels_like === 'number' ? `Feels like ${Math.round(main.feels_like)}°F` : 'Feels like —';
  elWind.textContent = wind ? `Wind ${Math.round(wind.speed)} mph` : 'Wind —';
  elHum.textContent = main ? `Humidity ${main.humidity}%` : 'Humidity —';

  const isNight = inferNight(w.icon, sys, dt, timezone);
  elIcon.innerHTML = svgFor(w.main, isNight);

  themeByWeather(w.main, isNight);
  fxByWeather(w.main, isNight);
}

function inferNight(iconCode, sys, dt, timezone){
  if (iconCode && /n$/.test(iconCode)) return true;
  if (sys && sys.sunrise && sys.sunset && dt){
    const local = dt + (timezone || 0);
    return (local < sys.sunrise + (timezone||0)) || (local > sys.sunset + (timezone||0));
  }
  const h = new Date().getHours(); return (h < 6 || h >= 19);
}

/* SVG icon set */
function svgFor(main, night){
  switch(main){
    case 'Clear': return night ? moonSVG() : sunSVG();
    case 'Clouds': return cloudSVG();
    case 'Rain':
    case 'Drizzle': return rainSVG();
    case 'Snow': return snowSVG();
    case 'Thunderstorm': return stormSVG();
    case 'Mist':
    case 'Fog':
    case 'Haze': return fogSVG();
    default: return cloudSVG();
  }
}
function sunSVG(){ return `<svg viewBox="0 0 64 64" class="fc-icon" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="12" fill="#fbbf24"/><g class="ray" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" fill="none">
  ${Array.from({length:8}).map((_,i)=>{const a=i*Math.PI/4,x1=32+Math.cos(a)*18,y1=32+Math.sin(a)*18,x2=32+Math.cos(a)*26,y2=32+Math.sin(a)*26;return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;}).join('')}
  </g></svg>`; }
function moonSVG(){ return `<svg viewBox="0 0 64 64" class="fc-icon" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="26" r="16" fill="#f1f5f9"/><circle cx="42" cy="22" r="16" fill="#0b0c10"/>
  ${[...Array(10)].map(()=>`<circle cx="${(Math.random()*60+2).toFixed(0)}" cy="${(Math.random()*30+2).toFixed(0)}" r="${(Math.random()*1.6+0.4).toFixed(1)}" fill="#fff" opacity="0.9"/>`).join('')}
</svg>`; }
function cloudSVG(){ return `<svg viewBox="0 0 64 64" class="fc-icon" xmlns="http://www.w3.org/2000/svg">
  <g class="cloud" fill="#cbd5e1"><ellipse cx="28" cy="34" rx="16" ry="10"/><ellipse cx="40" cy="32" rx="14" ry="9"/><ellipse cx="20" cy="32" rx="12" ry="8"/></g>
</svg>`; }
function rainSVG(){ return `<svg viewBox="0 0 64 64" class="fc-icon" xmlns="http://www.w3.org/2000/svg">
  <g class="cloud" fill="#cbd5e1"><ellipse cx="28" cy="28" rx="16" ry="10"/><ellipse cx="40" cy="26" rx="14" ry="9"/><ellipse cx="20" cy="26" rx="12" ry="8"/></g>
  <g stroke="#60a5fa" stroke-width="3" class="drop"><line x1="22" y1="44" x2="18" y2="54"/><line x1="34" y1="44" x2="30" y2="54"/><line x1="46" y1="44" x2="42" y2="54"/></g>
</svg>`; }
function snowSVG(){ return `<svg viewBox="0 0 64 64" class="fc-icon" xmlns="http://www.w3.org/2000/svg">
  <g class="cloud" fill="#cbd5e1"><ellipse cx="28" cy="28" rx="16" ry="10"/><ellipse cx="40" cy="26" rx="14" ry="9"/><ellipse cx="20" cy="26" rx="12" ry="8"/></g>
  <g fill="#e5e7eb"><circle class="flake" cx="24" cy="48" r="2"/><circle class="flake" cx="34" cy="52" r="2"/><circle class="flake" cx="44" cy="48" r="2"/></g>
</svg>`; }
function fogSVG(){ return `<svg viewBox="0 0 64 64" class="fc-icon" xmlns="http://www.w3.org/2000/svg">
  <g class="cloud" fill="#cbd5e1"><ellipse cx="28" cy="28" rx="16" ry="10"/><ellipse cx="40" cy="26" rx="14" ry="9"/><ellipse cx="20" cy="26" rx="12" ry="8"/></g>
  <g stroke="#94a3b8" stroke-width="3" stroke-linecap="round" opacity=".9"><line x1="14" y1="46" x2="50" y2="46"/><line x1="10" y1="52" x2="46" y2="52"/></g>
</svg>`; }
function stormSVG(){ return `<svg viewBox="0 0 64 64" class="fc-icon" xmlns="http://www.w3.org/2000/svg">
  <g class="cloud" fill="#cbd5e1"><ellipse cx="28" cy="26" rx="16" ry="10"/><ellipse cx="40" cy="24" rx="14" ry="9"/><ellipse cx="20" cy="24" rx="12" ry="8"/></g>
  <polygon points="30,38 24,52 34,44 30,58 44,40 36,40" fill="#fbbf24"/>
</svg>`; }

/* Theming */
function themeByWeather(main, night){
  const root = document.documentElement;
  const DAY = {
    Clear:  ['#f6f8ff','#0b0c10','#ffffffcc','#8bb4ff','#1b1e27','#f8fafc','#eef2ff','#1f2937'],
    Clouds: ['#eef2ff','#0b0c10','#ffffffcc','#c7d2fe','#374151','#e5e7eb','#e5e7ff','#1f2937'],
    Rain:   ['#e8f1ff','#0b0c10','#ffffffcc','#93c5fd','#1f2937','#ecfeff','#e0f2fe','#0b0c10'],
    Drizzle:['#e8f1ff','#0b0c10','#ffffffcc','#93c5fd','#1f2937','#ecfeff','#e0f2fe','#0b0c10'],
    Thunderstorm:['#ecebff','#0b0c10','#ffffffcc','#a5b4fc','#111827','#e5e7eb','#ede9fe','#0b0c10'],
    Snow:   ['#f7fbff','#0b0c10','#ffffffcc','#cbd5e1','#334155','#f8fafc','#f1f5f9','#0b0c10'],
    Mist:   ['#f1f5f9','#0b0c10','#ffffffcc','#cbd5e1','#475569','#e5e7eb','#e5e7eb','#0b0c10'],
    Fog:    ['#f1f5f9','#0b0c10','#ffffffcc','#cbd5e1','#475569','#e5e7eb','#e5e7eb','#0b0c10'],
    Haze:   ['#fff8e1','#0b0c10','#ffffffcc','#f59e0b','#3f3f46','#fafaf9','#fde68a','#0b0c10']
  };
  const NIGHT = {
    Clear:  ['#0b1020','#e5e7eb','#11131a','#f59e0b','#1b1e27','#e5e7eb','#1f2433','#e5e7eb'],
    Clouds: ['#0f1424','#e5e7eb','#11131a','#9ca3af','#232838','#e5e7eb','#1c2336','#e5e7eb'],
    Rain:   ['#0d1220','#e5e7eb','#11131a','#60a5fa','#1b2234','#dbeafe','#1a2132','#e5e7eb'],
    Drizzle:['#0d1220','#e5e7eb','#11131a','#60a5fa','#1b2234','#dbeafe','#1a2132','#e5e7eb'],
    Thunderstorm:['#0a0e1a','#e5e7eb','#11131a','#818cf8','#141827','#e5e7eb','#161a26','#e5e7eb'],
    Snow:   ['#0b1220','#e5e7eb','#11131a','#cbd5e1','#1f2a3a','#e5e7eb','#162033','#e5e7eb'],
    Mist:   ['#0c1120','#e5e7eb','#11131a','#94a3b8','#1c2433','#e5e7eb','#1a2232','#e5e7eb'],
    Fog:    ['#0c1120','#e5e7eb','#11131a','#94a3b8','#1c2433','#e5e7eb','#1a2232','#e5e7eb'],
    Haze:   ['#1a1720','#e5e7eb','#11131a','#f59e0b','#22212a','#e5e7eb','#241f2b','#e5e7eb']
  };
  const map = night ? NIGHT : DAY;
  const c = map[main] || (night ? NIGHT.Clear : DAY.Clear);
  root.style.setProperty('--bg', c[0]); root.style.setProperty('--fg', c[1]); root.style.setProperty('--panel', c[2]); root.style.setProperty('--primary', c[3]);
  root.style.setProperty('--tile-bg', c[4]); root.style.setProperty('--tile-fg', c[5]); root.style.setProperty('--chip', c[6]); root.style.setProperty('--chip-fg', c[7]);
}

/* Canvas FX */
const canvas = document.getElementById('fx'); const ctx = canvas.getContext('2d');
let fxType='None', particles=[], stars=[], lightningTimer=0;
function resizeCanvas(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
const ro = new ResizeObserver(resizeCanvas); ro.observe(document.querySelector('.container')); resizeCanvas();

function fxClear(){ fxType='None'; particles=[]; stars=[]; lightningTimer=0; ctx.clearRect(0,0,canvas.width,canvas.height); }
function fxSun(){ fxType='Sun'; particles=[]; stars=[]; lightningTimer=0; }
function fxMoon(){ fxType='Moon'; particles=[]; stars = Array.from({length: 80}, () => ({x:Math.random()*canvas.width,y:Math.random()*canvas.height*0.6,a:Math.random()*0.6+0.2,r:Math.random()*1.4+0.6})); lightningTimer=0; }
function fxClouds(){ fxType='Clouds'; particles = Array.from({length: 12}, () => ({x:Math.random()*canvas.width,y:Math.random()*180+20,w:80+Math.random()*120,h:28+Math.random()*22,v:0.2+Math.random()*0.3})); stars=[]; lightningTimer=0; }
function fxRain(){ fxType='Rain'; particles = Array.from({length: 160}, () => ({x:Math.random()*canvas.width,y:Math.random()*canvas.height,l:12+Math.random()*18,v:3+Math.random()*3})); stars=[]; lightningTimer=0; }
function fxStorm(){ fxType='Storm'; fxRain(); lightningTimer=0; }
function fxSnow(){ fxType='Snow'; particles = Array.from({length: 140}, () => ({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:1+Math.random()*2,v:0.4+Math.random()*0.6})); stars=[]; lightningTimer=0; }
function fxFog(){ fxType='Fog'; particles = Array.from({length: 6}, (_,i)=>({ y: 40+i*60, off: Math.random()*1000 })); stars=[]; lightningTimer=0; }

function fxByWeather(main, night){
  if (night){ if (main==='Rain'||main==='Drizzle') fxRain(); else if (main==='Thunderstorm') fxStorm(); else if (main==='Snow') fxSnow(); else if (['Mist','Fog','Haze'].includes(main)) fxFog(); else if (main==='Clouds') fxClouds(); else fxMoon(); return; }
  if (main==='Rain'||main==='Drizzle') fxRain(); else if (main==='Thunderstorm') fxStorm(); else if (main==='Snow') fxSnow(); else if (['Mist','Fog','Haze'].includes(main)) fxFog(); else if (main==='Clouds') fxClouds(); else fxSun();
}

function animate(){
  requestAnimationFrame(animate);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (fxType==='Sun'){
    const cx = 140, cy = 90, r=55; const grd = ctx.createRadialGradient(cx,cy,10,cx,cy,r*3);
    grd.addColorStop(0,'rgba(255,210,80,0.9)'); grd.addColorStop(1,'rgba(255,210,80,0.0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx,cy,r*3,0,Math.PI*2); ctx.fill();
  } else if (fxType==='Moon'){
    const cx=140, cy=90, r=34; ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--bg'); ctx.beginPath(); ctx.arc(cx+10,cy-6,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.9)'; stars.forEach(s=>{ ctx.globalAlpha=s.a*(0.7+0.3*Math.sin((Date.now()*0.002)+(s.x+s.y))); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); }); ctx.globalAlpha=1;
  } else if (fxType==='Clouds'){
    ctx.fillStyle='rgba(255,255,255,0.85)'; particles.forEach(p=>{ drawCloud(p.x,p.y,p.w,p.h); p.x+=p.v; if (p.x - p.w > canvas.width) p.x=-p.w; });
  } else if (fxType==='Rain'){
    ctx.strokeStyle='rgba(180,200,255,0.7)'; ctx.lineWidth=1.2; particles.forEach(p=>{ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+2,p.y+p.l); ctx.stroke(); p.y+=p.v*4; p.x+=1.2; if (p.y>canvas.height){ p.y=-20; p.x=Math.random()*canvas.width;} });
  } else if (fxType==='Storm'){
    ctx.strokeStyle='rgba(180,200,255,0.7)'; ctx.lineWidth=1.2; particles.forEach(p=>{ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+2,p.y+p.l); ctx.stroke(); p.y+=p.v*4.6; p.x+=1.3; if (p.y>canvas.height){ p.y=-20; p.x=Math.random()*canvas.width;} });
    if (Math.random()<0.03){ ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
  } else if (fxType==='Snow'){
    ctx.fillStyle='rgba(255,255,255,0.9)'; particles.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); p.y+=p.v; p.x+=Math.sin(p.y*0.01)*0.4; if (p.y>canvas.height){ p.y=-5; p.x=Math.random()*canvas.width;} });
  } else if (fxType==='Fog'){
    particles.forEach(p=>{ const y=(p.y+Math.sin((Date.now()+p.off)*0.0003)*10); const grd=ctx.createLinearGradient(0,y,0,y+80); grd.addColorStop(0,'rgba(255,255,255,0.0)'); grd.addColorStop(0.5,'rgba(255,255,255,0.15)'); grd.addColorStop(1,'rgba(255,255,255,0.0)'); ctx.fillStyle=grd; ctx.fillRect(0,y-20,canvas.width,80); });
  }
}
function drawCloud(x,y,w,h){ ctx.beginPath(); ctx.arc(x+w*0.2,y+h*0.6,h*0.6,Math.PI,Math.PI*2); ctx.arc(x+w*0.45,y+h*0.45,h*0.7,Math.PI,Math.PI*2); ctx.arc(x+w*0.7,y+h*0.6,h*0.6,Math.PI,Math.PI*2); ctx.rect(x,y+h*0.6,w,h*0.4); ctx.fill(); }
animate();

/* Forecast (daily from 3h feed) */
function renderForecast(json){
  try{
    const tz = json.city?.timezone || 0;
    const groups = {};
    for(const it of json.list){
      const local = (it.dt + tz);
      const d = new Date(local*1000);
      const key = d.getUTCFullYear()+'-'+(d.getUTCMonth()+1)+'-'+d.getUTCDate();
      groups[key] = groups[key] || [];
      groups[key].push(it);
    }
    const days = Object.keys(groups).sort((a,b)=> new Date(a)-new Date(b)).slice(0,5);
    fcRow.innerHTML = days.map((day)=>{
      const arr = groups[day];
      const hi = Math.round(Math.max(...arr.map(x=>x.main.temp_max)));
      const lo = Math.round(Math.min(...arr.map(x=>x.main.temp_min)));
      const noon = arr.reduce((best,x)=> Math.abs(((x.dt+tz)%86400)-43200) < Math.abs(((best.dt+tz)%86400)-43200)? x : best, arr[0]);
      const ddate = new Date((arr[0].dt+tz)*1000);
      const wd = ddate.toLocaleDateString(undefined,{ weekday:'short'});
      const icon = svgFor(noon.weather[0].main, /n$/.test(noon.weather[0].icon));
      return `<div class="fc-card"><div class="fc-day">${wd}</div><div class="fc-icon">${icon}</div><div class="fc-temp"><span class="fc-hi">${hi}°</span><span class="fc-lo">${lo}°</span></div></div>`;
    }).join('');
  } catch(e){ console.error(e); fcRow.innerHTML = ''; }
}

/* Load sequences */
async function loadAllByZip(zip){
  input.value = zip;
  setStatus('Fetching weather…','warn');
  try{
    const [now, fc] = await Promise.all([fetchWeatherByZip(zip), fetchForecastByZip(zip)]);
    applyWeather(now); renderForecast(fc); setStatus(`Updated for ${zip}`,'ok');
  }catch(err){ handleError(err); fcRow.innerHTML=''; }
}
async function loadAllByCoords(lat, lon){
  setStatus('Fetching weather…','warn');
  try{
    const [now, fc] = await Promise.all([fetchWeatherByCoords(lat,lon), fetchForecastByCoords(lat,lon)]);
    applyWeather(now); renderForecast(fc); setStatus('Updated for your location','ok');
  }catch(err){ handleError(err); fcRow.innerHTML=''; }
}

function handleError(err){
  console.error(err);
  if (err.message === 'NO_KEY'){ setStatus('Add your OpenWeatherMap key in config.js.','err'); }
  else if (err.httpStatus === 401){ setStatus('Invalid API key (401).','err'); }
  else if (err.httpStatus === 404){ setStatus('ZIP not found (404).','err'); }
  else if (err.httpStatus === 429){ setStatus('Rate limited (429).','err'); }
  else { setStatus('Could not fetch weather.','err'); }
}

/* Events */
form.addEventListener('submit', e => {
  e.preventDefault();
  const zip = (input.value || '').trim();
  if (!/^\d{5}$/.test(zip)) { input.focus(); setStatus('Please enter a 5‑digit ZIP.','err'); return; }
  saveZip(zip); loadAllByZip(zip);
});

geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation){ setStatus('Geolocation not supported.','err'); return; }
  setStatus('Locating…','warn');
  navigator.geolocation.getCurrentPosition(pos => loadAllByCoords(pos.coords.latitude, pos.coords.longitude),
    err => setStatus('Location permission denied.','err'),
    { enableHighAccuracy:false, timeout:8000, maximumAge:60000 });
});

/* Auto refresh */
setInterval(() => loadAllByZip(loadZip()), REFRESH_MS);

/* Fullscreen */
function toggleFullscreen(){
  const root = document.documentElement;
  if (!document.fullscreenElement){ document.documentElement.requestFullscreen?.(); root.classList.add('fullscreen'); fullscreenBtn.textContent='⛶ Exit full screen'; }
  else { document.exitFullscreen?.(); root.classList.remove('fullscreen'); fullscreenBtn.textContent='⛶ Full screen'; }
}
fullscreenBtn.addEventListener('click', toggleFullscreen);

/* Boot */
loadAllByZip(loadZip());
