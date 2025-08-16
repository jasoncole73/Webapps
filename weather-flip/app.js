// Visible-at-night build
const STORAGE_KEY='weather_flip_zip'; const REFRESH_MS=10*60*1000; const DEFAULT_ZIP='10001';
window.setupClock=function(tick){const p=v=>String(v).padStart(2,'0'); const up=()=>{const n=new Date(); tick.value=[p(n.getHours()),p(n.getMinutes()),p(n.getSeconds())]; const sr=document.getElementById('sr-time'); if(sr) sr.textContent=tick.value.join(':');}; up(); Tick.helper.interval(up,1000);};

const elLoc=document.getElementById('location'), elTemp=document.getElementById('temp'), elCond=document.getElementById('condition'), elIcon=document.getElementById('icon');
const form=document.getElementById('zipForm'), input=document.getElementById('zipInput'), statusEl=document.getElementById('status');
const fullscreenBtn=document.getElementById('fullscreenBtn'), geoBtn=document.getElementById('geoBtn');
const setStatus=(m,c='')=>{statusEl.className='status '+c; statusEl.textContent=m||''};
function saveZip(z){try{localStorage.setItem(STORAGE_KEY,z)}catch{}} function loadZip(){try{return localStorage.getItem(STORAGE_KEY)||DEFAULT_ZIP}catch{return DEFAULT_ZIP}}

async function fetchWeatherByZip(zip){ if(!window.WEATHER_API_KEY) throw new Error('NO_KEY'); const url=`https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(zip)},US&appid=${window.WEATHER_API_KEY}&units=imperial`; const r=await fetch(url); if(!r.ok) throw await (async t=>{const y=await t.text(); const e=new Error('HTTP_'+t.status); e.httpStatus=t.status; e.body=y; return e;})(r); return r.json(); }
async function fetchWeatherByCoords(lat,lon){ if(!window.WEATHER_API_KEY) throw new Error('NO_KEY'); const url=`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${window.WEATHER_API_KEY}&units=imperial`; const r=await fetch(url); if(!r.ok) throw await (async t=>{const y=await t.text(); const e=new Error('HTTP_'+t.status); e.httpStatus=t.status; e.body=y; return e;})(r); return r.json(); }

function applyWeather(d){ const {name,main,weather,sys,dt,timezone}=d||{}; const w=(weather&&weather[0])||{};
  elLoc.textContent=name||'—'; elTemp.textContent=main?Math.round(main.temp)+'°F':'—'; elCond.textContent=w.description?w.description.replace(/\\b\\w/g,c=>c.toUpperCase()):'—';
  if(w.icon){ elIcon.src=`https://openweathermap.org/img/wn/${w.icon}@2x.png`; elIcon.alt=w.main||''; } else { elIcon.removeAttribute('src'); elIcon.alt=''; }
  const night = isNight(w.icon,sys,dt,timezone); document.documentElement.classList.toggle('night', night);
  themeByWeather(w.main,night); fxByWeather(w.main,night);
}

function isNight(iconCode, sys, dt, tz){ if(iconCode&&/n$/.test(iconCode)) return true; if(sys&&sys.sunrise&&sys.sunset&&typeof dt==='number'){ const local=dt+(tz||0); return local<sys.sunrise+(tz||0) || local>sys.sunset+(tz||0); } const h=new Date().getHours(); return (h<6||h>=19); }
function themeByWeather(main,night){ const root=document.documentElement; root.style.setProperty('--tile-bg', night?'#1b1f2a':'#2b2b2f'); root.style.setProperty('--tile-fg', night?'#e5e7eb':'#ffffff'); }

