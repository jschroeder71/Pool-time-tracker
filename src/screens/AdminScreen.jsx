import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { GlobalStyle, Screen, TopBar, Card, PrimaryBtn, SectionLabel, Spinner, IconBtn } from "../components/ui";

export function AdminScreen({ onBack, onSaved }) {
  const [techs, setTechs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError]     = useState("");

  useEffect(() => { fetchTechs(); }, []);

  async function fetchTechs() {
    setLoading(true);
    const { data, error } = await supabase()
      .from("techs")
      .select("id, name, email, active")
      .order("name");
    if (!error) setTechs(data ?? []);
    setLoading(false);
  }

  async function addTech() {
    const name = newName.trim();
    if (!name) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    const { error } = await supabase()
      .from("techs")
      .insert({ name, email: newEmail.trim() || null, active: true });
    if (error) { setError(error.message); setSaving(false); return; }
    setNewName("");
    setNewEmail("");
    await fetchTechs();
    setSaving(false);
  }

  async function toggleActive(tech) {
    await supabase()
      .from("techs")
      .update({ active: !tech.active })
      .eq("id", tech.id);
    await fetchTechs();
  }

  async function deleteTech(id) {
    if (!confirm("Delete this tech? Their time entries will remain in the database.")) return;
    await supabase().from("techs").delete().eq("id", id);
    await fetchTechs();
  }

  return (
    <>
      <GlobalStyle />
      <Screen>
        <TopBar
          left={<IconBtn onClick={onBack}>←</IconBtn>}
          center={<span style={{ fontFamily: "var(--font-h)", fontSize: 16, fontWeight: 800, letterSpacing: 0.5 }}>TECH ADMIN</span>}
          right={
            <button onClick={onSaved} style={{
              background: "var(--water)", color: "#fff", border: "none",
              borderRadius: 8, padding: "7px 12px",
              fontSize: 12, fontFamily: "var(--font-h)", fontWeight: 700,
            }}>SAVE ✓</button>
          }
        />

        <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Add new tech */}
          <Card style={{ padding: 16 }}>
            <SectionLabel>Add New Technician</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Full name (e.g. Jane Smith)"
                style={inputStyle}
              />
              <input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Email for weekly summary (optional)"
                type="email"
                style={inputStyle}
              />
              {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}
              <PrimaryBtn onClick={addTech} disabled={saving || !newName.trim()}>
                {saving ? "Adding…" : "+ Add Technician"}
              </PrimaryBtn>
            </div>
          </Card>

          {/* Tech list */}
          <div>
            <SectionLabel>Current Technicians ({techs.filter(t => t.active).length} active)</SectionLabel>
            {loading
              ? <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Spinner /></div>
              : techs.map(tech => (
                <div key={tech.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", marginBottom: 6,
                  background: "var(--ink2)", border: `1px solid ${tech.active ? "var(--border)" : "var(--red)33"}`,
                  borderRadius: "var(--radius)", opacity: tech.active ? 1 : 0.5,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{tech.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {tech.email || "No email set"}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(tech)}
                    style={{
                      background: tech.active ? "#3fb95020" : "#f8514920",
                      color: tech.active ? "var(--green)" : "var(--red)",
                      border: `1px solid ${tech.active ? "#3fb95050" : "#f8514950"}`,
                      borderRadius: 7, padding: "5px 10px", fontSize: 12,
                      fontFamily: "var(--font-h)", fontWeight: 700,
                    }}
                  >
                    {tech.active ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => deleteTech(tech.id)}
                    style={{
                      background: "transparent", color: "var(--muted)",
                      border: "1px solid var(--border)", borderRadius: 7,
                      padding: "5px 9px", fontSize: 14,
                    }}
                  >🗑</button>
                </div>
              ))
            }
          </div>
        </div>
      </Screen>
    </>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: "var(--ink3)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)", fontSize: 15,
  fontFamily: "var(--font-b)", outline: "none",
};
