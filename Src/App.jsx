import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from './lib/supabase';

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --water: #0ea5e9; --water-dark: #0369a1; --water-glow: #38bdf840;
      --surface: #0f172a; --surface2: #1e293b; --surface3: #334155;
      --border: #475569; --text: #f1f5f9; --text-dim: #94a3b8;
      --green: #22c55e; --green-dim: #16a34a; --red: #ef4444;
      --amber: #f59e0b; --purple: #a855f7;
      --font-head: 'Barlow Condensed', sans-serif;
      --font-body: 'Barlow', sans-serif;
    }
    body { background: var(--surface); color: var(--text); font-family: var(--font-body); min-height: 100vh; -webkit-tap-highlight-color: transparent; }
    button { cursor: pointer; border: none; outline: none; font-family: var(--font-body); }
    button:active { transform: scale(0.96); }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--surface2); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 var(--water-glow)} 70%{box-shadow:0 0 0 14px transparent} 100%{box-shadow:0 0 0 0 transparent} }
    @keyframes pulse-green { 0%{box-shadow:0 0 0 0 #22c55e40} 70%{box-shadow:0 0 0 12px transparent} 100%{box-shadow:0 0 0 0 transparent} }
    @keyframes tick { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
    @keyframes pinDot { 0%{transform:scale(0)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
    @keyframes mapPulse { 0%{r:6;opacity:1} 100%{r:18;opacity:0} }
  `}</style>
);

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_TECHS = [
  "Alex Rivera","Brandon Cole","Casey Nguyen","Dana Torres",
  "Eli Santos","Fiona Park","Gabe Morales","Hailey Kim",
  "Ivan Cruz","Jess Webb","Kyle Hunt","Luna Reyes"
];
function loadTechs() { try { return JSON.parse(localStorage.getItem("pool_techs_v2")||"null") || DEFAULT_TECHS; } catch { return DEFAULT_TECHS; } }
function saveTechs(t) { try { localStorage.setItem("pool_techs_v2", JSON.stringify(t)); } catch {} }
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const FULL_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DEFAULT_MANAGER_PIN = "1234";
const SAMPLE_RATES = [
  { label: "30 sec", value: 30000 },
  { label: "1 min",  value: 60000 },
  { label: "5 min",  value: 300000 },
  { label: "10 min", value: 600000 },
];
const TECH_COLORS = [
  "#0ea5e9","#22c55e","#f59e0b","#ef4444","#a855f7",
  "#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6","#8b5cf6","#fb923c"
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekKey(date = new Date()) {
  const d = new Date(date); d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}
function formatTime(ms) {
  if (!ms || ms < 0) return "0:00:00";
  const s = Math.floor(ms/1000), h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60), sc = s%60;
  return `${h}:${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;
}
function formatHours(ms) { return (!ms||ms<0) ? "0.00" : (ms/3600000).toFixed(2); }
function formatHM(ms) {
  if (!ms||ms<0) return "0h 0m";
  const t = Math.floor(ms/60000);
  return `${Math.floor(t/60)}h ${t%60}m`;
}
function formatTimestamp(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
}
function todayIndex() { return new Date().getDay(); }
function todayName() { return FULL_DAYS[todayIndex()]; }
function loadData() { try { return JSON.parse(localStorage.getItem("pool_tt_v2")||"{}"); } catch { return {}; } }
function saveData(d) { try { localStorage.setItem("pool_tt_v2", JSON.stringify(d)); } catch {} }
function loadPins() { try { return JSON.parse(localStorage.getItem("pool_pins_v2")||"{}"); } catch { return {}; } }
function savePins(p) { try { localStorage.setItem("pool_pins_v2", JSON.stringify(p)); } catch {} }
function loadSettings() { try { return JSON.parse(localStorage.getItem("pool_settings_v2")||"{}"); } catch { return {}; } }
function saveSettings(s) { try { localStorage.setItem("pool_settings_v2", JSON.stringify(s)); } catch {} }

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ size = "lg" }) {
  const big = size === "lg";
  return (
    <div style={{ textAlign:"center", lineHeight:1 }}>
      <div style={{
        fontFamily:"var(--font-head)", fontWeight:900,
        fontSize: big ? 13 : 11,
        letterSpacing: big ? 3 : 2,
        color:"var(--water)", marginBottom:2
      }}>GLISTENING WATER</div>
      <div style={{
        fontFamily:"var(--font-head)", fontWeight:900,
        fontSize: big ? 36 : 24,
        letterSpacing: big ? 4 : 2,
        color:"var(--text)", lineHeight:1
      }}>💧 POOL TIME</div>
      <div style={{
        fontFamily:"var(--font-head)", fontWeight:600,
        fontSize: big ? 11 : 9,
        letterSpacing: big ? 3 : 2,
        color:"var(--text-dim)", marginTop:3
      }}>POOL SERVICE · TIME TRACKER</div>
    </div>
  );
}

// ── PIN Pad ───────────────────────────────────────────────────────────────────
function PinPad({ title, subtitle, onSuccess, onCancel, checkPin, resetKey }) {
  const [digits, setDigits] = useState([]);
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => { setDigits([]); setHint(""); setShake(false); }, [resetKey]);

  function press(d) {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      const pin = next.join("");
      setTimeout(() => {
        if (checkPin(pin)) {
          onSuccess(pin);
        } else {
          setShake(true);
          setHint("Incorrect PIN");
          setDigits([]);
          setTimeout(() => { setShake(false); setHint(""); }, 700);
        }
      }, 120);
    }
  }

  function del() { setDigits(d => d.slice(0,-1)); }

  return (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"var(--surface)", padding:24, animation:"fadeIn 0.2s ease"
    }}>
      <Logo size="lg" />
      <div style={{ marginTop:16, fontFamily:"var(--font-head)", fontSize:20, fontWeight:700, color:"var(--water)", letterSpacing:1, marginBottom:4 }}>{title}</div>
      {subtitle && <div style={{ color:"var(--text-dim)", fontSize:14, marginBottom:28, textAlign:"center" }}>{subtitle}</div>}
      <div style={{ display:"flex", gap:16, marginBottom:8, animation: shake ? "shake 0.4s ease" : "none" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width:18, height:18, borderRadius:"50%",
            background: i < digits.length ? "var(--water)" : "var(--surface3)",
            border:`2px solid ${i < digits.length ? "var(--water)" : "var(--border)"}`,
            transition:"background 0.15s",
            animation: i < digits.length ? "pinDot 0.2s ease" : "none"
          }} />
        ))}
      </div>
      <div style={{ height:20, color:"var(--red)", fontSize:13, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1, marginBottom:16 }}>{hint}</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, width:240 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => press(String(n))} style={{
            height:64, borderRadius:12, background:"var(--surface2)",
            border:"1px solid var(--border)", color:"var(--text)",
            fontFamily:"var(--font-head)", fontWeight:900, fontSize:28,
            transition:"background 0.1s"
          }}>{n}</button>
        ))}
        <button onClick={del} style={{
          height:64, borderRadius:12, background:"var(--surface3)",
          border:"1px solid var(--border)", color:"var(--text-dim)",
          fontFamily:"var(--font-head)", fontWeight:700, fontSize:20
        }}>⌫</button>
        <button onClick={() => press("0")} style={{
          height:64, borderRadius:12, background:"var(--surface2)",
          border:"1px solid var(--border)", color:"var(--text)",
          fontFamily:"var(--font-head)", fontWeight:900, fontSize:28
        }}>0</button>
        <button onClick={onCancel} style={{
          height:64, borderRadius:12, background:"var(--surface3)",
          border:"1px solid var(--border)", color:"var(--text-dim)",
          fontFamily:"var(--font-head)", fontWeight:700, fontSize:14, letterSpacing:1
        }}>BACK</button>
      </div>
    </div>
  );
}