/* Canvas FX */
const canvas=document.getElementById('fx'); const ctx=canvas.getContext('2d'); let fxType='None', particles=[], stars=[], lightningTimer=0;
function resizeCanvas(){ canvas.width=canvas.clientWidth; canvas.height=canvas.clientHeight; } new ResizeObserver(resizeCanvas).observe(document.querySelector('.container')); resizeCanvas();
function fxClear(){ fxType='None'; particles=[]; stars=[]; lightningTimer=0; ctx.clearRect(0,0,canvas.width,canvas.height); }
function fxSun(){ fxType='Sun'; particles=[]; stars=[]; lightningTimer=0; }
function fxMoon(){ fxType='Moon'; particles=[]; stars = Array.from({length:100},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height*0.6,a:Math.random()*0.6+0.2,r:Math.random()*1.3+0.6})); lightningTimer=0; }
function fxClouds(){ fxType='Clouds'; particles=Array.from({length:10},()=>({x:Math.random()*canvas.width,y:Math.random()*180+20,w:100+Math.random()*140,h:30+Math.random()*26,v:0.2+Math.random()*0.3})); stars=[]; lightningTimer=0; }
function fxRain(){ fxType='Rain'; particles=Array.from({length:160},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,l:12+Math.random()*18,v:3+Math.random()*3})); stars=[]; lightningTimer=0; }
function fxStorm(){ fxType='Storm'; fxRain(); lightningTimer=0; }
function fxSnow(){ fxType='Snow'; particles=Array.from({length:140},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:1+Math.random()*2,v:0.4+Math.random()*0.6})); stars=[]; lightningTimer=0; }
function fxFog(){ fxType='Fog'; particles=Array.from({length:6},(_,i)=>({y:40+i*60,off:Math.random()*1000})); stars=[]; lightningTimer=0; }
function fxByWeather(main,night){ if(night){ if(main==='Rain'||main==='Drizzle') fxRain(); else if(main==='Thunderstorm') fxStorm(); else if(main==='Snow') fxSnow(); else if(main==='Mist'||main==='Fog'||main==='Haze') fxFog(); else if(main==='Clouds') fxClouds(); else fxMoon(); } else { if(main==='Rain'||main==='Drizzle') fxRain(); else if(main==='Thunderstorm') fxStorm(); else if(main==='Snow') fxSnow(); else if(main==='Mist'||main==='Fog'||main==='Haze') fxFog(); else if(main==='Clouds') fxClouds(); else fxSun(); } }
function animate(){ requestAnimationFrame(animate); ctx.clearRect(0,0,canvas.width,canvas.height);
  if(fxType==='Sun'){ const cx=160,cy=90,r=55; const g=ctx.createRadialGradient(cx,cy,10,cx,cy,r*3); g.addColorStop(0,'rgba(255,210,80,.9)'); g.addColorStop(1,'rgba(255,210,80,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r*3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,200,80,.55)'; ctx.lineWidth=3; const t=Date.now()*0.001; for(let i=0;i<12;i++){ const a=t+(Math.PI*2/12)*i, x1=cx+Math.cos(a)*r, y1=cy+Math.sin(a)*r, x2=cx+Math.cos(a)*(r+22), y2=cy+Math.sin(a)*(r+22); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); } }
  else if(fxType==='Moon'){ const cx=120,cy=90,r=34; ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--bg'); ctx.beginPath(); ctx.arc(cx+10,cy-6,r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.9)'; stars.forEach(s=>{ ctx.globalAlpha=s.a*(0.7+0.3*Math.sin((Date.now()*0.002)+(s.x+s.y))); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); }); ctx.globalAlpha=1; }
  else if(fxType==='Clouds'){ ctx.fillStyle='rgba(255,255,255,.85)'; particles.forEach(p=>{ drawCloud(p.x,p.y,p.w,p.h); p.x+=p.v; if(p.x-p.w>canvas.width) p.x=-p.w; }); }
  else if(fxType==='Rain'){ ctx.strokeStyle='rgba(180,200,255,.7)'; ctx.lineWidth=1.2; particles.forEach(p=>{ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+2,p.y+p.l); ctx.stroke(); p.y+=p.v*4; p.x+=1.2; if(p.y>canvas.height){ p.y=-20; p.x=Math.random()*canvas.width; } }); }
  else if(fxType==='Storm'){ ctx.strokeStyle='rgba(180,200,255,.7)'; ctx.lineWidth=1.2; particles.forEach(p=>{ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+2,p.y+p.l); ctx.stroke(); p.y+=p.v*4.6; p.x+=1.3; if(p.y>canvas.height){ p.y=-20; p.x=Math.random()*canvas.width; } }); lightningTimer--; if(lightningTimer<=0 && Math.random()<0.02){ ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillRect(0,0,canvas.width,canvas.height); lightningTimer=30; } }
  else if(fxType==='Snow'){ ctx.fillStyle='rgba(255,255,255,.9)'; particles.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); p.y+=p.v; p.x+=Math.sin(p.y*0.01)*0.4; if(p.y>canvas.height){ p.y=-5; p.x=Math.random()*canvas.width; } }); }
  else if(fxType==='Fog'){ particles.forEach(p=>{ const y=(p.y+Math.sin((Date.now()+p.off)*0.0003)*10); const g=ctx.createLinearGradient(0,y,0,y+80); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(0.5,'rgba(255,255,255,.15)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,y-20,canvas.width,80); }); }
}
function drawCloud(x,y,w,h){ ctx.beginPath(); ctx.arc(x+w*0.2,y+h*0.6,h*0.6,Math.PI,Math.PI*2); ctx.arc(x+w*0.45,y+h*0.45,h*0.7,Math.PI,Math.PI*2); ctx.arc(x+w*0.7,y+h*0.6,h*0.6,Math.PI,Math.PI*2); ctx.rect(x,y+h*0.6,w,h*0.4); ctx.fill(); }
animate();

async function load(zip){ input.value=zip; setStatus('Fetching weather…','warn'); try{ const d=await fetchWeatherByZip(zip); applyWeather(d); setStatus(`Updated for ${zip}`,'ok'); }catch(e){ handleError(e);} }
function handleError(e){ console.error(e); if(e.message==='NO_KEY') setStatus('Add your OpenWeatherMap key in config.js.','err'); else if(e.httpStatus===401) setStatus('Invalid API key (401).','err'); else if(e.httpStatus===404) setStatus('ZIP not found (404).','err'); else if(e.httpStatus===429) setStatus('Rate limited (429).','err'); else setStatus('Could not fetch weather.','err'); fxClear(); }

form.addEventListener('submit', e=>{ e.preventDefault(); const z=(input.value||'').trim(); if(!/^\\d{5}$/.test(z)){ input.focus(); setStatus('Please enter a 5‑digit ZIP.','err'); return;} saveZip(z); load(z); });
geoBtn.addEventListener('click', ()=>{ if(!navigator.geolocation){ setStatus('Geolocation not supported.','err'); return; } setStatus('Locating…','warn'); navigator.geolocation.getCurrentPosition(async p=>{ try{ const d=await fetchWeatherByCoords(p.coords.latitude,p.coords.longitude); applyWeather(d); setStatus('Updated for your location','ok'); }catch(e){ handleError(e);} }, err=> setStatus('Location permission denied.','err'), {enableHighAccuracy:false, timeout:8000, maximumAge:60000}); });

setInterval(()=>load(loadZip()), REFRESH_MS);
function toggleFullscreen(){ const root=document.documentElement; if(!document.fullscreenElement){ document.documentElement.requestFullscreen?.(); root.classList.add('fullscreen'); fullscreenBtn.textContent='⛶ Exit full screen'; } else { document.exitFullscreen?.(); root.classList.remove('fullscreen'); fullscreenBtn.textContent='⛶ Full screen'; } }
fullscreenBtn.addEventListener('click', toggleFullscreen);
const initialZip=loadZip(); load(initialZip);
