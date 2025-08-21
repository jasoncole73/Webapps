import React, { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'fasting-tracker-v1'

const COLOR_CHOICES = [
  ['Neutral', '#111'],
  ['Sky', '#0284c7'],
  ['Amber', '#d97706'],
  ['Purple', '#7c3aed'],
  ['Emerald', '#059669'],
  ['Red', '#dc2626'],
  ['Pink', '#db2777'],
]

function formatHM(tsMillis) {
  const totalSec = Math.max(0, Math.floor(tsMillis / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
function durToHours(millis) { return +(millis / 36e5).toFixed(2) }
function toISO(x) { return new Date(x).toISOString() }
function fromISO(s) { return s ? new Date(s) : null }

export default function App() {
  const DEFAULT_STATE = {
    activeStartISO: null,
    goalHours: 16,
    records: [],
    notifyOnGoal: true,
    timerMode: 'elapsed',
    autoStartNext: false,
    // reminders
    waterReminders: true,
    electrolytesReminders: true,
    waterEveryMins: 60,
    electrolytesEveryMins: 180,
    // color thresholds (hours) and palette (hex)
    thresholds: { s1: 12, s2: 18, s3: 24, s4: 36 },
    palette:   { base: '#111', s1: '#0284c7', s2: '#d97706', s3: '#7c3aed', s4: '#059669' },
  }

  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return { ...DEFAULT_STATE, ...(JSON.parse(raw)||{}) } } catch {}
    return DEFAULT_STATE
  })

  const [now, setNow] = useState(Date.now())
  const [customGoal, setCustomGoal] = useState('')
  const [note, setNote] = useState('')
  const [retroStart, setRetroStart] = useState('') // for <input type="datetime-local">
  const [toasts, setToasts] = useState([])
  const tickRef = useRef(null)
  const lastWaterMinuteRef = useRef(-1)
  const lastElectrolyteMinuteRef = useRef(-1)

  const goalMillis = state.goalHours * 3600 * 1000
  const activeStart = fromISO(state.activeStartISO)?.getTime() ?? null
  const elapsed = activeStart ? now - activeStart : 0
  const remaining = Math.max(0, goalMillis - elapsed)
  const progress = activeStart ? Math.min(1, elapsed / goalMillis) : 0
  const displayMillis = activeStart ? (state.timerMode === 'elapsed' ? elapsed : remaining) : 0
  const elapsedHours = elapsed / 36e5

  function addToast(text) {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  function progressColor() {
    const { thresholds, palette } = state
    if (elapsedHours >= thresholds.s4) return palette.s4
    if (elapsedHours >= thresholds.s3) return palette.s3
    if (elapsedHours >= thresholds.s2) return palette.s2
    if (elapsedHours >= thresholds.s1) return palette.s1
    return palette.base
  }

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }, [state])
  useEffect(() => { tickRef.current = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(tickRef.current) }, [])

  // Goal notification
  useEffect(() => {
    if (!state.notifyOnGoal || !activeStart) return
    if (elapsed >= goalMillis) {
      const flagKey = `goalFired:${state.activeStartISO}`
      if (!sessionStorage.getItem(flagKey)) {
        sessionStorage.setItem(flagKey, '1')
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Fasting goal reached ✔', { body: `${state.goalHours} hours complete.` })
        } else {
          addToast('Fasting goal reached ✔')
        }
      }
    }
  }, [elapsed, goalMillis, activeStart, state.activeStartISO, state.goalHours, state.notifyOnGoal])

  // Wellness reminders (toast fallback if no permission)
  useEffect(() => {
    if (!activeStart) return
    const minutes = Math.floor(elapsed / 60000)
    if (state.waterReminders && state.waterEveryMins > 0 && minutes > 0 && minutes % state.waterEveryMins === 0 && lastWaterMinuteRef.current !== minutes) {
      lastWaterMinuteRef.current = minutes
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Hydration 💧', { body: 'Take a few sips of water.' })
      else addToast('Hydration reminder 💧')
    }
    if (state.electrolytesReminders && state.electrolytesEveryMins > 0 && minutes > 0 && minutes % state.electrolytesEveryMins === 0 && lastElectrolyteMinuteRef.current !== minutes) {
      lastElectrolyteMinuteRef.current = minutes
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Electrolytes ⚡', { body: 'Consider a light electrolyte boost.' })
      else addToast('Electrolytes reminder ⚡')
    }
  }, [elapsed, activeStart, state.waterReminders, state.waterEveryMins, state.electrolytesReminders, state.electrolytesEveryMins])

  function requestNotifyPermission() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') Notification.requestPermission()
  }

  // Start helpers (supports retroactive start)
  function startFastAt(date) {
    if (activeStart) return
    const t = date.getTime()
    const nowTs = Date.now()
    if (!Number.isFinite(t) || t > nowTs) { addToast('Invalid start time'); return }
    setState(s => ({ ...s, activeStartISO: toISO(t) }))
    setNote('')
    addToast(`Fast started at ${new Date(t).toLocaleString()}`)
  }
  function startFastOffset(minutes) { startFastAt(new Date(Date.now() - minutes * 60000)) }
  function startFast() { startFastAt(new Date()) }

  function stopFast() {
    if (!activeStart) return
    const endISO = toISO(Date.now())
    const rec = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      startISO: state.activeStartISO,
      endISO,
      goalHours: state.goalHours,
      note: note.trim() || undefined,
    }
    setState(s => ({
      ...s,
      activeStartISO: s.autoStartNext ? endISO : null,
      records: [rec, ...s.records],
    }))
    setNote('')
    addToast(`Fast ended • ${durToHours(Date.now() - (activeStart||0)).toFixed(2)}h`)
  }

  function resetAll(){
    if(!confirm('Reset all data? This cannot be undone.')) return
    sessionStorage.clear()
    localStorage.removeItem(STORAGE_KEY)
    location.reload()
  }
  function deleteRecord(id){ setState(s => ({ ...s, records: s.records.filter(r => r.id !== id) })) }
  function applyPreset(v){ if (v==='custom') return; setState(s => ({ ...s, goalHours: Number(v) })) }
  function setCustomHours(){ const n = Number(customGoal); if(!Number.isFinite(n)||n<=0) return; setState(s=>({...s, goalHours:n})); setCustomGoal('') }

  function exportCSV(){
    const header = ['startISO','endISO','durationHours','goalHours','metGoal','note'].join(',')
    const rows = state.records.map(r => {
      const start = new Date(r.startISO).getTime()
      const end = new Date(r.endISO).getTime()
      const durH = ((end-start)/36e5).toFixed(2)
      const met = Number(durH) >= r.goalHours ? 'yes' : 'no'
      const safeNote = (r.note||'').replaceAll(',', ';')
      return [r.startISO,r.endISO,durH,r.goalHours,met,safeNote].join(',')
    })
    const blob = new Blob([[header,...rows].join('\n')], {type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`fasts-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const stats = useMemo(() => {
    const totalHours = state.records.reduce((sum,r)=> sum + (new Date(r.endISO)-new Date(r.startISO))/36e5, 0)
    const avg = state.records.length ? totalHours / state.records.length : 0
    const days = new Map(); for (const r of state.records){ const k = new Date(r.endISO).toLocaleDateString(); const h=(new Date(r.endISO)-new Date(r.startISO))/36e5; days.set(k,(days.get(k)||false)||h>=r.goalHours) }
    let streak=0; let d=new Date(); while(true){ const k=d.toLocaleDateString(); if(days.get(k)){streak++; d=new Date(d-864e5)} else break }
    const chartData=[]; const byDay=new Map(); for(const r of state.records){ const end=new Date(r.endISO); const k=end.toLocaleDateString(undefined,{month:'numeric',day:'numeric'}); const h=(end-new Date(r.startISO))/36e5; byDay.set(k,(byDay.get(k)||0)+h) }
    for(let i=13;i>=0;i--){ const d=new Date(Date.now()-i*864e5); const k=d.toLocaleDateString(undefined,{month:'numeric',day:'numeric'}); chartData.push({day:k,hours:+(byDay.get(k)||0).toFixed(2)}) }
    return { totalHours, avg, streak, chartData }
  }, [state.records])

  return (
    <div>
      <div className="toasts">
        {toasts.map(t => <div key={t.id} className="toast">{t.text}</div>)}
      </div>

      <header>
        <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'10px 16px'}}>
          <div className="title">Fasting Tracker</div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn" onClick={exportCSV}>Export CSV</button>
            <button className="btn ghost" onClick={resetAll} style={{color:'#c00'}}>Reset</button>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="row">
          <section className="card">
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><div style={{fontWeight:600}}>Current Fast</div><div className="label">Goal: <b>{state.goalHours}h</b></div></div>
              <div className="center" style={{padding:'8px 0'}}>
                <div style={{textAlign:'center'}}>
                  <div className="mono" style={{fontSize:48}}>{formatHM(displayMillis)}</div>
                  <div className="label" style={{marginTop:6}}>
                    {activeStart ? (remaining > 0 ? (state.timerMode==='elapsed' ? `${(remaining/36e5).toFixed(2)}h to goal` : `${(elapsed/36e5).toFixed(2)}h elapsed`) : 'Goal reached ✓') : 'Not fasting'}
                  </div>
                  <div className="progress" style={{marginTop:12, width:288, maxWidth:'100%'}}>
                    <div className="bar" style={{width:`${progress*100}%`, background: progressColor()}} />
                  </div>
                </div>
              </div>

              <div className="grid2">
                <div className="field">
                  <label className="label">Preset</label>
                  <select value={String(state.goalHours)} onChange={e => applyPreset(e.target.value)}>
                    <option value="14">14:10 (gentle)</option>
                    <option value="16">16:8 (popular)</option>
                    <option value="18">18:6</option>
                    <option value="20">20:4</option>
                    <option value="24">24h / OMAD</option>
                    <option value="custom">Custom…</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">Timer view</label>
                  <select value={state.timerMode} onChange={e => setState(s => ({...s, timerMode: e.target.value}))}>
                    <option value="elapsed">Elapsed</option>
                    <option value="countdown">Countdown to goal</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">Custom goal (hours)</label>
                  <div style={{display:'flex', gap:8}}>
                    <input inputMode="decimal" placeholder="e.g. 17.5" value={customGoal} onChange={e => setCustomGoal(e.target.value)} />
                    <button className="btn" onClick={setCustomHours}>Set</button>
                  </div>
                </div>

                <div className="field" style={{gridColumn:'1 / -1'}}>
                  <label className="label">Retroactive start</label>
                  <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                    <input type="datetime-local" value={retroStart} onChange={e => setRetroStart(e.target.value)} />
                    <button className="btn" onClick={() => {
                      const d = retroStart ? new Date(retroStart) : null
                      if (!d) { addToast('Pick a date/time'); return }
                      startFastAt(d); setRetroStart('')
                    }}>Start at time</button>
                    <button className="btn" onClick={() => startFastOffset(30)}>Start 30m ago</button>
                    <button className="btn" onClick={() => startFastOffset(60)}>Start 1h ago</button>
                    <button className="btn" onClick={() => startFastOffset(120)}>Start 2h ago</button>
                    <button className="btn" onClick={() => startFastOffset(240)}>Start 4h ago</button>
                  </div>
                </div>

                <div className="field" style={{gridColumn:'1 / -1'}}>
                  <label className="label">Wellness reminders</label>
                  <div style={{display:'grid', gap:8}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <input id="waterOn" type="checkbox" checked={state.waterReminders} onChange={e => setState(s => ({...s, waterReminders: e.target.checked}))} onClick={requestNotifyPermission} />
                      <label htmlFor="waterOn" className="label">Water every</label>
                      <input className="w-20" inputMode="numeric" value={state.waterEveryMins} onChange={e => setState(s => ({...s, waterEveryMins: Math.max(1, Number(e.target.value)||0)}))} />
                      <span className="label">mins</span>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <input id="elecOn" type="checkbox" checked={state.electrolytesReminders} onChange={e => setState(s => ({...s, electrolytesReminders: e.target.checked}))} onClick={requestNotifyPermission} />
                      <label htmlFor="elecOn" className="label">Electrolytes every</label>
                      <input className="w-20" inputMode="numeric" value={state.electrolytesEveryMins} onChange={e => setState(s => ({...s, electrolytesEveryMins: Math.max(1, Number(e.target.value)||0)}))} />
                      <span className="label">mins</span>
                    </div>
                  </div>
                </div>

                <div className="field" style={{gridColumn:'1 / -1'}}>
                  <label className="label">Color thresholds (hours → color)</label>
                  <div style={{display:'grid', gap:8}}>
                    {['s1','s2','s3','s4'].map((k,i)=> (
                      <div key={k} style={{display:'flex',alignItems:'center',gap:8}}>
                        <span className="label" style={{width:20}}>{i+1}</span>
                        <input className="w-24" inputMode="numeric" value={state.thresholds[k]} onChange={e => setState(s => ({...s, thresholds:{...s.thresholds,[k]: Math.max(1, Number(e.target.value)||0)}}))} />
                        <select value={state.palette[k]} onChange={e => setState(s => ({...s, palette:{...s.palette,[k]: e.target.value}}))}>
                          {COLOR_CHOICES.map(([name,hex]) => <option key={name} value={hex}>{name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="field" style={{gridColumn:'1 / -1'}}>
                  <label className="label">Note (optional)</label>
                  <textarea rows="2" placeholder="How do you feel? What did you eat before starting?" value={note} onChange={e => setNote(e.target.value)} />
                </div>
              </div>

              <div style={{display:'flex',alignItems:'center',gap:8}}>
                {!activeStart ? (
                  <button className="btn primary" onClick={startFast}>Start Fast</button>
                ) : (
                  <>
                    <button className="btn" disabled>Running</button>
                    <button className="btn primary" onClick={stopFast}>End & Log</button>
                  </>
                )}
                <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
                  <label className="label" style={{display:'flex', alignItems:'center', gap:8}}>
                    <input type="checkbox" checked={state.autoStartNext} onChange={e => setState(s => ({...s, autoStartNext: e.target.checked}))} />
                    Start next fast after logging
                  </label>
                  <label className="label" style={{display:'flex', alignItems:'center', gap:8}}>
                    <input type="checkbox" checked={state.notifyOnGoal} onChange={e => setState(s => ({...s, notifyOnGoal: e.target.checked}))} onClick={requestNotifyPermission} />
                    Notify at goal
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div style={{display:'grid',gap:12}}>
              <div style={{fontWeight:600}}>Overview</div>
              <div className="stats">
                <div className="stat"><div style={{fontSize:22, fontWeight:700}}>{state.records.length}</div><div className="label">Logged fasts</div></div>
                <div className="stat"><div style={{fontSize:22, fontWeight:700}}>{stats.avg.toFixed(1)}h</div><div className="label">Avg duration</div></div>
                <div className="stat"><div style={{fontSize:22, fontWeight:700}}>{stats.streak}d</div><div className="label">Streak</div></div>
              </div>
              <div className="chart">
                {stats.chartData.map((d, i) => (
                  <div key={i} className="barcol">
                    <div className="barrect" style={{height: `${Math.min(100, d.hours/24*100)}%`, background: '#111'}} title={`${d.day}: ${d.hours}h`} />
                    <div className="label">{d.day}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card" style={{gridColumn:'1 / -1'}}>
            <div style={{display:'grid',gap:12}}>
              <div style={{fontWeight:600}}>History</div>
              {state.records.length === 0 ? (
                <div className="label">No fasts logged yet. Start your first fast to see it here.</div>
              ) : (
                <ul className="list">
                  {state.records.map(r => {
                    const start = new Date(r.startISO)
                    const end = new Date(r.endISO)
                    const durMs = end - start
                    const durH = durToHours(durMs)
                    const met = durH >= r.goalHours
                    return (
                      <li className="item" key={r.id}>
                        <div style={{flex:1}}>
                          <div className="label">{start.toLocaleString()} → {end.toLocaleString()}</div>
                          <div style={{fontWeight:600}}>
                            {durH}h {met && <span className="badge" style={{marginLeft:8}}>met goal</span>}
                          </div>
                          {r.note && <div style={{fontSize:14, marginTop:4}}>{r.note}</div>}
                        </div>
                        <button className="btn ghost" style={{color:'#c00'}} onClick={() => deleteRecord(r.id)}>Delete</button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        <footer>Data is stored only in your browser (localStorage). Clear your browser data to remove it.</footer>
      </main>
    </div>
  )
}
