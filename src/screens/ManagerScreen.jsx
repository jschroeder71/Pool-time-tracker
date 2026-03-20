import { useState } from "react";
import { GlobalStyle, Screen, TopBar, IconBtn, Badge, LiveDot, Card, SectionLabel, Divider, Avatar, OfflineBanner } from "../components/ui";
import { PinScreen } from "./PinScreen";
import { MapView } from "../components/MapView";
import { TECHS } from "../App";
import { DAYS, FULL_DAYS, SAMPLE_RATES, getWeekKey, todayIndex, formatHours, formatHM, formatTS, formatDateTime, hexAlpha } from "../utils";
import { getGPSRate, setGPSRate } from "../hooks/useGPS";

export function ManagerScreen({
  appData, now, weekTotalMs, techColors, livePos,
  pins, online, onUnlock, onResetPin, onChangeMgrPin, onBack, onAdmin, onOvertime,
}) {
  const wk = getWeekKey();
  const [selWk,        setSelWk]        = useState(wk);
  const [tab,          setTab]          = useState("list");   // list | map
  const [expanded,     setExpanded]     = useState(null);
  const [playback,     setPlayback]     = useState({ tech: null, day: null });
  const [showPins,     setShowPins]     = useState(false);
  const [resetTech,    setResetTech]    = useState(null);
  const [changeMgrPin, setChangeMgrPin] = useState(false);
  const [gpsRate,      setGpsRateState] = useState(getGPSRate());

  const weeks     = [...new Set([wk, ...Object.keys(appData)])].sort().reverse();
  const weekData  = appData[selWk] ?? {};
  const submitted = TECHS.filter(t => weekData[t]?.submitted);
  const pending   = TECHS.filter(t => !weekData[t]?.submitted && Object.keys(weekData[t]?.days ?? {}).length > 0);
  const noData    = TECHS.filter(t => !weekData[t] || !Object.keys(weekData[t]?.days ?? {}).length);

  function updateGPSRate(ms) {
    setGPSRate(ms); setGpsRateState(ms);
    // Notify GPS hook (handled via custom event)
    window.dispatchEvent(new CustomEvent("pool_gps_rate", { detail: ms }));
  }

  function exportCSV() {
    const rows = [["Tech", "Week", ...FULL_DAYS, "Total Hours", "Submitted"]];
    TECHS.forEach(tech => {
      const td  = weekData[tech];
      const hrs = FULL_DAYS.map((_, i) => ((td?.days?.[[0,1,2,3,4,5,6][i]]?.totalMs ?? 0) / 3_600_000).toFixed(2));
      rows.push([tech, selWk, ...hrs, formatHours(weekTotalMs(tech, selWk)), td?.submitted ? "Yes" : "No"]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const a   = document.createElement("a");
    a.href    = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `timesheet_${selWk}.csv`;
    a.click();
  }

  // PIN reset flows
  if (changeMgrPin) return (
    <><GlobalStyle /><PinScreen title="New Manager PIN" mode="set" onSuccess={(p) => { onChangeMgrPin(p); setChangeMgrPin(false); }} onCancel={() => setChangeMgrPin(false)} /></>
  );
  if (resetTech) return (
    <><GlobalStyle /><PinScreen title={`Reset: ${resetTech}`} mode="set" onSuccess={(p) => { onResetPin(resetTech, p); setResetTech(null); }} onCancel={() => setResetTech(null)} /></>
  );

  // Playback points
  const pbPoints = playback.tech && playback.day !== null
    ? (appData[selWk]?.[playback.tech]?.days?.[playback.day]?.gps ?? [])
    : [];

  return (
    <>
      <GlobalStyle />
      <Screen>
        <TopBar
          left={<IconBtn onClick={onBack}>‹</IconBtn>}
          center={<span style={{ fontFamily: "var(--font-h)", fontSize: 18, fontWeight: 800 }}>MANAGER</span>}
          right={
            <button onClick={exportCSV} style={{
              background: "var(--water)", color: "#fff", borderRadius: 8,
              padding: "7px 12px", fontFamily: "var(--font-h)", fontWeight: 700,
              fontSize: 12, letterSpacing: 0.5,
            }}>↓ CSV</button>
          }
        />

        {!online && <OfflineBanner />}

        {/* Settings row */}
        <div style={{ background: "var(--ink2)", borderBottom: "1px solid var(--border)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontFamily: "var(--font-h)", fontWeight: 700, letterSpacing: 1, color: "var(--muted)" }}>GPS:</span>
          {SAMPLE_RATES.map(r => (
            <button key={r.value} onClick={() => updateGPSRate(r.value)} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 12,
              fontFamily: "var(--font-h)", fontWeight: 700,
              background: gpsRate === r.value ? "var(--water)" : "var(--ink3)",
              color: gpsRate === r.value ? "#fff" : "var(--muted)",
              border: "1px solid var(--border)",
            }}>{r.label}</button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={onOvertime} style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 12,
              fontFamily: "var(--font-h)", fontWeight: 700,
              background: "var(--ink3)", color: "var(--amber)", border: "1px solid var(--border)",
            }}>⏱ OT</button>
            <button onClick={onAdmin} style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 12,
              fontFamily: "var(--font-h)", fontWeight: 700,
              background: "var(--ink3)", color: "var(--purple)", border: "1px solid var(--border)",
            }}>⚙ Techs</button>
            <button onClick={() => setShowPins(s => !s)} style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 12,
              fontFamily: "var(--font-h)", fontWeight: 700,
              background: "var(--ink3)", color: "var(--muted)", border: "1px solid var(--border)",
            }}>🔐 PINs</button>
          </div>
        </div>

        {/* PIN panel */}
        {showPins && (
          <div style={{ background: "#161b2299", borderBottom: "1px solid var(--border)", padding: "12px 16px" }}>
            <SectionLabel>Tech PINs — tap to reset</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {TECHS.map(t => (
                <button key={t} onClick={() => setResetTech(t)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12,
                  background: "var(--ink3)", border: `1px solid ${pins[t] ? "var(--border)" : "var(--amber)"}`,
                  color: pins[t] ? "var(--text)" : "var(--amber)",
                  fontFamily: "var(--font-h)", fontWeight: 700,
                }}>
                  {t.split(" ")[0]} {pins[t] ? "✓" : "⚠"}
                </button>
              ))}
            </div>
            <button onClick={() => setChangeMgrPin(true)} style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12,
              background: hexAlpha("#bc8cff", 0.1), color: "var(--purple)",
              border: "1px solid " + hexAlpha("#bc8cff", 0.3),
              fontFamily: "var(--font-h)", fontWeight: 700,
            }}>Change Manager PIN</button>
          </div>
        )}

        {/* Week selector */}
        <div style={{ padding: "10px 16px", background: "var(--ink2)", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, overflowX: "auto" }}>
          {weeks.map(w => (
            <button key={w} onClick={() => setSelWk(w)} style={{
              padding: "6px 14px", borderRadius: 6, whiteSpace: "nowrap", fontSize: 12,
              fontFamily: "var(--font-h)", fontWeight: 700,
              background: selWk === w ? "var(--water)" : "var(--ink3)",
              color: selWk === w ? "#fff" : "var(--muted)",
              border: "1px solid var(--border)",
            }}>
              {w === wk ? `This week` : w}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[
            { label: "Submitted", val: submitted.length, color: "var(--green)" },
            { label: "Pending",   val: pending.length,   color: "var(--amber)" },
            { label: "No Data",   val: noData.length,    color: "var(--muted)" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: "var(--ink2)", border: `1px solid ${hexAlpha(color, 0.3)}`, borderRadius: "var(--radius)", padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 30, color }}>{val}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-h)", letterSpacing: 1 }}>{label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {[["list","👥 Techs"],["map","🗺️ Live Map"]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px", background: "transparent",
              fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 13,
              color: tab === t ? "var(--water)" : "var(--muted)",
              borderBottom: tab === t ? "2px solid var(--water)" : "2px solid transparent",
            }}>{label}</button>
          ))}
        </div>

        {/* MAP TAB */}
        {tab === "map" && (
          <div style={{ padding: "12px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {Object.keys(livePos).length} tech{Object.keys(livePos).length !== 1 ? "s" : ""} broadcasting live
            </div>
            <MapView
              points={pbPoints}
              livePos={playback.tech ? {} : livePos}
              techColors={techColors}
              height={300}
              playTech={playback.tech}
            />
            {/* Playback controls */}
            <div>
              <SectionLabel>Route Playback</SectionLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setPlayback({ tech: null, day: null })} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12,
                  fontFamily: "var(--font-h)", fontWeight: 700,
                  background: !playback.tech ? "var(--water)" : "var(--ink3)",
                  color: !playback.tech ? "#fff" : "var(--muted)", border: "1px solid var(--border)",
                }}>All Live</button>
                {TECHS.filter(t => Object.values(appData[selWk]?.[t]?.days ?? {}).some(d => d.gps?.length)).map(t => (
                  <button key={t} onClick={() => setPlayback({ tech: t, day: todayIndex() })} style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 12,
                    fontFamily: "var(--font-h)", fontWeight: 700,
                    background: playback.tech === t ? techColors[t] : "var(--ink3)",
                    color: playback.tech === t ? "#fff" : "var(--muted)", border: "1px solid var(--border)",
                  }}>{t.split(" ")[0]}</button>
                ))}
              </div>
              {playback.tech && (
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[1,2,3,4,5,6,0].map(d => {
                    const gps = appData[selWk]?.[playback.tech]?.days?.[d]?.gps ?? [];
                    if (!gps.length) return null;
                    return (
                      <button key={d} onClick={() => setPlayback(pb => ({ ...pb, day: d }))} style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 12,
                        fontFamily: "var(--font-h)", fontWeight: 700,
                        background: playback.day === d ? "var(--water)" : "var(--ink3)",
                        color: playback.day === d ? "#fff" : "var(--muted)", border: "1px solid var(--border)",
                      }}>{DAYS[d]} ({gps.length})</button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LIST TAB */}
        {tab === "list" && (
          <div style={{ flex: 1, padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {TECHS.map(tech => {
              const td       = weekData[tech];
              const total    = weekTotalMs(tech, selWk);
              const sub      = td?.submitted;
              const flagged  = Object.values(td?.days ?? {}).some(d => d.flagged);
              const hasData  = total > 0;
              const isLive   = !!livePos[tech];
              const isExp    = expanded === tech;
              const color    = techColors[tech];

              return (
                <Card key={tech} style={{ border: `1px solid ${sub ? "#3fb95044" : flagged ? "#d2992244" : "var(--border)"}` }}>
                  <button onClick={() => setExpanded(isExp ? null : tech)} style={{
                    width: "100%", padding: "12px 14px", background: "transparent",
                    color: "var(--text)", display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <Avatar tech={tech} color={color} size={34} />
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 7 }}>
                        {tech} {isLive && <LiveDot size={7} />}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {sub ? `✓ ${td.submittedAt ? new Date(td.submittedAt).toLocaleDateString() : "Submitted"}` : hasData ? "Not submitted" : "No entries"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: 8 }}>
                      <div style={{ fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 20 }}>{formatHours(total)}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)" }}>hrs</div>
                    </div>
                    {flagged && <span style={{ fontSize: 13 }}>🚩</span>}
                    <span style={{ color: "var(--muted)" }}>{isExp ? "▲" : "▼"}</span>
                  </button>

                  {isExp && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px" }}>
                      {/* Day grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 12 }}>
                        {[1,2,3,4,5,6,0].map(d => {
                          const dms      = td?.days?.[d]?.totalMs ?? 0;
                          const dflagged = td?.days?.[d]?.flagged;
                          const gps      = td?.days?.[d]?.gps?.length ?? 0;
                          return (
                            <div key={d} style={{
                              background: dflagged ? hexAlpha("var(--amber)", 0.1) : "var(--ink3)",
                              border: `1px solid ${dflagged ? "#d2992244" : "transparent"}`,
                              borderRadius: 8, padding: "7px 4px", textAlign: "center",
                            }}>
                              <div style={{ fontSize: 10, fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--muted)", letterSpacing: 1 }}>{DAYS[d]}</div>
                              <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 13, marginTop: 4 }}>{dms > 0 ? `${(dms/3_600_000).toFixed(1)}h` : "--"}</div>
                              {gps > 0 && <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>📍{gps}</div>}
                              {dflagged && <div style={{ fontSize: 10 }}>🚩</div>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Entry details */}
                      {Object.entries(td?.days ?? {}).map(([dayIdx, dd]) => (
                        <div key={dayIdx} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--muted)", marginBottom: 3, letterSpacing: 0.5 }}>{FULL_DAYS[dayIdx]}</div>
                          {dd.entries?.map((e, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: "var(--muted)" }}>
                              <span>{formatTS(e.in)} → {e.out ? formatTS(e.out) : "active"}</span>
                              <span style={{ fontFamily: "var(--font-h)", fontWeight: 700 }}>{e.ms ? formatHM(e.ms) : "live"}</span>
                            </div>
                          ))}
                        </div>
                      ))}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        {sub && (
                          <button onClick={() => onUnlock(tech, selWk)} style={{
                            padding: "7px 14px", borderRadius: 8, background: "var(--ink3)",
                            color: "var(--amber)", fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 12,
                            border: "1px solid #d2992233",
                          }}>🔓 Unlock</button>
                        )}
                        <button onClick={() => { setTab("map"); setPlayback({ tech, day: todayIndex() }); }} style={{
                          padding: "7px 14px", borderRadius: 8, background: "var(--ink3)",
                          color: "var(--water)", fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 12,
                          border: "1px solid #38bdf833",
                        }}>🗺️ View Route</button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Screen>
    </>
  );
}
