import { useState } from "react";
import { GlobalStyle, Screen, TopBar, IconBtn, Badge, LiveDot, Card, SectionLabel, Divider, PrimaryBtn, OfflineBanner } from "../components/ui";
import { PinScreen } from "./PinScreen";
import { MapView } from "../components/MapView";
import { DAYS, FULL_DAYS, getWeekKey, todayIndex, todayName, formatTime, formatHours, formatHM, formatTS, hexAlpha } from "../utils";

export function TechScreen({
  tech, appData, now, isClockedIn, liveMs, weekTotalMs,
  livePos, techColor, onToggle, onSubmit, onFlag,
  onChangePin, onBack, online,
}) {
  const wk       = getWeekKey();
  const today    = todayIndex();
  const techData = appData[wk]?.[tech] ?? { days: {}, submitted: false };
  const submitted = techData.submitted;
  const weekHrs  = parseFloat(formatHours(weekTotalMs));

  const [showMap,      setShowMap]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [showPinChange,setShowPinChange]= useState(false);

  function dayMs(d) {
    const dd  = techData.days?.[d];
    if (!dd) return 0;
    let ms    = dd.totalMs ?? 0;
    if (d === today) {
      const last = dd.entries?.at(-1);
      if (last && !last.out) ms += now - new Date(last.in);
    }
    return ms;
  }

  if (showPinChange) return (
    <>
      <GlobalStyle />
      <PinScreen
        title="Change PIN"
        mode="set"
        onSuccess={(pin) => { onChangePin(pin); setShowPinChange(false); }}
        onCancel={() => setShowPinChange(false)}
      />
    </>
  );

  const todayGps   = techData.days?.[today]?.gps ?? [];
  const weekDays   = [1,2,3,4,5,6,0];

  return (
    <>
      <GlobalStyle />
      <Screen>
        <TopBar
          accent={techColor}
          left={<IconBtn onClick={onBack}>‹</IconBtn>}
          center={
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-h)", fontSize: 18, fontWeight: 800 }}>{tech}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Week of {wk}</div>
            </div>
          }
          right={
            <button onClick={() => setShowPinChange(true)} style={{
              background: "var(--ink3)", border: "1px solid var(--border)",
              color: "var(--muted)", borderRadius: 8, padding: "6px 10px", fontSize: 12,
              fontFamily: "var(--font-h)", fontWeight: 700,
            }}>🔐</button>
          }
        />

        {!online && <OfflineBanner />}

        {/* Clock section */}
        <div style={{ padding: "24px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ color: "var(--muted)", fontSize: 13, fontFamily: "var(--font-h)", letterSpacing: 1 }}>{todayName().toUpperCase()}</div>

          {/* Big timer */}
          <div style={{
            fontFamily: "var(--font-h)", fontSize: 52, fontWeight: 800, letterSpacing: 1,
            color: isClockedIn ? techColor : "var(--muted)",
            animation: isClockedIn ? "pulse 1s ease infinite" : "none",
          }}>
            {formatTime(isClockedIn ? liveMs : dayMs(today))}
          </div>

          {/* GPS status */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: livePos ? "var(--green)" : "var(--muted)" }}>
            {livePos
              ? <><LiveDot size={7} /> GPS · {livePos.acc}m accuracy</>
              : isClockedIn ? "⏳ Acquiring GPS…" : "📍 GPS active while clocked in"
            }
          </div>

          {/* Big clock button */}
          {!submitted && (
            <button onClick={onToggle} style={{
              width: 168, height: 168, borderRadius: "50%",
              background: isClockedIn
                ? `radial-gradient(circle, ${hexAlpha(techColor, 0.15)}, ${hexAlpha(techColor, 0.04)})`
                : "radial-gradient(circle, #3fb95018, #3fb95004)",
              border: `3px solid ${isClockedIn ? techColor : "var(--green)"}`,
              color: isClockedIn ? techColor : "var(--green)",
              fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 20, letterSpacing: 1,
              animation: isClockedIn ? "waterGlow 1.6s infinite" : "none",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span style={{ fontSize: 38 }}>{isClockedIn ? "◼" : "▶"}</span>
              {isClockedIn ? "CLOCK OUT" : "CLOCK IN"}
            </button>
          )}

          {submitted && (
            <div style={{
              width: 168, height: 168, borderRadius: "50%",
              background: "#3fb95010", border: "3px solid #3fb95050",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              color: "var(--green)", fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 16,
            }}>
              <span style={{ fontSize: 42 }}>✓</span>SUBMITTED
            </div>
          )}

          {/* Today entries */}
          {techData.days?.[today]?.entries?.length > 0 && (
            <Card style={{ width: "100%" }}>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)" }}>
                <SectionLabel>Today's Entries</SectionLabel>
              </div>
              {techData.days[today].entries.map((e, i, arr) => (
                <div key={i} style={{
                  padding: "10px 14px", display: "flex", justifyContent: "space-between",
                  borderBottom: i < arr.length - 1 ? "1px solid #30363d55" : "none",
                }}>
                  <span style={{ fontSize: 13 }}>
                    <span style={{ color: "var(--green)" }}>{formatTS(e.in)}</span>
                    <span style={{ color: "var(--muted)", margin: "0 8px" }}>→</span>
                    <span style={{ color: e.out ? "var(--red)" : "var(--muted)" }}>{e.out ? formatTS(e.out) : "now"}</span>
                  </span>
                  <span style={{ fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 14, color: "var(--muted)" }}>
                    {e.ms ? formatHM(e.ms) : "—"}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Map toggle */}
        {(isClockedIn || todayGps.length > 0) && (
          <div style={{ padding: "0 16px 12px" }}>
            <button onClick={() => setShowMap(s => !s)} style={{
              width: "100%", padding: 11, borderRadius: "var(--radius)",
              background: "var(--ink2)", border: "1px solid var(--border)",
              color: "var(--muted)", fontFamily: "var(--font-h)", fontWeight: 700,
              fontSize: 13, letterSpacing: 0.5,
            }}>
              {showMap ? "▲ Hide map" : `▼ Today's route${todayGps.length ? ` · ${todayGps.length} pts` : ""}`}
            </button>
            {showMap && (
              <div style={{ marginTop: 8 }}>
                <MapView
                  points={todayGps}
                  livePos={livePos ? { [tech]: livePos } : {}}
                  techColors={{ [tech]: techColor }}
                  height={240}
                />
              </div>
            )}
          </div>
        )}

        <Divider />

        {/* Week grid */}
        <div style={{ padding: "16px" }}>
          <SectionLabel>Week Overview — tap day to flag</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {weekDays.map(d => {
              const ms       = dayMs(d);
              const hrs      = ms / 3_600_000;
              const isToday  = d === today;
              const flagged  = techData.days?.[d]?.flagged;
              const gpsCount = techData.days?.[d]?.gps?.length ?? 0;
              const hasData  = ms > 0;
              return (
                <button key={d} onClick={() => !submitted && onFlag(d)} style={{
                  background: isToday ? hexAlpha(techColor, 0.1) : "var(--ink2)",
                  border: `1px solid ${isToday ? techColor : flagged ? "var(--amber)" : "var(--border)"}`,
                  borderRadius: 10, padding: "9px 4px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  opacity: !hasData && !isToday ? 0.45 : 1,
                }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-h)", fontWeight: 700, letterSpacing: 1, color: isToday ? techColor : "var(--muted)" }}>{DAYS[d]}</span>
                  <div style={{ width: "100%", height: 34, background: "var(--ink3)", borderRadius: 4, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div style={{ height: `${Math.min(100, (hrs/10)*100)}%`, minHeight: hasData ? 3 : 0, background: flagged ? "var(--amber)" : isToday ? techColor : "var(--green)", borderRadius: 4, transition: "height 0.35s ease" }} />
                  </div>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-h)", fontWeight: 700, color: hasData ? "var(--text)" : "var(--muted)" }}>{hasData ? `${hrs.toFixed(1)}h` : "--"}</span>
                  {gpsCount > 0 && <span style={{ fontSize: 9, color: "var(--muted)" }}>📍{gpsCount}</span>}
                  {flagged && <span style={{ fontSize: 10 }}>🚩</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit footer */}
        <div style={{ padding: "14px 16px", background: "var(--ink2)", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-h)", letterSpacing: 1 }}>WEEK TOTAL</div>
              <div style={{ fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 40, letterSpacing: 0.5, color: weekHrs >= 40 ? "var(--amber)" : "var(--text)", lineHeight: 1.1 }}>
                {formatHours(weekTotalMs)}<span style={{ fontSize: 16, color: "var(--muted)", marginLeft: 4 }}>hrs</span>
              </div>
            </div>
            {weekHrs >= 40 && <Badge color="var(--amber)">OT LIKELY</Badge>}
          </div>

          {!submitted ? (
            showConfirm ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: 14, borderRadius: "var(--radius)", background: "var(--ink3)", color: "var(--text)", fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 15 }}>Cancel</button>
                <button onClick={() => { onSubmit(); setShowConfirm(false); }} style={{ flex: 2, padding: 14, borderRadius: "var(--radius)", background: "var(--green)", color: "#fff", fontFamily: "var(--font-h)", fontWeight: 800, fontSize: 17 }}>✓ Confirm Submit</button>
              </div>
            ) : (
              <PrimaryBtn onClick={() => setShowConfirm(true)} disabled={weekTotalMs === 0} color="var(--water)">
                Submit Week →
              </PrimaryBtn>
            )
          ) : (
            <div style={{ padding: 14, borderRadius: "var(--radius)", background: "#3fb95012", border: "1px solid #3fb95040", textAlign: "center", fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 15, color: "var(--green)" }}>
              ✓ Submitted {techData.submittedAt ? new Date(techData.submittedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
            </div>
          )}
        </div>
      </Screen>
    </>
  );
}
