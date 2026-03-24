import { useState } from "react";

// ── Haptic helper ─────────────────────────────────────────────────────────────
function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch (_) {}
}

// ── PinScreen ─────────────────────────────────────────────────────────────────
export function PinScreen({ title, subtitle, mode = "verify", verify, onSuccess, onCancel }) {
  return mode === "set"
    ? <SetFlow title={title} onSuccess={onSuccess} onCancel={onCancel} />
    : <Pad title={title} subtitle={subtitle} onSuccess={() => onSuccess()} onCancel={onCancel} verify={verify} />;
}

function Pad({ title, subtitle, verify, onSuccess, onCancel, confirmPin = null }) {
  const [digits, setDigits] = useState([]);
  const [shake,  setShake]  = useState(false);
  const [hint,   setHint]   = useState("");

  function press(d) {
    if (digits.length >= 4) return;
    vibrate(30);
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      const pin = next.join("");
      setTimeout(() => {
        const ok = confirmPin !== null ? pin === confirmPin : verify(pin);
        if (ok) {
          vibrate(50);
          onSuccess(pin);
        } else {
          vibrate([60, 80, 60]);
          setShake(true);
          setHint(confirmPin !== null ? "PINs don't match — try again" : "Incorrect PIN");
          setTimeout(() => { setShake(false); setDigits([]); setHint(""); }, 650);
        }
      }, 100);
    }
  }

  function backspace() {
    vibrate(20);
    setDigits(d => d.slice(0, -1));
  }

  return (
    <div style={{
      minHeight: "100svh", background: "#0d1117",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 24,
      animation: "fadeIn 0.18s ease",
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 1, marginBottom: 28, color: "#38bdf8" }}>
        💧 POOL TIME
      </div>

      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 4, textAlign: "center", color: "#e6edf3" }}>{title}</div>
      {subtitle && <div style={{ color: "#8b949e", fontSize: 14, marginBottom: 32, textAlign: "center" }}>{subtitle}</div>}

      {/* Dots — hardcoded hex, no CSS var dependency */}
      <div style={{ display: "flex", gap: 14, marginBottom: 8, animation: shake ? "shake 0.4s ease" : "none" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%",
            background: i < digits.length ? "#38bdf8" : "#21262d",
            border: `2px solid ${i < digits.length ? "#38bdf8" : "#30363d"}`,
            transition: "background 0.12s",
          }} />
        ))}
      </div>
      <div style={{ height: 18, fontSize: 13, color: "#f85149", fontFamily: "'Syne', sans-serif", marginBottom: 24, letterSpacing: 0.5 }}>{hint}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: 232 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => press(String(n))} style={{
            height: 62, borderRadius: 10,
            background: "#161b22", border: "1px solid #30363d",
            color: "#e6edf3", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26,
          }}>{n}</button>
        ))}
        <button onClick={backspace} style={{
          height: 62, borderRadius: 10, background: "#21262d",
          border: "1px solid #30363d", color: "#8b949e",
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18,
        }}>⌫</button>
        <button onClick={() => press("0")} style={{
          height: 62, borderRadius: 10, background: "#161b22",
          border: "1px solid #30363d", color: "#e6edf3",
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26,
        }}>0</button>
        <button onClick={onCancel} style={{
          height: 62, borderRadius: 10, background: "#21262d",
          border: "1px solid #30363d", color: "#8b949e",
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 1,
        }}>BACK</button>
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes shake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-7px)} 40%,80%{transform:translateX(7px)} }
      `}</style>
    </div>
  );
}

function SetFlow({ title, onSuccess, onCancel }) {
  const [step, setStep]   = useState("set");
  const [first, setFirst] = useState("");

  if (step === "set") return (
    <Pad
      key="set"
      title={title} subtitle="Choose a 4-digit PIN"
      verify={() => true}
      onSuccess={(pin) => { setFirst(pin); setStep("confirm"); }}
      onCancel={onCancel}
    />
  );
  return (
    <Pad
      key="confirm"
      title="Confirm PIN" subtitle="Enter your new PIN again"
      confirmPin={first}
      verify={(pin) => pin === first}
      onSuccess={(pin) => onSuccess(pin)}
      onCancel={() => setStep("set")}
    />
  );
}
