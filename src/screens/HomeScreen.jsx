import { GlobalStyle, Screen, TopBar, LiveDot, Badge, Avatar, OfflineBanner } from "../components/ui";
import { getWeekKey } from "../utils";

export function HomeScreen({ appData, now, isClockedIn, techColors, online, livePos, techs = [], onSelectTech, onManager }) {
  const wk      = getWeekKey();
  const clocked = techs.filter(isClockedIn);

  return (
    <>
      <GlobalStyle />
      <Screen>
        <TopBar
          center={<img src="/logo.jpg" alt="Glistening Water Pool Services" style={{ height: 36, objectFit: "contain" }} />}
          right={
            <button onClick={onManager} style={{
              background: "var(--ink3)", border: "1px solid var(--border)",
              color: "var(--muted)", borderRadius: 8, padding: "7px 12px",
              fontSize: 12, fontFamily: "var(--font-h)", fontWeight: 700, letterSpacing: 1,
            }}>MGR ▸</button>
          }
        />

        {!online && <OfflineBanner />}

        {/* Live bar */}
        {clocked.length > 0 && (
          <div style={{
            background: "#3fb95012", borderBottom: "1px solid #3fb95030",
            padding: "9px 16px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <LiveDot />
            <span style={{ fontSize: 13, color: "var(--green)", fontFamily: "var(--font-h)", fontWeight: 700, letterSpacing: 0.5 }}>
              {clocked.length} tech{clocked.length > 1 ? "s" : ""} on the clock
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
              {clocked.slice(0, 3).map(t => t.split(" ")[0]).join(", ")}{clocked.length > 3 ? ` +${clocked.length - 3}` : ""}
            </span>
          </div>
        )}

        {/* Date */}
        <div style={{ padding: "14px 16px 6px", fontSize: 12, color: "var(--muted)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · Week of {wk}
        </div>

        {/* Tech list */}
        <div style={{ flex: 1, padding: "6px 16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          {techs.map((tech, i) => {
            const clockedIn  = isClockedIn(tech);
            const submitted  = appData[wk]?.[tech]?.submitted;
            const hasFlagged = Object.values(appData[wk]?.[tech]?.days ?? {}).some(d => d.flagged);
            const color      = techColors[tech];
            const hasLive    = !!livePos[tech];

            return (
              <button key={tech} onClick={() => onSelectTech(tech)} style={{
                background: clockedIn ? "#3fb95010" : "var(--ink2)",
                border: `1px solid ${clockedIn ? "#3fb95050" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: "13px 14px",
                display: "flex", alignItems: "center", gap: 12,
                animation: `fadeUp 0.2s ease both`,
                animationDelay: `${i * 0.025}s`,
                width: "100%", textAlign: "left", color: "var(--text)",
              }}>
                <Avatar tech={tech} color={color} clockedIn={clockedIn} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: "var(--text)", display: "flex", alignItems: "center", gap: 7 }}>
                    {tech}
                    {hasLive && <LiveDot size={7} />}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {clockedIn ? "On the clock" : submitted ? "Week submitted" : "Tap to enter"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {hasFlagged && <span style={{ fontSize: 13 }}>🚩</span>}
                  {submitted && <Badge color="var(--green)">Done</Badge>}
                  {clockedIn && <span style={{ fontSize: 17, animation: "pulse 1.2s ease infinite" }}>⏱</span>}
                  <span style={{ color: "var(--muted)", fontSize: 16 }}>›</span>
                </div>
              </button>
            );
          })}
        </div>
      </Screen>
    </>
  );
}
