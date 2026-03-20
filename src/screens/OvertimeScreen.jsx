import { useState, useMemo } from "react";
import { GlobalStyle, Screen, TopBar, Card, SectionLabel, IconBtn, Badge } from "../components/ui";
import { hexAlpha } from "../utils";

const OVERTIME_THRESHOLD_MS = 40 * 60 * 60 * 1000; // 40 hours/week
const DAY_THRESHOLD_MS      = 8 * 60 * 60 * 1000;  // 8 hours/day

function fmtMs(ms) {
  if (!ms) return "0h 0m";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function allWeekKeys(appData) {
  return [...new Set(Object.keys(appData))].sort().reverse();
}

export function OvertimeScreen({ appData, techs, techColors, onBack }) {
  const weeks = useMemo(() => allWeekKeys(appData), [appData]);
  const [selectedWeek, setSelectedWeek] = useState(weeks[0] ?? "");

  const report = useMemo(() => {
    if (!selectedWeek) return [];
    return techs.map(tech => {
      const tw     = appData[selectedWeek]?.[tech];
      const days   = tw?.days ?? {};
      const weekMs = Object.values(days).reduce((s, d) => s + (d.totalMs ?? 0), 0);
      const otMs   = Math.max(0, weekMs - OVERTIME_THRESHOLD_MS);

      const dailyOT = Object.entries(days)
        .filter(([, d]) => (d.totalMs ?? 0) > DAY_THRESHOLD_MS)
        .map(([dayIdx, d]) => ({
          day: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][+dayIdx] ?? dayIdx,
          ms: d.totalMs,
          otMs: (d.totalMs ?? 0) - DAY_THRESHOLD_MS,
        }));

      return { tech, weekMs, otMs, dailyOT, submitted: tw?.submitted ?? false };
    }).sort((a, b) => b.otMs - a.otMs);
  }, [selectedWeek, appData, techs]);

  const totalOtMs  = report.reduce((s, r) => s + r.otMs, 0);
  const totalWkMs  = report.reduce((s, r) => s + r.weekMs, 0);
  const overTechs  = report.filter(r => r.otMs > 0);

  return (
    <>
      <GlobalStyle />
      <Screen>
        <TopBar
          left={<IconBtn onClick={onBack}>←</IconBtn>}
          center={<span style={{ fontFamily: "var(--font-h)", fontSize: 16, fontWeight: 800 }}>OVERTIME REPORT</span>}
        />

        <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Week selector */}
          <Card style={{ padding: 14 }}>
            <SectionLabel>Select Week</SectionLabel>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px",
                background: "var(--ink3)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text)", fontSize: 15,
                fontFamily: "var(--font-b)",
              }}
            >
              {weeks.map(w => <option key={w} value={w}>{w}</option>)}
              {!weeks.length && <option>No data yet</option>}
            </select>
          </Card>

          {/* Summary bar */}
          {selectedWeek && (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
            }}>
              {[
                { label: "Total Hours", value: fmtMs(totalWkMs), color: "var(--water)" },
                { label: "OT Hours",    value: fmtMs(totalOtMs), color: totalOtMs > 0 ? "var(--amber)" : "var(--muted)" },
                { label: "OT Techs",    value: overTechs.length, color: overTechs.length > 0 ? "var(--red)" : "var(--green)" },
              ].map(s => (
                <Card key={s.label} style={{ padding: "12px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-h)", color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3, letterSpacing: 0.5 }}>{s.label}</div>
                </Card>
              ))}
            </div>
          )}

          {/* Per-tech rows */}
          {report.map(r => {
            const color = techColors[r.tech] ?? "var(--water)";
            const hasOT = r.otMs > 0;
            return (
              <Card key={r.tech} style={{ overflow: "visible" }}>
                {/* Header row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px",
                  borderBottom: r.dailyOT.length ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: hexAlpha(color, 0.2), border: `2px solid ${color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 13, color,
                  }}>
                    {r.tech.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{r.tech}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                      {fmtMs(r.weekMs)} total
                      {r.submitted && <span style={{ marginLeft: 8, color: "var(--green)" }}>· submitted</span>}
                    </div>
                  </div>
                  {hasOT
                    ? <Badge color="var(--amber)">+{fmtMs(r.otMs)} OT</Badge>
                    : <Badge color="var(--green)">On track</Badge>
                  }
                </div>

                {/* Daily OT breakdown */}
                {r.dailyOT.map(d => (
                  <div key={d.day} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "8px 14px 8px 62px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13, color: "var(--muted)",
                  }}>
                    <span>{d.day} — {fmtMs(d.ms)}</span>
                    <span style={{ color: "var(--amber)" }}>+{fmtMs(d.otMs)} over 8h</span>
                  </div>
                ))}
              </Card>
            );
          })}

          {!report.length && (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: 40, fontSize: 14 }}>
              No time data for this week yet.
            </div>
          )}
        </div>
      </Screen>
    </>
  );
}
