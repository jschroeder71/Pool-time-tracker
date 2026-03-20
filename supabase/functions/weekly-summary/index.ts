// Supabase Edge Function — weekly-summary
// Sends a formatted weekly timesheet email to each tech (and a summary to the manager).
// Schedule via Supabase Cron: 0 8 * * 1  (every Monday at 8am UTC)
//
// Required environment variables (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY   — from resend.com (free tier: 3,000 emails/month)
//   MANAGER_EMAIL    — email address for the manager summary
//   FROM_EMAIL       — verified sender address (e.g. noreply@glisteningwater.com)
//
// Tech emails are stored in the `techs` table (added by the Admin screen feature).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtMs(ms: number): string {
  if (!ms) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getLastWeekKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const y = d.getFullYear();
  const jan1 = new Date(y, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

async function sendEmail(to: string, subject: string, html: string, apiKey: string, from: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Email to ${to} failed:`, err);
  }
}

function techEmailHtml(tech: string, weekKey: string, entries: any[], totalMs: number): string {
  const rows = entries.map(e => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #30363d">${DAYS[e.day_index] ?? e.day_index}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #30363d">${e.entry_in ? new Date(e.entry_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #30363d">${e.entry_out ? new Date(e.entry_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Still clocked in"}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #30363d">${fmtMs(e.duration_ms)}</td>
    </tr>`).join("");

  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0d1117;color:#e6edf3;border-radius:12px;overflow:hidden">
    <div style="background:#161b22;padding:24px;border-bottom:2px solid #38bdf8;text-align:center">
      <h1 style="margin:0;font-size:22px;color:#38bdf8">Glistening Water Pool Services</h1>
      <p style="margin:6px 0 0;color:#8b949e;font-size:14px">Weekly Time Summary — ${weekKey}</p>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px;font-size:16px">Hi <strong>${tech.split(" ")[0]}</strong>, here's your time summary for last week.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#21262d">
            <th style="padding:8px 12px;text-align:left;color:#8b949e">Day</th>
            <th style="padding:8px 12px;text-align:left;color:#8b949e">Clock In</th>
            <th style="padding:8px 12px;text-align:left;color:#8b949e">Clock Out</th>
            <th style="padding:8px 12px;text-align:left;color:#8b949e">Duration</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:20px;padding:14px;background:#161b22;border-radius:8px;border:1px solid #30363d">
        <strong style="color:#38bdf8">Total Hours: ${fmtMs(totalMs)}</strong>
      </div>
    </div>
    <div style="padding:12px 24px;text-align:center;font-size:11px;color:#8b949e;border-top:1px solid #30363d">
      © 2026 Glistening Water Pool Services. Created by John Schroeder. All rights reserved.
    </div>
  </div>`;
}

function managerSummaryHtml(weekKey: string, summaries: { tech: string; totalMs: number; submitted: boolean }[]): string {
  const rows = summaries
    .sort((a, b) => b.totalMs - a.totalMs)
    .map(s => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #30363d">${s.tech}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #30363d">${fmtMs(s.totalMs)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #30363d">${s.submitted ? "✅ Submitted" : "⏳ Pending"}</td>
      </tr>`).join("");

  const grandTotal = summaries.reduce((sum, s) => sum + s.totalMs, 0);

  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0d1117;color:#e6edf3;border-radius:12px;overflow:hidden">
    <div style="background:#161b22;padding:24px;border-bottom:2px solid #38bdf8;text-align:center">
      <h1 style="margin:0;font-size:22px;color:#38bdf8">Glistening Water Pool Services</h1>
      <p style="margin:6px 0 0;color:#8b949e;font-size:14px">Manager Summary — ${weekKey}</p>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#21262d">
            <th style="padding:8px 12px;text-align:left;color:#8b949e">Technician</th>
            <th style="padding:8px 12px;text-align:left;color:#8b949e">Total Hours</th>
            <th style="padding:8px 12px;text-align:left;color:#8b949e">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:20px;padding:14px;background:#161b22;border-radius:8px;border:1px solid #30363d">
        <strong style="color:#38bdf8">All Techs Total: ${fmtMs(grandTotal)}</strong>
      </div>
    </div>
    <div style="padding:12px 24px;text-align:center;font-size:11px;color:#8b949e;border-top:1px solid #30363d">
      © 2026 Glistening Water Pool Services. Created by John Schroeder. All rights reserved.
    </div>
  </div>`;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
  const MANAGER_EMAIL  = Deno.env.get("MANAGER_EMAIL")!;
  const FROM_EMAIL     = Deno.env.get("FROM_EMAIL")!;
  const weekKey        = getLastWeekKey();

  // Load all techs with emails from the techs table
  const { data: techs, error: techErr } = await supabase
    .from("techs")
    .select("name, email")
    .eq("active", true);

  if (techErr || !techs?.length) {
    return new Response(JSON.stringify({ error: techErr?.message ?? "No techs found" }), { status: 500 });
  }

  const summaries: { tech: string; totalMs: number; submitted: boolean }[] = [];

  for (const tech of techs) {
    // Fetch time entries for this tech this week
    const { data: entries } = await supabase
      .from("time_entries")
      .select("day_index, entry_in, entry_out, duration_ms")
      .eq("tech", tech.name)
      .eq("week_key", weekKey)
      .order("day_index");

    const { data: sub } = await supabase
      .from("week_submissions")
      .select("submitted_at")
      .eq("tech", tech.name)
      .eq("week_key", weekKey)
      .maybeSingle();

    const totalMs = (entries ?? []).reduce((sum: number, e: any) => sum + (e.duration_ms ?? 0), 0);
    summaries.push({ tech: tech.name, totalMs, submitted: !!sub });

    if (tech.email && entries?.length) {
      await sendEmail(
        tech.email,
        `Your time summary for ${weekKey} — Glistening Water`,
        techEmailHtml(tech.name, weekKey, entries, totalMs),
        RESEND_API_KEY,
        FROM_EMAIL
      );
    }
  }

  // Send manager summary
  await sendEmail(
    MANAGER_EMAIL,
    `Team time summary for ${weekKey} — Glistening Water`,
    managerSummaryHtml(weekKey, summaries),
    RESEND_API_KEY,
    FROM_EMAIL
  );

  return new Response(JSON.stringify({ ok: true, week: weekKey, sent: techs.length + 1 }), {
    headers: { "Content-Type": "application/json" },
  });
});
