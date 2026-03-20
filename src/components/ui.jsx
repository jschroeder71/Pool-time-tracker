import { hexAlpha } from "../utils";

// ── Global styles injected once ───────────────────────────────────────────────
export const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --ink:     #0d1117;
      --ink2:    #161b22;
      --ink3:    #21262d;
      --border:  #30363d;
      --text:    #e6edf3;
      --muted:   #8b949e;
      --water:   #38bdf8;
      --green:   #3fb950;
      --red:     #f85149;
      --amber:   #d29922;
      --purple:  #bc8cff;
      --font-h:  'Syne', sans-serif;
      --font-b:  'DM Sans', sans-serif;
      --radius:  12px;
    }
    html, body { background: var(--ink); color: var(--text); font-family: var(--font-b); min-height: 100vh; -webkit-tap-highlight-color: transparent; overscroll-behavior: none; }
    button { cursor: pointer; border: none; outline: none; font-family: var(--font-b); color: inherit; transition: opacity 0.15s, transform 0.1s; }
    button:active { transform: scale(0.96); opacity: 0.85; }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: var(--ink2); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    @keyframes fadeUp   { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
    @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
    @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes glow     { 0%{box-shadow:0 0 0 0 #3fb95040} 70%{box-shadow:0 0 0 12px transparent} 100%{box-shadow:0 0 0 0 transparent} }
    @keyframes waterGlow{ 0%{box-shadow:0 0 0 0 #38bdf840} 70%{box-shadow:0 0 0 14px transparent} 100%{box-shadow:0 0 0 0 transparent} }
    @keyframes shake    { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-7px)} 40%,80%{transform:translateX(7px)} }
    @keyframes dotPop   { 0%{transform:scale(0)} 60%{transform:scale(1.25)} 100%{transform:scale(1)} }
    @keyframes spin     { to{transform:rotate(360deg)} }
  `}</style>
);

// ── Copyright footer ─────────────────────────────────────────────────────────
function Footer() {
  return (
    <div style={{
      padding: "10px 16px 14px", textAlign: "center",
      fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-b)",
      letterSpacing: 0.3, borderTop: "1px solid var(--border)",
      marginTop: "auto", opacity: 0.6,
    }}>
      © 2026 Glistening Water Pool Services. Created by John Schroeder. All rights reserved.
    </div>
  );
}

// ── Layout shell ──────────────────────────────────────────────────────────────
export function Screen({ children, style = {} }) {
  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", animation: "fadeIn 0.18s ease", ...style }}>
      {children}
      <Footer />
    </div>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────
export function TopBar({ left, center, right, accent = "var(--water)" }) {
  return (
    <header style={{
      background: "var(--ink2)", borderBottom: `2px solid ${accent}`,
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <div style={{ width: 60 }}>{left}</div>
      <div style={{ flex: 1, textAlign: "center" }}>{center}</div>
      <div style={{ width: 60, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </header>
  );
}

// ── Icon button ───────────────────────────────────────────────────────────────
export function IconBtn({ onClick, children, color = "var(--muted)" }) {
  return (
    <button onClick={onClick} style={{
      background: "var(--ink3)", color, border: "1px solid var(--border)",
      borderRadius: 8, padding: "7px 13px", fontSize: 18, lineHeight: 1,
    }}>{children}</button>
  );
}

// ── Pill badge ────────────────────────────────────────────────────────────────
export function Badge({ color = "var(--water)", children }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 20,
      background: hexAlpha(color, 0.15), color, border: `1px solid ${hexAlpha(color, 0.4)}`,
      fontSize: 11, fontFamily: "var(--font-h)", fontWeight: 700, letterSpacing: 0.8,
    }}>{children}</span>
  );
}

// ── Live dot ──────────────────────────────────────────────────────────────────
export function LiveDot({ color = "var(--green)", size = 8 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      background: color, animation: "glow 1.6s infinite", flexShrink: 0,
    }} />
  );
}

// ── Offline banner ────────────────────────────────────────────────────────────
export function OfflineBanner({ queueLength = 0 }) {
  return (
    <div style={{
      background: "#d2992215", borderBottom: "1px solid #d2992233",
      padding: "7px 16px", display: "flex", alignItems: "center", gap: 8,
      fontSize: 13, color: "var(--amber)",
    }}>
      <span>⚡</span>
      <span>Offline — {queueLength} action{queueLength !== 1 ? "s" : ""} queued, will sync on reconnect</span>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontFamily: "var(--font-h)", fontWeight: 700,
      letterSpacing: 1.5, color: "var(--muted)", textTransform: "uppercase",
      marginBottom: 8,
    }}>{children}</div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "var(--ink2)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", overflow: "hidden",
      ...(onClick ? { cursor: "pointer" } : {}),
      ...style,
    }}>{children}</div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider() {
  return <div style={{ height: 1, background: "var(--border)" }} />;
}

// ── Tech avatar ───────────────────────────────────────────────────────────────
export function Avatar({ tech, color, size = 38, clockedIn = false }) {
  const initials = tech.split(" ").map(n => n[0]).join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: hexAlpha(color, 0.2),
      border: `2px solid ${clockedIn ? color : "transparent"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-h)", fontWeight: 800, fontSize: size * 0.35,
      color, animation: clockedIn ? "glow 1.6s infinite" : "none",
    }}>{initials}</div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, color = "var(--water)" }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${hexAlpha(color, 0.25)}`,
      borderTopColor: color, animation: "spin 0.7s linear infinite",
    }} />
  );
}

// ── Primary button ────────────────────────────────────────────────────────────
export function PrimaryBtn({ onClick, disabled, color = "var(--water)", children, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "15px", borderRadius: "var(--radius)",
      background: disabled ? "var(--ink3)" : color,
      color: disabled ? "var(--muted)" : "#fff",
      fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 17, letterSpacing: 0.5,
      opacity: disabled ? 0.6 : 1,
      ...style,
    }}>{children}</button>
  );
}