// ── Set PIN flow ──────────────────────────────────────────────────────────────
function SetPinFlow({ title, onSet, onCancel }) {
  const [step, setStep] = useState("set");
  const [first, setFirst] = useState("");

  if (step === "set") return (
    <PinPad
      title={title}
      subtitle="Choose a 4-digit PIN"
      onSuccess={(pin) => { setFirst(pin); setStep("confirm"); }}
      onCancel={onCancel}
      checkPin={() => true}
      resetKey="set"
    />
  );

  return (
    <PinPad
      title="Confirm PIN"
      subtitle="Enter your PIN again"
      onSuccess={(pin) => { if (pin === first) onSet(pin); }}
      onCancel={() => setStep("set")}
      checkPin={(pin) => pin === first}
      resetKey="confirm"
    />
  );
}

// ── Leaflet Map ───────────────────────────────────────────────────────────────
function LeafletMap({ points = [], techColors = {}, livePositions = {}, height = 300, playbackTech = null, allTechsMode = false }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!window.L) return;
    const L = window.L;
    if (!instanceRef.current) {
      instanceRef.current = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(instanceRef.current);
    }
    const map = instanceRef.current;
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    const allCoords = [];

    if (points.length > 0) {
      const color = techColors[playbackTech] || "#0ea5e9";
      const coords = points.map(p => [p.lat, p.lng]);
      allCoords.push(...coords);
      const line = L.polyline(coords, { color, weight: 3, opacity: 0.8 }).addTo(map);
      layersRef.current.push(line);
      coords.forEach((c, i) => {
        const isLast = i === coords.length - 1;
        const dot = L.circleMarker(c, {
          radius: isLast ? 8 : 5, color, fillColor: isLast ? color : "#fff",
          fillOpacity: 1, weight: 2
        }).bindPopup(`${formatTimestamp(points[i]?.ts)}`).addTo(map);
        layersRef.current.push(dot);
      });
    }

    Object.entries(livePositions).forEach(([tech, pos]) => {
      if (!pos) return;
      const color = techColors[tech] || "#0ea5e9";
      const initials = tech.split(" ").map(n=>n[0]).join("");
      const icon = window.L.divIcon({
        html: `<div style="background:${color};color:#fff;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:11px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${initials}</div>`,
        className: "", iconSize: [32,32], iconAnchor: [16,16]
      });
      const m = window.L.marker([pos.lat, pos.lng], { icon })
        .bindPopup(`<b>${tech}</b><br/>${formatTimestamp(pos.ts)}`)
        .addTo(map);
      layersRef.current.push(m);
      allCoords.push([pos.lat, pos.lng]);
    });

    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [30,30], maxZoom: 16 });
    } else {
      map.setView([28.5,-81.3], 10);
    }

    setTimeout(() => map.invalidateSize(), 100);
  }, [points, livePositions, techColors]);

  return (
    <div style={{ position:"relative" }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" />
      <div ref={mapRef} style={{ height, width:"100%", borderRadius:10, overflow:"hidden", background:"var(--surface3)" }} />
    </div>
  );
}

