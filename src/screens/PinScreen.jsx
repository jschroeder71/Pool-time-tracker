import { useState } from "react";

// ── PinScreen ─────────────────────────────────────────────────────────────────
// mode = "verify" | "set"
// "verify": calls verify(pin) → bool, calls onSuccess() if true
// "set":    two-step confirm flow, calls onSuccess(pin) with confirmed PIN

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
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      const pin = next.join("");
      setTimeout(() => {
        const ok = confirmPin !== null ? pin === confirmPin : verify(pin);
        if (ok) {
          onSuccess(pin);
        } else {
          setShake(true);
          setHint(confirmPin !== null ? "PINs don't match — try again" : "Incorrect PIN");
          setTimeout(() => { setShake(false); setDigits([]); setHint(""); }, 650);
        }
      }, 100);
    }
  }

  return (
    <div style={{
      minHeight: "100svh", background: "var(--ink)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 24, gap: 0,
      animation: "fadeIn 0.18s ease",
    }}>
      {/* Logo */}
      <div style={{ fontFamily: "var(--font-h)", fontSize: 26, fontWeight: 800, letterSpacing: 1, marginBottom: 28, color: "var(--water)" }}>
        💧 POOL TIME
      </div>

      {/* Title */}
      <div style={{ fontFamily: "var(--font-h)", fontSize: 22, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>{title}</div>
      {subtitle && <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 32, textAlign: "center" }}>{subtitle}</div>}

      {/* Dots */}
      <div style={{ display: "flex", gap: 14, marginBottom: 8, animation: shake ? "shake 0.4s ease" : "none" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%",
            background: i < digits.length ? "var(--water)" : "var(--ink3)",
            border: `2px solid ${i < digits.length ? "var(--water)" : "var(--border)"}`,
            transition: "background 0.12s",
            animation: i < digits.length ? "dotPop 0.18s ease" : "none",
          }} />
        ))}
      </div>
      <div style={{ height: 18, fontSize: 13, color: "var(--red)", fontFamily: "var(--font-h)", marginBottom: 24, letterSpacing: 0.5 }}>{hint}</div>

      {/* Keypad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: 232 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => press(String(n))} style={{
            height: 62, borderRadius: 10,
            background: "var(--ink2)", border: "1px solid var(--border)",
            color: "var(--text)", fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 26,
          }}>{n}</button>
        ))}
        <button onClick={() => setDigits(d => d.slice(0,-1))} style={{
          height: 62, borderRadius: 10, background: "var(--ink3)",
          border: "1px solid var(--border)", color: "var(--muted)",
          fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 18,
        }}>⌫</button>
        <button onClick={() => press("0")} style={{
          height: 62, borderRadius: 10, background: "var(--ink2)",
          border: "1px solid var(--border)", color: "var(--text)",
          fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 26,
        }}>0</button>
        <button onClick={onCancel} style={{
          height: 62, borderRadius: 10, background: "var(--ink3)",
          border: "1px solid var(--border)", color: "var(--muted)",
          fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 12, letterSpacing: 1,
        }}>BACK</button>
      </div>
    </div>
  );
}

function SetFlow({ title, onSuccess, onCancel }) {
  const [step, setStep]   = useState("set");
  const [first, setFirst] = useState("");

  if (step === "set") return (
    <Pad
      title={title} subtitle="Choose a 4-digit PIN"
      verify={() => true}
      onSuccess={(pin) => { setFirst(pin); setStep("confirm"); }}
      onCancel={onCancel}
    />
  );
  return (
    <Pad
      title="Confirm PIN" subtitle="Enter your new PIN again"
      confirmPin={first}
      verify={(pin) => pin === first}
      onSuccess={(pin) => onSuccess(pin)}
      onCancel={() => setStep("set")}
    />
  );
}
