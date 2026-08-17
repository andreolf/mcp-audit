// Batch auditing: scan many MCP servers, rank them, and compute the aggregate
// stats that make the launch post ("X% of servers have no auth").
//
// SAFETY: scanning a stdio/npm server *executes that server's code locally*.
// Mass-running untrusted packages is remote-code-execution exposure, so batch
// mode is HTTP-only unless the caller passes allowExec:true (ideally in a sandbox).
import { scan } from "./scan.js";

// Parse one list line into a scan spec. Supported forms:
//   https://host/mcp                      -> http
//   npm:<package>                         -> stdio via `npx -y <package>`   (needs allowExec)
//   cmd:<command line>                    -> stdio via a local command       (needs allowExec)
// Blank lines and lines starting with # are ignored.
export function parseLine(line) {
  const t = line.trim();
  if (!t || t.startsWith("#")) return null;
  if (/^https?:\/\//.test(t)) return { transport: "http", url: t, label: t };
  if (t.startsWith("npm:")) {
    const pkg = t.slice(4).trim();
    return { transport: "stdio", command: "npx", args: ["-y", pkg], label: `npm:${pkg}`, execRequired: true };
  }
  if (t.startsWith("cmd:")) {
    const parts = t.slice(4).trim().split(/\s+/).filter(Boolean);
    return { transport: "stdio", command: parts[0], args: parts.slice(1), label: t, execRequired: true };
  }
  return { transport: "invalid", label: t, error: `unrecognized target: ${t}` };
}

export function parseList(text) {
  return text.split("\n").map(parseLine).filter(Boolean);
}

// Run an array of thunks with a bounded concurrency pool. No dependencies.
async function pool(items, size, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function runBatch(specs, { concurrency = 5, allowExec = false } = {}) {
  const results = await pool(specs, concurrency, async (spec) => {
    if (spec.transport === "invalid") {
      return { target: spec.label, skipped: true, reason: spec.error };
    }
    if (spec.execRequired && !allowExec) {
      return { target: spec.label, skipped: true, reason: "requires --allow-exec (would run untrusted code locally)" };
    }
    try {
      const r = await scan(spec);
      return {
        target: r.target,
        reachable: r.probe.reachable,
        transport: r.probe.transport,
        grade: r.grade,
        findings: r.findings,
      };
    } catch (err) {
      return { target: spec.label, skipped: true, reason: err.message };
    }
  });
  return results;
}

function has(findings, id) {
  return Array.isArray(findings) && findings.some((f) => f.id === id);
}

// Aggregate stats — these are the numbers for the launch thread.
export function aggregate(results) {
  const scanned = results.filter((r) => !r.skipped);
  const reachable = scanned.filter((r) => r.reachable);
  const httpReach = reachable.filter((r) => r.transport === "http");
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

  const gradeDist = {};
  for (const r of reachable) {
    const l = r.grade?.letter ?? "?";
    gradeDist[l] = (gradeDist[l] || 0) + 1;
  }

  return {
    total: results.length,
    skipped: results.length - scanned.length,
    scanned: scanned.length,
    reachable: reachable.length,
    gradeDist,
    noAuthPct: pct(httpReach.filter((r) => has(r.findings, "no-auth")).length, httpReach.length),
    ssrfPct: pct(reachable.filter((r) => has(r.findings, "ssrf-surface")).length, reachable.length),
    execToolPct: pct(reachable.filter((r) => has(r.findings, "high-privilege-tool")).length, reachable.length),
    injectionPct: pct(reachable.filter((r) => has(r.findings, "injection-in-description")).length, reachable.length),
    httpReachable: httpReach.length,
  };
}

// Worst-first leaderboard (most shareable) + the aggregate block, as Markdown.
export function toLeaderboard(results, agg) {
  const scored = results
    .filter((r) => !r.skipped && r.reachable)
    .sort((a, b) => (a.grade?.score ?? 999) - (b.grade?.score ?? 999));

  const lines = [];
  lines.push(`# MCP Security Audit — ${agg.reachable}/${agg.total} servers scanned`);
  lines.push("");
  lines.push("## Headline numbers");
  lines.push(`- **${agg.noAuthPct}%** of reachable HTTP servers accept \`initialize\` with **no auth** (n=${agg.httpReachable})`);
  lines.push(`- **${agg.ssrfPct}%** expose a URL-fetching tool (SSRF surface)`);
  lines.push(`- **${agg.execToolPct}%** expose a shell/exec/delete tool`);
  lines.push(`- **${agg.injectionPct}%** ship a tool description containing prompt-injection-style text`);
  lines.push(`- grade distribution: ${Object.entries(agg.gradeDist).map(([k, v]) => `${k}:${v}`).join(" · ") || "—"}`);
  if (agg.skipped) lines.push(`- ${agg.skipped} target(s) skipped (unreachable / needed --allow-exec / invalid)`);
  lines.push("");
  lines.push("> Heuristic scan. Grades are not a security guarantee. Disclose responsibly — no public exploit steps for specific unpatched servers.");
  lines.push("");
  lines.push("## Worst offenders");
  lines.push("| Grade | Score | Server | Findings |");
  lines.push("|---|---|---|---|");
  for (const r of scored.slice(0, 25)) {
    const top = (r.findings || []).filter((f) => f.severity === "critical" || f.severity === "high").map((f) => f.id);
    lines.push(`| ${r.grade?.letter ?? "?"} | ${r.grade?.score ?? "?"} | \`${r.target}\` | ${top.join(", ") || "—"} |`);
  }
  return lines.join("\n");
}