// ── Load Leaflet once ─────────────────────────────────────────────────────────
function useLeaflet() {
  const [ready, setReady] = useState(!!window.L);
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [selectedTech, setSelectedTech] = useState(null);
  const [data, setData] = useState(loadData);
  const [pins, setPins] = useState(loadPins);
  const [settings, setSettings] = useState(() => ({ sampleRate: 60000, ...loadSettings() }));
  const [techs, setTechs] = useState(loadTechs);
  const persistTechs = (next) => { setTechs(next); saveTechs(next); };
  const [now, setNow] = useState(Date.now());
  const [pendingTech, setPendingTech] = useState(null);
  const [livePositions, setLivePositions] = useState({});
  const leafletReady = useLeaflet();
  const gpsTimers = useRef({});

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const persist = useCallback((next) => { setData(next); saveData(next); }, []);
  const persistPins = useCallback((next) => { setPins(next); savePins(next); }, []);
  const persistSettings = useCallback((next) => { setSettings(next); saveSettings(next); }, []);

  const techColors = {};
  techs.forEach((t,i) => techColors[t] = TECH_COLORS[i % TECH_COLORS.length]);

  // ── GPS ───────────────────────────────────────────────────────────────────
  function startGPS(tech) {
    if (!navigator.geolocation) return;
    function capture() {
      navigator.geolocation.getCurrentPosition(pos => {
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, ts: new Date().toISOString() };

        // Update local state
        setLivePositions(lp => ({ ...lp, [tech]: pt }));

        // Sync to Supabase for cross-device live map
        supabase.from("gps_points").insert({
          technician_id: tech,
          session_id: null,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
          recorded_at: new Date().toISOString(),
        }).then(({ error }) => { if (error) console.warn("GPS sync:", error.message); });

        // Save to localStorage
        setData(prev => {
          const wk = getWeekKey(), day = todayIndex();
          const next = JSON.parse(JSON.stringify(prev));
          if (!next[wk]) next[wk] = {};
          if (!next[wk][tech]) next[wk][tech] = { days:{}, submitted:false };
          if (!next[wk][tech].days[day]) next[wk][tech].days[day] = { entries:[], totalMs:0, gps:[] };
          if (!next[wk][tech].days[day].gps) next[wk][tech].days[day].gps = [];
          next[wk][tech].days[day].gps.push(pt);
          saveData(next);
          return next;
        });
      }, null, { enableHighAccuracy:true, timeout:10000 });
    }
    capture();
    gpsTimers.current[tech] = setInterval(capture, settings.sampleRate);
  }

  function stopGPS(tech) {
    clearInterval(gpsTimers.current[tech]);
    delete gpsTimers.current[tech];
    setLivePositions(lp => { const n = {...lp}; delete n[tech]; return n; });
  }

  // Restart GPS timers when sample rate changes
  useEffect(() => {
    Object.keys(gpsTimers.current).forEach(tech => {
      clearInterval(gpsTimers.current[tech]);
      gpsTimers.current[tech] = setInterval(() => {
        navigator.geolocation?.getCurrentPosition(pos => {
          const pt = { lat:pos.coords.latitude, lng:pos.coords.longitude, acc:pos.coords.accuracy, ts:new Date().toISOString() };
          setLivePositions(lp => ({...lp,[tech]:pt}));

          supabase.from("gps_points").insert({
            technician_id: tech,
            session_id: null,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy_m: pos.coords.accuracy,
            recorded_at: new Date().toISOString(),
          }).then(({ error }) => { if (error) console.warn("GPS sync:", error.message); });

          setData(prev => {
            const wk=getWeekKey(),day=todayIndex(),next=JSON.parse(JSON.stringify(prev));
            if(!next[wk]) next[wk]={};
            if(!next[wk][tech]) next[wk][tech]={days:{},submitted:false};
            if(!next[wk][tech].days[day]) next[wk][tech].days[day]={entries:[],totalMs:0,gps:[]};
            if(!next[wk][tech].days[day].gps) next[wk][tech].days[day].gps=[];
            next[wk][tech].days[day].gps.push(pt);
            saveData(next);
            return next;
          });
        }, null, {enableHighAccuracy:true,timeout:10000});
      }, settings.sampleRate);
    });
  }, [settings.sampleRate]);

  // ── Clock in/out ──────────────────────────────────────────────────────────
  function handleClockToggle(tech) {
    const wk=getWeekKey(), day=todayIndex();
    const next = JSON.parse(JSON.stringify(data));
    if (!next[wk]) next[wk]={};
    if (!next[wk][tech]) next[wk][tech]={days:{},submitted:false};
    if (!next[wk][tech].days[day]) next[wk][tech].days[day]={entries:[],totalMs:0,gps:[]};
    const dd = next[wk][tech].days[day];
    const last = dd.entries[dd.entries.length-1];
    if (last && !last.out) {
      last.out = new Date().toISOString();
      last.ms = new Date(last.out)-new Date(last.in);
      dd.totalMs = dd.entries.reduce((s,e)=>s+(e.ms||0),0);
      stopGPS(tech);
    } else {
      dd.entries.push({in:new Date().toISOString(),out:null,ms:0});
      startGPS(tech);
    }
    persist(next);
    setScreen("home");
    setSelectedTech(null);
  }

  function isClockedIn(tech) {
    const wk=getWeekKey(),day=todayIndex();
    const dd=data[wk]?.[tech]?.days?.[day];
    if (!dd?.entries?.length) return false;
    const last=dd.entries[dd.entries.length-1];
    return last && !last.out;
  }

  function liveMs(tech) {
    const wk=getWeekKey(),day=todayIndex();
    const dd=data[wk]?.[tech]?.days?.[day];
    if (!dd) return 0;
    let ms=dd.totalMs||0;
    const last=dd.entries?.[dd.entries.length-1];
    if (last&&!last.out) ms+=now-new Date(last.in);
    return ms;
  }

  function weekTotalMs(tech, wk=getWeekKey()) {
    const td=data[wk]?.[tech];
    if (!td) return 0;
    let total=0;
    for (let d=0;d<7;d++) {
      const dd=td.days?.[d];
      if (!dd) continue;
      total+=dd.totalMs||0;
      if (d===todayIndex()){
        const last=dd.entries?.[dd.entries.length-1];
        if (last&&!last.out) total+=now-new Date(last.in);
      }
    }
    return total;
  }

  function submitWeek(tech) {
    const wk=getWeekKey();
    const next=JSON.parse(JSON.stringify(data));
    if (!next[wk]) next[wk]={};
    if (!next[wk][tech]) next[wk][tech]={days:{},submitted:false};
    next[wk][tech].submitted=true;
    next[wk][tech].submittedAt=new Date().toISOString();
    persist(next);
    setScreen("home");
    setSelectedTech(null);
  }

  function flagDay(tech,day) {
    const wk=getWeekKey();
    const next=JSON.parse(JSON.stringify(data));
    if (!next[wk]) next[wk]={};
    if (!next[wk][tech]) next[wk][tech]={days:{},submitted:false};
    if (!next[wk][tech].days[day]) next[wk][tech].days[day]={entries:[],totalMs:0,gps:[]};
    next[wk][tech].days[day].flagged=!next[wk][tech].days[day].flagged;
    persist(next);
  }

  function managerUnlock(tech,wk) {
    const next=JSON.parse(JSON.stringify(data));
    if (next[wk]?.[tech]) { next[wk][tech].submitted=false; next[wk][tech].submittedAt=null; }
    persist(next);
  }

  // ── PIN helpers ───────────────────────────────────────────────────────────
  function getTechPin(tech) { return pins[tech] || null; }
  function hasTechPin(tech) { return !!pins[tech]; }
  function getManagerPin() { return pins["__manager__"] || DEFAULT_MANAGER_PIN; }

  function handleTechSelect(tech) {
    setPendingTech(tech);
    if (!hasTechPin(tech)) {
      setScreen("pin_set_new");
    } else {
      setScreen("pin_verify");
    }
  }

  function onPinVerified() { setSelectedTech(pendingTech); setScreen("tech"); }
  function onNewPinSet(pin) { const next={...pins,[pendingTech]:pin}; persistPins(next); setSelectedTech(pendingTech); setScreen("tech"); }
  function onManagerPinVerified() { setScreen("manager"); }

  // ── Screen routing ────────────────────────────────────────────────────────
  if (screen==="pin_verify") return <><GlobalStyle/><PinPad
    title={pendingTech} subtitle="Enter your PIN"
    onSuccess={onPinVerified}
    onCancel={()=>{setPendingTech(null);setScreen("home");}}
    checkPin={(pin)=>pin===getTechPin(pendingTech)}
  /></>;

  if (screen==="pin_set_new") return <><GlobalStyle/><SetPinFlow
    title={`Welcome, ${pendingTech?.split(" ")[0]}!`}
    onSet={onNewPinSet}
    onCancel={()=>{setPendingTech(null);setScreen("home");}}
  /></>;

  if (screen==="pin_manager") return <><GlobalStyle/><PinPad
    title="MANAGER ACCESS" subtitle="Enter manager PIN"
    onSuccess={onManagerPinVerified}
    onCancel={()=>setScreen("home")}
    checkPin={(pin)=>pin===getManagerPin()}
  /></>;

  if (screen==="manager") return <><GlobalStyle/><ManagerView
    data={data} now={now} weekTotalMs={weekTotalMs}
    techColors={techColors} livePositions={livePositions}
    leafletReady={leafletReady} settings={settings}
    pins={pins} persistPins={persistPins}
    managerPin={getManagerPin()}
    onUnlock={managerUnlock}
    onBack={()=>setScreen("home")}
    onSampleRate={(v)=>persistSettings({...settings,sampleRate:v})}
    onChangeManagerPin={(pin)=>{ const n={...pins,"__manager__":pin}; persistPins(n); }}
    techs={techs} onUpdateTechs={persistTechs}
  /></>;

  if (screen==="tech" && selectedTech) return <><GlobalStyle/><TechView
    tech={selectedTech} data={data} now={now}
    isClockedIn={isClockedIn(selectedTech)}
    liveMs={liveMs(selectedTech)}
    weekTotalMs={weekTotalMs(selectedTech)}
    livePos={livePositions[selectedTech]}
    leafletReady={leafletReady}
    techColors={techColors}
    pins={pins} persistPins={persistPins}
    onToggle={()=>handleClockToggle(selectedTech)}
    onSubmit={()=>submitWeek(selectedTech)}
    onFlag={(day)=>flagDay(selectedTech,day)}
    onBack={()=>{setScreen("home");setSelectedTech(null);}}
  /></>;

  return <><GlobalStyle/><HomeView
    techs={techs} data={data} now={now}
    isClockedIn={isClockedIn} techColors={techColors}
    onSelect={handleTechSelect}
    onManager={()=>setScreen("pin_manager")}
  /></>;
}

