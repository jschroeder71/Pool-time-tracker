import { GlobalStyle, Screen, TopBar, Badge, Avatar, OfflineBanner } from "../components/ui";
import { getWeekKey } from "../utils";

export function HomeScreen({ appData, now, isClockedIn, techColors, online, livePos, techs = [], onSelectTech, onManager }) {
  const wk = getWeekKey();

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

        {/* Date */}
        <div style={{ padding: "14px 16px 6px", fontSize: 12, color: "var(--muted)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · Week of {wk}
        </div>

        {/* Tech list */}
        <div style={{ flex: 1, padding: "6px 16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          {techs.map((tech, i) => {
            const submitted  = appData[wk]?.[tech]?.submitted;
            const hasFlagged = Object.values(appData[wk]?.[tech]?.days ?? {}).some(d => d.flagged);
            const color      = techColors[tech];

            return (
              <button key={tech} onClick={() => onSelectTech(tech)} style={{
                background: "var(--ink2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: "13px 14px",
                display: "flex", alignItems: "center", gap: 12,
                animation: `fadeUp 0.2s ease both`,
                animationDelay: `${i * 0.025}s`,
                width: "100%", textAlign: "left", color: "var(--text)",
              }}>
                <Avatar tech={tech} color={color} clockedIn={false} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: "var(--text)" }}>
                    {tech}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {submitted ? "Week submitted" : "Tap to enter"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {hasFlagged && <span style={{ fontSize: 13 }}>🚩</span>}
                  {submitted && <Badge color="var(--green)">Done</Badge>}
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
