import { useState } from "react";
import { saveConfig } from "../supabase";
import { GlobalStyle, PrimaryBtn } from "../components/ui";

export function ConfigScreen({ onSaved }) {
  const [url,     setUrl]     = useState("");
  const [key,     setKey]     = useState("");
  const [testing, setTesting] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSave() {
    if (!url.trim() || !key.trim()) { setError("Both fields are required."); return; }
    if (!url.startsWith("https://")) { setError("URL must start with https://"); return; }
    setTesting(true); setError("");
    try {
      // Quick connectivity test
      const res = await fetch(`${url.trim()}/rest/v1/`, {
        headers: { apikey: key.trim(), Authorization: `Bearer ${key.trim()}` }
      });
      if (!res.ok && res.status !== 404) throw new Error(`Status ${res.status}`);
      saveConfig(url.trim(), key.trim()); // triggers page reload
    } catch (e) {
      setError(`Could not connect: ${e.message}. Check your URL and key.`);
      setTesting(false);
    }
  }

  return (
    <>
      <GlobalStyle />
      <div style={{
        minHeight: "100svh", background: "var(--ink)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "24px 20px", gap: 0,
        animation: "fadeIn 0.2s ease",
      }}>
        <div style={{ fontFamily: "var(--font-h)", fontSize: 34, fontWeight: 800, color: "var(--water)", marginBottom: 8 }}>💧</div>
        <div style={{ fontFamily: "var(--font-h)", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>POOL TIME</div>
        <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 36, textAlign: "center" }}>
          Connect your Supabase project to get started
        </div>

        <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Step guide */}
          <div style={{ background: "var(--ink2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
            <div style={{ color: "var(--text)", fontFamily: "var(--font-h)", fontWeight: 700, marginBottom: 8 }}>Setup (5 min)</div>
            <div>1. Go to <strong style={{color:"var(--water)"}}>supabase.com</strong> → New Project</div>
            <div>2. Name it <code style={{color:"var(--water)"}}>pool-time</code>, set a password, pick a region</div>
            <div>3. Settings → API → copy <strong>Project URL</strong> and <strong>anon public</strong> key</div>
            <div>4. Paste them below and tap Connect</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontFamily: "var(--font-h)", color: "var(--muted)", letterSpacing: 1 }}>PROJECT URL</label>
            <input
              value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              style={{
                background: "var(--ink2)", border: "1px solid var(--border)", borderRadius: 10,
                padding: "12px 14px", color: "var(--text)", fontSize: 14,
                fontFamily: "var(--font-b)", outline: "none", width: "100%",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontFamily: "var(--font-h)", color: "var(--muted)", letterSpacing: 1 }}>ANON PUBLIC KEY</label>
            <textarea
              value={key} onChange={e => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              rows={3}
              style={{
                background: "var(--ink2)", border: "1px solid var(--border)", borderRadius: 10,
                padding: "12px 14px", color: "var(--text)", fontSize: 12,
                fontFamily: "monospace", outline: "none", width: "100%",
                resize: "none", lineHeight: 1.5,
              }}
            />
          </div>

          {error && (
            <div style={{ background: "#f8514915", border: "1px solid #f8514933", borderRadius: 8, padding: "10px 14px", color: "var(--red)", fontSize: 13 }}>
              {error}
            </div>
          )}

          <PrimaryBtn onClick={handleSave} disabled={testing}>
            {testing ? "Connecting…" : "Connect to Supabase →"}
          </PrimaryBtn>
        </div>
      </div>
    </>
  );
}