// ── HOME VIEW ─────────────────────────────────────────────────────────────────
function HomeView({ techs, data, now, isClockedIn, techColors, onSelect, onManager }) {
  const wk=getWeekKey();
  const clocked=techs.filter(isClockedIn);
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:"var(--surface2)",borderBottom:"2px solid var(--water)",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <Logo size="sm" />
          <div style={{color:"var(--text-dim)",fontSize:13,marginTop:4}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</div>
        </div>
        <button onClick={onManager} style={{background:"var(--surface3)",color:"var(--text-dim)",padding:"8px 16px",borderRadius:8,fontSize:13,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1}}>MANAGER ▸</button>
      </div>

      {clocked.length>0 && (
        <div style={{background:"#22c55e12",borderBottom:"1px solid #22c55e33",padding:"8px 20px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:"var(--green)",display:"inline-block",animation:"pulse-green 1.5s infinite"}}/>
          <span style={{fontSize:13,color:"var(--green)",fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1}}>
            {clocked.length} TECH{clocked.length>1?"S":""} ON THE CLOCK
          </span>
          <span style={{marginLeft:"auto",fontSize:12,color:"var(--text-dim)"}}>
            {clocked.slice(0,3).join(", ")}{clocked.length>3?` +${clocked.length-3} more`:""}
          </span>
        </div>
      )}

      <div style={{flex:1,padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:2,marginBottom:4}}>
          SELECT YOUR NAME — PIN REQUIRED
        </div>
        {techs.map((tech,i)=>{
          const clockedIn=isClockedIn(tech);
          const submitted=data[wk]?.[tech]?.submitted;
          const hasFlagged=Object.values(data[wk]?.[tech]?.days||{}).some(d=>d.flagged);
          const color=techColors[tech];
          return (
            <button key={tech} onClick={()=>onSelect(tech)} style={{
              background:clockedIn?"#22c55e0e":"var(--surface2)",
              border:`1px solid ${clockedIn?"#22c55e66":"var(--border)"}`,
              borderRadius:10,padding:"13px 16px",
              display:"flex",alignItems:"center",justifyContent:"space-between",
              animation:`slideUp 0.2s ease both`,animationDelay:`${i*0.03}s`
            }}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{
                  width:38,height:38,borderRadius:"50%",flexShrink:0,
                  background:color+"33",display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:"var(--font-head)",fontWeight:900,fontSize:14,color
                }}>{tech.split(" ").map(n=>n[0]).join("")}</div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontWeight:600,fontSize:16}}>{tech}</div>
                  <div style={{fontSize:12,color:"var(--text-dim)",marginTop:1}}>
                    {clockedIn?"● On the clock":submitted?"✓ Week submitted":"Tap to clock in"}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {hasFlagged&&<span style={{fontSize:14}}>🚩</span>}
                {submitted&&<span style={{fontSize:11,fontFamily:"var(--font-head)",fontWeight:700,color:"var(--green)",background:"#22c55e18",padding:"2px 8px",borderRadius:4}}>DONE</span>}
                {clockedIn&&<span style={{fontSize:18,animation:"tick 1.2s ease-in-out infinite"}}>⏱</span>}
                <span style={{color:"var(--text-dim)",fontSize:18}}>›</span>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{padding:"12px 20px",textAlign:"center",color:"var(--text-dim)",fontSize:11,borderTop:"1px solid var(--border)"}}>
        Week of {wk} · Pool Time Tracker v1.4
      </div>
    </div>
  );
}

// ── TECH VIEW ─────────────────────────────────────────────────────────────────
function TechView({ tech, data, now, isClockedIn, liveMs, weekTotalMs, livePos, leafletReady, techColors, pins, persistPins, onToggle, onSubmit, onFlag, onBack }) {
  const wk=getWeekKey();
  const techData=data[wk]?.[tech]||{days:{},submitted:false};
  const submitted=techData.submitted;
  const [showConfirm,setShowConfirm]=useState(false);
  const [showMap,setShowMap]=useState(false);
  const [showChangePin,setShowChangePin]=useState(false);
  const today=todayIndex();
  const color=techColors[tech]||"var(--water)";

  function dayMs(dayIdx) {
    const dd=techData.days?.[dayIdx];
    if (!dd) return 0;
    let ms=dd.totalMs||0;
    if (dayIdx===today){
      const last=dd.entries?.[dd.entries.length-1];
      if (last&&!last.out) ms+=now-new Date(last.in);
    }
    return ms;
  }

  const weekDays=[1,2,3,4,5,6,0];
  const weekHours=parseFloat(formatHours(weekTotalMs));
  const todayGps=techData.days?.[today]?.gps||[];

  if (showChangePin) return <SetPinFlow
    title="Change Your PIN"
    onSet={(pin)=>{ persistPins({...pins,[tech]:pin}); setShowChangePin(false); }}
    onCancel={()=>setShowChangePin(false)}
  />;

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",animation:"fadeIn 0.2s ease"}}>
      <div style={{background:"var(--surface2)",borderBottom:`2px solid ${color}`,padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"var(--surface3)",color:"var(--text)",borderRadius:8,padding:"6px 12px",fontSize:20}}>‹</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--font-head)",fontSize:22,fontWeight:900,letterSpacing:0.5}}>{tech}</div>
          <div style={{color:"var(--text-dim)",fontSize:12}}>Week of {wk}</div>
        </div>
        <button onClick={()=>setShowChangePin(true)} style={{background:"var(--surface3)",color:"var(--text-dim)",borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1}}>🔐 PIN</button>
        {submitted&&<span style={{fontSize:11,fontFamily:"var(--font-head)",fontWeight:700,color:"var(--green)",background:"#22c55e18",padding:"3px 10px",borderRadius:4}}>SUBMITTED</span>}
      </div>

      <div style={{padding:"24px 20px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
        <div style={{color:"var(--text-dim)",fontSize:12,fontFamily:"var(--font-head)",letterSpacing:2,textTransform:"uppercase"}}>{todayName()}</div>
        <div style={{fontFamily:"var(--font-head)",fontSize:48,fontWeight:900,letterSpacing:2,color:isClockedIn?color:"var(--text-dim)",animation:isClockedIn?"tick 1s ease-in-out infinite":"none"}}>
          {formatTime(isClockedIn?liveMs:dayMs(today))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:livePos?"var(--green)":"var(--text-dim)"}}>
          {livePos
            ? <><span style={{width:8,height:8,borderRadius:"50%",background:"var(--green)",display:"inline-block",animation:"pulse-green 1.5s infinite"}}/> GPS active · {livePos.acc?.toFixed(0)}m accuracy</>
            : isClockedIn ? "⏳ Acquiring GPS..." : "📍 GPS tracks when clocked in"
          }
        </div>

        {!submitted && (
          <button onClick={onToggle} style={{
            width:172,height:172,borderRadius:"50%",
            background:isClockedIn?`radial-gradient(circle,${color}18,${color}06)`:`radial-gradient(circle,var(--green)22,var(--green)08)`,
            border:`3px solid ${isClockedIn?color:"var(--green)"}`,
            color:isClockedIn?color:"var(--green)",
            fontFamily:"var(--font-head)",fontWeight:900,fontSize:22,letterSpacing:2,
            animation:isClockedIn?"pulse-ring 1.5s infinite":"none",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4
          }}>
            <span style={{fontSize:36}}>{isClockedIn?"◼":"▶"}</span>
            {isClockedIn?"CLOCK OUT":"CLOCK IN"}
          </button>
        )}

        {submitted && (
          <div style={{width:172,height:172,borderRadius:"50%",background:"#22c55e12",border:"3px solid #22c55e55",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"var(--green)",fontFamily:"var(--font-head)",fontWeight:900,fontSize:16,letterSpacing:1}}>
            <span style={{fontSize:40}}>✓</span>SUBMITTED
          </div>
        )}

        {techData.days?.[today]?.entries?.length>0 && (
          <div style={{width:"100%",background:"var(--surface2)",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:11,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:2,color:"var(--text-dim)"}}>TODAY'S ENTRIES</div>
            {techData.days[today].entries.map((e,i)=>(
              <div key={i} style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:i<techData.days[today].entries.length-1?"1px solid #47556922":"none"}}>
                <div style={{fontSize:13}}>
                  <span style={{color:"var(--green)"}}>{formatTimestamp(e.in)}</span>
                  <span style={{color:"var(--text-dim)",margin:"0 8px"}}>→</span>
                  <span style={{color:e.out?"var(--red)":"var(--text-dim)"}}>{e.out?formatTimestamp(e.out):"now"}</span>
                </div>
                <span style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:14,color:"var(--text-dim)"}}>{e.ms?formatHM(e.ms):"—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {leafletReady && (isClockedIn || todayGps.length>0) && (
        <div style={{padding:"0 16px 12px"}}>
          <button onClick={()=>setShowMap(s=>!s)} style={{
            width:"100%",padding:"10px",borderRadius:10,
            background:showMap?"var(--surface3)":"var(--surface2)",
            border:"1px solid var(--border)",color:"var(--text)",
            fontFamily:"var(--font-head)",fontWeight:700,fontSize:14,letterSpacing:1
          }}>
            {showMap?"▲ HIDE MAP":"▼ SHOW TODAY'S ROUTE"} {todayGps.length>0&&`(${todayGps.length} pts)`}
          </button>
          {showMap && (
            <div style={{marginTop:8,animation:"slideUp 0.2s ease"}}>
              <LeafletMap
                points={todayGps}
                techColors={techColors}
                livePositions={livePos?{[tech]:livePos}:{}}
                playbackTech={tech}
                height={260}
              />
              {todayGps.length>0&&(
                <div style={{marginTop:6,fontSize:11,color:"var(--text-dim)",textAlign:"center"}}>
                  First: {formatTimestamp(todayGps[0]?.ts)} · Last: {formatTimestamp(todayGps[todayGps.length-1]?.ts)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{height:1,background:"var(--border)"}}/>

      <div style={{padding:"16px 20px",flex:1}}>
        <div style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:2,marginBottom:10}}>WEEK OVERVIEW</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
          {weekDays.map(d=>{
            const ms=dayMs(d);
            const hrs=ms/3600000;
            const isToday=d===today;
            const isFlagged=techData.days?.[d]?.flagged;
            const hasData=ms>0;
            const gpsCount=techData.days?.[d]?.gps?.length||0;
            return (
              <button key={d} onClick={()=>!submitted&&onFlag(d)} style={{
                background:isToday?color+"18":"var(--surface2)",
                border:`1px solid ${isToday?color:isFlagged?"var(--amber)":"var(--border)"}`,
                borderRadius:8,padding:"10px 4px",
                display:"flex",flexDirection:"column",alignItems:"center",gap:5,
                opacity:!hasData&&d!==today?0.5:1
              }}>
                <span style={{fontSize:10,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1,color:isToday?color:"var(--text-dim)"}}>{DAYS[d]}</span>
                <div style={{width:"100%",height:36,background:"var(--surface3)",borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                  <div style={{height:`${Math.min(100,(hrs/10)*100)}%`,minHeight:hasData?3:0,background:isFlagged?"var(--amber)":isToday?color:"var(--green)",borderRadius:4,transition:"height 0.4s ease"}}/>
                </div>
                <span style={{fontSize:10,fontFamily:"var(--font-head)",fontWeight:700,color:hasData?"var(--text)":"var(--text-dim)"}}>{hasData?`${hrs.toFixed(1)}h`:"--"}</span>
                {gpsCount>0&&<span style={{fontSize:9,color:"var(--text-dim)"}}>📍{gpsCount}</span>}
                {isFlagged&&<span style={{fontSize:10}}>🚩</span>}
              </button>
            );
          })}
        </div>
        <div style={{marginTop:6,fontSize:11,color:"var(--text-dim)",textAlign:"right"}}>Tap day to flag · 📍 = GPS points</div>
      </div>

      <div style={{padding:"16px 20px",background:"var(--surface2)",borderTop:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-head)",letterSpacing:1}}>WEEK TOTAL</div>
            <div style={{fontFamily:"var(--font-head)",fontWeight:900,fontSize:36,letterSpacing:1,color:weekHours>=40?"var(--amber)":"var(--text)"}}>
              {formatHours(weekTotalMs)}<span style={{fontSize:16,color:"var(--text-dim)",marginLeft:4}}>hrs</span>
            </div>
          </div>
          {weekHours>=40&&<span style={{fontSize:11,fontFamily:"var(--font-head)",fontWeight:700,color:"var(--amber)",background:"#f59e0b18",padding:"3px 10px",borderRadius:4}}>OT LIKELY</span>}
        </div>
        {!submitted?(
          showConfirm?(
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowConfirm(false)} style={{flex:1,padding:14,borderRadius:10,background:"var(--surface3)",color:"var(--text)",fontFamily:"var(--font-head)",fontWeight:700,fontSize:16}}>CANCEL</button>
              <button onClick={()=>{onSubmit();setShowConfirm(false);}} style={{flex:2,padding:14,borderRadius:10,background:"var(--green)",color:"#fff",fontFamily:"var(--font-head)",fontWeight:900,fontSize:18,letterSpacing:1}}>✓ CONFIRM</button>
            </div>
          ):(
            <button onClick={()=>setShowConfirm(true)} disabled={weekTotalMs===0} style={{width:"100%",padding:16,borderRadius:10,background:weekTotalMs===0?"var(--surface3)":"var(--water)",color:weekTotalMs===0?"var(--text-dim)":"#fff",fontFamily:"var(--font-head)",fontWeight:900,fontSize:20,letterSpacing:1,opacity:weekTotalMs===0?0.5:1}}>SUBMIT WEEK →</button>
          )
        ):(
          <div style={{padding:16,borderRadius:10,background:"#22c55e12",border:"1px solid #22c55e44",textAlign:"center",fontFamily:"var(--font-head)",fontWeight:700,fontSize:15,color:"var(--green)"}}>
            ✓ Submitted {techData.submittedAt?new Date(techData.submittedAt).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MANAGER VIEW ──────────────────────────────────────────────────────────────
function ManagerView({ data, now, weekTotalMs, techColors, livePositions, leafletReady, settings, pins, persistPins, managerPin, onUnlock, onBack, onSampleRate, onChangeManagerPin, techs, onUpdateTechs }) {
  const wk=getWeekKey();
  const [selectedWk,setSelectedWk]=useState(wk);
  const [expandedTech,setExpandedTech]=useState(null);
  const [tab,setTab]=useState("list");
  const [playback,setPlayback]=useState({tech:null,day:null});
  const [showPinMgr,setShowPinMgr]=useState(false);
  const [showChangeMgrPin,setShowChangeMgrPin]=useState(false);
  const [resetTech,setResetTech]=useState(null);
  const [showRoster,setShowRoster]=useState(false);
  const [newTechName,setNewTechName]=useState("");

  // ── Supabase live positions ───────────────────────────────────────────────
  const [supaPositions, setSupaPositions] = useState({});
  useEffect(() => {
    async function fetchLive() {
      const { data: rows, error } = await supabase
        .from("gps_points")
        .select("technician_id, lat, lng, recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(200);
      if (error) { console.warn("Supabase fetch:", error.message); return; }
      const latest = {};
      rows.forEach(p => {
        if (!latest[p.technician_id]) {
          latest[p.technician_id] = { lat: p.lat, lng: p.lng, ts: p.recorded_at };
        }
      });
      setSupaPositions(latest);
    }
    fetchLive();
    const interval = setInterval(fetchLive, 60000);
    return () => clearInterval(interval);
  }, []);

  const weeks=[...new Set(Object.keys(data))].sort().reverse();
  if (!weeks.includes(wk)) weeks.unshift(wk);
  const weekData=data[selectedWk]||{};
  const allTechs=techs;

  const submitted=allTechs.filter(t=>weekData[t]?.submitted);
  const pending=allTechs.filter(t=>!weekData[t]?.submitted&&Object.keys(weekData[t]?.days||{}).length>0);
  const noData=allTechs.filter(t=>!weekData[t]||Object.keys(weekData[t]?.days||{}).length===0);

  // Use Supabase positions if available, fall back to local livePositions
  const liveMap = Object.keys(supaPositions).length > 0 ? supaPositions : {};
  Object.entries(livePositions).forEach(([t,p]) => { if (!liveMap[t]) liveMap[t] = p; });

  const playbackPoints = playback.tech && playback.day!==null
    ? (data[selectedWk]?.[playback.tech]?.days?.[playback.day]?.gps||[])
    : [];

  function exportCSV() {
    const rows=[["Tech","Week",...FULL_DAYS,"Total Hours","Submitted"]];
    allTechs.forEach(tech=>{
      const td=weekData[tech];
      const dayHours=FULL_DAYS.map((_,i)=>{
        const dayIdx=[0,1,2,3,4,5,6][i];
        return ((td?.days?.[dayIdx]?.totalMs||0)/3600000).toFixed(2);
      });
      rows.push([tech,selectedWk,...dayHours,formatHours(weekTotalMs(tech,selectedWk)),td?.submitted?"Yes":"No"]);
    });
    const csv=rows.map(r=>r.join(",")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`timesheet_${selectedWk}.csv`; a.click();
  }

  if (showChangeMgrPin) return <SetPinFlow
    title="Change Manager PIN"
    onSet={(pin)=>{ onChangeManagerPin(pin); setShowChangeMgrPin(false); }}
    onCancel={()=>setShowChangeMgrPin(false)}
  />;

  if (resetTech) return <SetPinFlow
    title={`Reset PIN: ${resetTech}`}
    onSet={(pin)=>{ persistPins({...pins,[resetTech]:pin}); setResetTech(null); }}
    onCancel={()=>setResetTech(null)}
  />;

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",animation:"fadeIn 0.2s ease"}}>
      <div style={{background:"var(--surface2)",borderBottom:"2px solid var(--water)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"var(--surface3)",color:"var(--text)",borderRadius:8,padding:"6px 12px",fontSize:20}}>‹</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--font-head)",fontSize:22,fontWeight:900,letterSpacing:0.5}}>MANAGER DASHBOARD</div>
        </div>
        <button onClick={exportCSV} style={{background:"var(--water)",color:"#fff",borderRadius:8,padding:"8px 14px",fontFamily:"var(--font-head)",fontWeight:700,fontSize:13,letterSpacing:1}}>↓ CSV</button>
      </div>

      <div style={{background:"var(--surface2)",borderBottom:"1px solid var(--border)",padding:"10px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"var(--text-dim)",fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1}}>GPS INTERVAL:</span>
        <div style={{display:"flex",gap:6}}>
          {SAMPLE_RATES.map(r=>(
            <button key={r.value} onClick={()=>onSampleRate(r.value)} style={{
              padding:"4px 10px",borderRadius:6,fontSize:12,
              fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1,
              background:settings.sampleRate===r.value?"var(--water)":"var(--surface3)",
              color:settings.sampleRate===r.value?"#fff":"var(--text-dim)"
            }}>{r.label}</button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={()=>{setShowRoster(s=>!s);setShowPinMgr(false);}} style={{padding:"4px 12px",borderRadius:6,fontSize:12,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1,background:"var(--surface3)",color:"var(--text-dim)"}}>👷 ROSTER</button>
          <button onClick={()=>{setShowPinMgr(s=>!s);setShowRoster(false);}} style={{padding:"4px 12px",borderRadius:6,fontSize:12,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1,background:"var(--surface3)",color:"var(--text-dim)"}}>🔐 PINs</button>
        </div>
      </div>

      {showRoster && (
        <div style={{background:"#1e293bcc",borderBottom:"1px solid var(--border)",padding:"12px 16px",animation:"slideUp 0.2s ease"}}>
          <div style={{fontSize:11,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:2,color:"var(--text-dim)",marginBottom:10}}>ROSTER MANAGEMENT</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <input
              value={newTechName}
              onChange={e=>setNewTechName(e.target.value)}
              onKeyDown={e=>{
                if(e.key==="Enter"&&newTechName.trim()&&!techs.includes(newTechName.trim())){
                  onUpdateTechs([...techs,newTechName.trim()]);
                  setNewTechName("");
                }
              }}
              placeholder="First Last"
              style={{flex:1,padding:"8px 12px",borderRadius:8,background:"var(--surface3)",border:"1px solid var(--border)",color:"var(--text)",fontFamily:"var(--font-body)",fontSize:14,outline:"none"}}
            />
            <button onClick={()=>{
              const name=newTechName.trim();
              if(name&&!techs.includes(name)){onUpdateTechs([...techs,name]);setNewTechName("");}
            }} style={{padding:"8px 14px",borderRadius:8,background:"var(--water)",color:"#fff",fontFamily:"var(--font-head)",fontWeight:700,fontSize:13,letterSpacing:1}}>+ ADD</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {techs.map(t=>(
              <div key={t} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--surface3)",borderRadius:8,padding:"8px 12px"}}>
                <span style={{fontSize:14,fontWeight:600}}>{t}</span>
                <button onClick={()=>{
                  if(window.confirm(`Remove ${t} from roster?`)){
                    onUpdateTechs(techs.filter(x=>x!==t));
                  }
                }} style={{background:"#ef444422",color:"var(--red)",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontFamily:"var(--font-head)",fontWeight:700,fontSize:12}}>REMOVE</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPinMgr && (
        <div style={{background:"#1e293bcc",borderBottom:"1px solid var(--border)",padding:"12px 16px",animation:"slideUp 0.2s ease"}}>
          <div style={{fontSize:11,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:2,color:"var(--text-dim)",marginBottom:10}}>PIN MANAGEMENT</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
            {techs.map(t=>(
              <button key={t} onClick={()=>setResetTech(t)} style={{
                padding:"5px 12px",borderRadius:6,fontSize:12,
                background:"var(--surface3)",color:pins[t]?"var(--text)":"var(--amber)",
                fontFamily:"var(--font-head)",fontWeight:700,border:`1px solid ${pins[t]?"var(--border)":"var(--amber)44"}`
              }}>
                {t.split(" ")[0]} {pins[t]?"✓":"(no PIN)"}
              </button>
            ))}
          </div>
          <button onClick={()=>setShowChangeMgrPin(true)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,background:"var(--purple)22",color:"var(--purple)",fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1,border:"1px solid var(--purple)44"}}>
            Change Manager PIN
          </button>
        </div>
      )}

      <div style={{padding:"10px 16px",background:"var(--surface2)",borderBottom:"1px solid var(--border)",display:"flex",gap:8,overflowX:"auto"}}>
        {weeks.map(w=>(
          <button key={w} onClick={()=>setSelectedWk(w)} style={{padding:"6px 14px",borderRadius:6,whiteSpace:"nowrap",fontSize:13,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1,background:selectedWk===w?"var(--water)":"var(--surface3)",color:selectedWk===w?"#fff":"var(--text-dim)"}}>
            {w===wk?`THIS WEEK (${w})`:w}
          </button>
        ))}
      </div>

      <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[{label:"SUBMITTED",val:submitted.length,color:"var(--green)"},{label:"PENDING",val:pending.length,color:"var(--amber)"},{label:"NO DATA",val:noData.length,color:"var(--text-dim)"}].map(({label,val,color})=>(
          <div key={label} style={{background:"var(--surface2)",border:`1px solid ${color}44`,borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
            <div style={{fontFamily:"var(--font-head)",fontWeight:900,fontSize:32,color}}>{val}</div>
            <div style={{fontSize:10,color:"var(--text-dim)",fontFamily:"var(--font-head)",letterSpacing:1}}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",borderBottom:"1px solid var(--border)",padding:"0 16px"}}>
        {["list","map"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1,padding:"10px",fontFamily:"var(--font-head)",fontWeight:700,fontSize:14,letterSpacing:1,
            background:"transparent",color:tab===t?"var(--water)":"var(--text-dim)",
            borderBottom:tab===t?"2px solid var(--water)":"2px solid transparent"
          }}>{t==="list"?"👥 TECHS":"🗺️ LIVE MAP"}</button>
        ))}
      </div>

      {tab==="map" && leafletReady && (
        <div style={{padding:"12px 16px",flex:1}}>
          <div style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-head)",letterSpacing:1,marginBottom:8}}>
            LIVE POSITIONS · {Object.keys(liveMap).length} techs visible
          </div>
          <LeafletMap
            points={playbackPoints}
            techColors={techColors}
            livePositions={liveMap}
            playbackTech={playback.tech}
            height={320}
            allTechsMode={!playback.tech}
          />
          <div style={{marginTop:12}}>
            <div style={{fontSize:11,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:2,color:"var(--text-dim)",marginBottom:8}}>ROUTE PLAYBACK</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>setPlayback({tech:null,day:null})} style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontFamily:"var(--font-head)",fontWeight:700,background:!playback.tech?"var(--water)":"var(--surface3)",color:!playback.tech?"#fff":"var(--text-dim)"}}>ALL LIVE</button>
              {techs.filter(t=>Object.values(data[selectedWk]?.[t]?.days||{}).some(d=>d.gps?.length>0)).map(t=>(
                <button key={t} onClick={()=>setPlayback({tech:t,day:todayIndex()})} style={{
                  padding:"5px 12px",borderRadius:6,fontSize:12,fontFamily:"var(--font-head)",fontWeight:700,
                  background:playback.tech===t?techColors[t]:"var(--surface3)",
                  color:playback.tech===t?"#fff":"var(--text-dim)"
                }}>{t.split(" ")[0]}</button>
              ))}
            </div>
            {playback.tech && (
              <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"var(--text-dim)",alignSelf:"center"}}>Day:</span>
                {[1,2,3,4,5,6,0].map(d=>{
                  const gps=data[selectedWk]?.[playback.tech]?.days?.[d]?.gps||[];
                  if (!gps.length) return null;
                  return (
                    <button key={d} onClick={()=>setPlayback(pb=>({...pb,day:d}))} style={{
                      padding:"4px 10px",borderRadius:6,fontSize:12,fontFamily:"var(--font-head)",fontWeight:700,
                      background:playback.day===d?"var(--water)":"var(--surface3)",
                      color:playback.day===d?"#fff":"var(--text-dim)"
                    }}>{DAYS[d]} ({gps.length}pts)</button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab==="list" && (
        <div style={{flex:1,padding:"0 16px 20px",display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
          {allTechs.map(tech=>{
            const td=weekData[tech];
            const total=weekTotalMs(tech,selectedWk);
            const sub=td?.submitted;
            const hasFlagged=Object.values(td?.days||{}).some(d=>d.flagged);
            const hasAny=total>0;
            const isExpanded=expandedTech===tech;
            const isLive=!!liveMap[tech];
            const color=techColors[tech];
            return (
              <div key={tech} style={{background:"var(--surface2)",border:`1px solid ${sub?"#22c55e55":hasFlagged?"#f59e0b55":"var(--border)"}`,borderRadius:10,overflow:"hidden"}}>
                <button onClick={()=>setExpandedTech(isExpanded?null:tech)} style={{width:"100%",padding:"12px 14px",background:"transparent",color:"var(--text)",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-head)",fontWeight:900,fontSize:13,color}}>
                    {tech.split(" ").map(n=>n[0]).join("")}
                  </div>
                  <div style={{flex:1,textAlign:"left"}}>
                    <div style={{fontWeight:600,fontSize:15,display:"flex",alignItems:"center",gap:6}}>
                      {tech}
                      {isLive&&<span style={{width:7,height:7,borderRadius:"50%",background:"var(--green)",display:"inline-block",animation:"pulse-green 1.5s infinite"}}/>}
                    </div>
                    <div style={{fontSize:12,color:"var(--text-dim)"}}>
                      {sub?`✓ ${td.submittedAt?new Date(td.submittedAt).toLocaleDateString():"Submitted"}`:hasAny?"Not submitted":"No entries"}
                    </div>
                  </div>
                  <div style={{textAlign:"right",marginRight:8}}>
                    <div style={{fontFamily:"var(--font-head)",fontWeight:900,fontSize:20}}>{formatHours(total)}</div>
                    <div style={{fontSize:10,color:"var(--text-dim)"}}>hrs</div>
                  </div>
                  {hasFlagged&&<span>🚩</span>}
                  <span style={{color:"var(--text-dim)"}}>{isExpanded?"▲":"▼"}</span>
                </button>

                {isExpanded && (
                  <div style={{borderTop:"1px solid var(--border)",padding:"10px 14px",animation:"slideUp 0.15s ease"}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:12}}>
                      {[1,2,3,4,5,6,0].map(d=>{
                        const dayMs=td?.days?.[d]?.totalMs||0;
                        const isFlagged=td?.days?.[d]?.flagged;
                        const gpsCount=td?.days?.[d]?.gps?.length||0;
                        return (
                          <div key={d} style={{background:isFlagged?"#f59e0b12":"var(--surface3)",borderRadius:6,padding:"6px 4px",textAlign:"center",border:isFlagged?"1px solid #f59e0b44":"1px solid transparent"}}>
                            <div style={{fontSize:10,fontFamily:"var(--font-head)",fontWeight:700,color:"var(--text-dim)",letterSpacing:1}}>{DAYS[d]}</div>
                            <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:13,marginTop:4}}>{dayMs>0?`${(dayMs/3600000).toFixed(1)}h`:"--"}</div>
                            {gpsCount>0&&<div style={{fontSize:9,color:"var(--text-dim)",marginTop:2}}>📍{gpsCount}</div>}
                            {isFlagged&&<div style={{fontSize:10}}>🚩</div>}
                          </div>
                        );
                      })}
                    </div>
                    {Object.entries(td?.days||{}).map(([dayIdx,dayData])=>(
                      <div key={dayIdx} style={{marginBottom:8}}>
                        <div style={{fontSize:11,fontFamily:"var(--font-head)",fontWeight:700,letterSpacing:1,color:"var(--text-dim)",marginBottom:3}}>{FULL_DAYS[dayIdx]}</div>
                        {dayData.entries?.map((e,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2px 0",color:"var(--text-dim)"}}>
                            <span>{formatTimestamp(e.in)} → {e.out?formatTimestamp(e.out):"clocked in"}</span>
                            <span style={{fontFamily:"var(--font-head)",fontWeight:700}}>{e.ms?formatHM(e.ms):"live"}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                      {sub&&<button onClick={()=>onUnlock(tech,selectedWk)} style={{padding:"7px 14px",borderRadius:8,background:"var(--surface3)",color:"var(--amber)",fontFamily:"var(--font-head)",fontWeight:700,fontSize:13,letterSpacing:1}}>🔓 UNLOCK</button>}
                      <button onClick={()=>{setTab("map");setPlayback({tech,day:todayIndex()});}} style={{padding:"7px 14px",borderRadius:8,background:"var(--surface3)",color:"var(--water)",fontFamily:"var(--font-head)",fontWeight:700,fontSize:13,letterSpacing:1}}>🗺️ VIEW ROUTE</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
