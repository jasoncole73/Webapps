/* Weather-Flip JS (ready build with visible status/errors) */
const STORAGE_KEY = 'weather_flip_zip';
const REFRESH_MS = 10 * 60 * 1000;
const DEFAULT_ZIP = '10001'; // default NYC

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

const setStatus = (msg, cls = '') => {
  statusEl.className = 'status ' + cls;
  statusEl.textContent = msg || '';
};

function saveZip(zip){ try { localStorage.setItem(STORAGE_KEY, zip); } catch {} }
function loadZip(){ try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_ZIP; } catch { return DEFAULT_ZIP; } }

async function fetchWeatherByZip(zip){
  if (!window.WEATHER_API_KEY){
    throw new Error('NO_KEY');
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`;
  const res = await fetch(url);
  if (!res.ok){
    const text = await res.text();
    const code = res.status;
    const err = new Error('HTTP_' + code);
    err.httpStatus = code;
    err.body = text;
    throw err;
  }
  return res.json();
}

function applyWeather(data){
  const { name, main, weather } = data || {};
  const w = (weather && weather[0]) || {};
  elLoc.textContent = name || '—';
  elTemp.textContent = main ? Math.round(main.temp) + '°F' : '—';
  elCond.textContent = w.description ? w.description.replace(/\b\w/g, c => c.toUpperCase()) : '—';
  if (w.icon){
    elIcon.src = `https://openweathermap.org/img/wn/${w.icon}@2x.png`;
    elIcon.alt = w.main || '';
  } else {
    elIcon.removeAttribute('src');
    elIcon.alt = '';
  }
  themeByWeather(w.main);
}

function themeByWeather(main){
  const root = document.documentElement;
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
  root.style.setProperty('--panel', '#ffffffcc');
  root.style.setProperty('--primary', chosen[2]);
  root.style.setProperty('--ring', 'rgba(14,165,233,0.35)');
}

async function load(zip){
  input.value = zip;
  setStatus('Fetching weather…', 'warn');
  try {
    const data = await fetchWeatherByZip(zip);
    applyWeather(data);
    setStatus(`Updated for ${zip}`, 'ok');
  } catch (err){
    console.error(err);
    if (err.message === 'NO_KEY'){
      setStatus('Add your OpenWeatherMap key in config.js (window.WEATHER_API_KEY = "...").', 'err');
    } else if (err.httpStatus === 401){
      setStatus('Invalid API key (401). Check config.js or wait for activation.', 'err');
    } else if (err.httpStatus === 404){
      setStatus('ZIP not found (404). Try another 5‑digit ZIP.', 'err');
    } else if (err.httpStatus === 429){
      setStatus('Rate limited (429). Please wait and try again.', 'err');
    } else {
      setStatus('Could not fetch weather. Network or CORS error.', 'err');
    }
    elLoc.textContent = '—'; elTemp.textContent = '—'; elCond.textContent = '—';
    elIcon.removeAttribute('src'); elIcon.alt='';
    themeByWeather(null);
  }
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const zip = (input.value || '').trim();
  if (!/^\d{5}$/.test(zip)) { input.focus(); setStatus('Please enter a 5‑digit ZIP.', 'err'); return; }
  saveZip(zip);
  load(zip);
});

setInterval(() => load(loadZip()), REFRESH_MS);

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

const initialZip = loadZip();
load(initialZip);
