/* Weather-Flip JS */
// Expects window.WEATHER_API_KEY from config.js
const STORAGE_KEY = 'weather_flip_zip';
const REFRESH_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_ZIP = '10001'; // NYC as a safe default

// Init Flip Clock
window.setupClock = function(tick){
  function pad(v){ return String(v).padStart(2,'0'); }
  function update(){
    const now = new Date();
    const h = pad(now.getHours());
    const m = pad(now.getMinutes());
    const s = pad(now.getSeconds());
    tick.value = [h, m, s];
    const sr = document.getElementById('sr-time');
    if (sr) sr.textContent = `${h}:${m}:${s}`;
  }
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
const fullscreenBtn = document.getElementById('fullscreenBtn');

function saveZip(zip){
  try { localStorage.setItem(STORAGE_KEY, zip); } catch {}
}
function loadZip(){
  try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_ZIP; } catch { return DEFAULT_ZIP; }
}

async function fetchWeatherByZip(zip){
  if (!window.WEATHER_API_KEY){
    console.warn('Missing WEATHER_API_KEY. Put it in config.js');
    return null;
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

function applyWeather(data){
  if (!data) return;
  const { name, main, weather } = data;
  const w = (weather && weather[0]) || {};
  elLoc.textContent = name || '—';
  elTemp.textContent = main ? Math.round(main.temp) + '°F' : '—';
  elCond.textContent = w.description ? titleCase(w.description) : '—';
  if (w.icon){
    elIcon.src = `https://openweathermap.org/img/wn/${w.icon}@2x.png`;
    elIcon.alt = w.main || '';
  } else {
    elIcon.removeAttribute('src');
    elIcon.alt = '';
  }
  themeByWeather(w.main, main?.temp);
}

function titleCase(str){
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// Optional: theme tweaks per weather
function themeByWeather(main, temp){
  const root = document.documentElement;
  // Basic palette by condition
  const map = {
    Clear: ['#fff8e1', '#0f172a', '#fde68a'],
    Clouds: ['#f3f4f6', '#111827', '#9ca3af'],
    Rain: ['#e5f2ff', '#0f172a', '#93c5fd'],
    Drizzle: ['#e5f2ff', '#0f172a', '#93c5fd'],
    Thunderstorm: ['#e9e7ff', '#0f172a', '#a5b4fc'],
    Snow: ['#f8fafc', '#0f172a', '#cbd5e1'],
    Mist: ['#f1f5f9', '#0f172a', '#cbd5e1'],
    Fog: ['#f1f5f9', '#0f172a', '#cbd5e1'],
    Haze: ['#f8fafc', '#0f172a', '#eab308']
  };
  const chosen = map[main] || ['#ffffff', '#101113', '#e5e7eb'];
  root.style.setProperty('--bg', chosen[0]);
  root.style.setProperty('--fg', chosen[1]);
  root.style.setProperty('--panel', '#ffffffcc'); // keep panels bright
  root.style.setProperty('--primary', chosen[2]);
  root.style.setProperty('--ring', 'rgba(14,165,233,0.35)');
}

// Load & schedule
async function load(zip){
  input.value = zip;
  try {
    const data = await fetchWeatherByZip(zip);
    applyWeather(data);
  } catch (err){
    console.error(err);
    elLoc.textContent = 'ZIP not found';
    elTemp.textContent = '—';
    elCond.textContent = '—';
    elIcon.removeAttribute('src');
    themeByWeather(null, null);
  }
}

// Form
form.addEventListener('submit', e => {
  e.preventDefault();
  const zip = (input.value || '').trim();
  if (!/^\d{5}$/.test(zip)) {
    input.focus();
    return;
  }
  saveZip(zip);
  load(zip);
});

// Auto refresh
setInterval(() => load(loadZip()), REFRESH_MS);

// Fullscreen
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

// Boot
const initialZip = loadZip();
load(initialZip);
