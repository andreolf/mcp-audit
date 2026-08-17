// Pull a scan target list from the OFFICIAL MCP Registry API.
// This is the canonical, ToS-clean discovery source (registry.modelcontextprotocol.io) —
// we use its API rather than scraping a directory.
//
// Design note: HTTP remotes are safe to scan (no local code runs). npm packages require
// executing the server via npx, so they're emitted as COMMENTED lines — you opt in
// explicitly (uncomment + --allow-exec in a sandbox). Discovery never triggers execution.

const DEFAULT_BASE = "https://registry.modelcontextprotocol.io";
const OFFICIAL_META = "io.modelcontextprotocol.registry/official";

// --- pure transform (unit-tested offline) ---
// `entries` is the raw `servers` array from the API. Returns dedup'd targets.
export function serversToTargets(entries, { includeNpm = false } = {}) {
  const httpSet = new Set();
  const npmSet = new Set();

  for (const e of entries) {
    const s = e?.server ?? {};
    const meta = e?._meta?.[OFFICIAL_META] ?? {};
    // Only the latest, active version of each server.
    if (meta.isLatest === false) continue;
    if (meta.status && meta.status !== "active") continue;

    for (const r of s.remotes ?? []) {
      if (typeof r?.url === "string" && /^https?:\/\//.test(r.url)) httpSet.add(r.url);
    }
    if (includeNpm) {
      for (const p of s.packages ?? []) {
        if (p?.registryType === "npm" && p?.identifier) npmSet.add(p.identifier);
      }
    }
  }

  const http = [...httpSet].sort();
  const npm = [...npmSet].sort();
  return { http, npm, text: toTargetsText(http, npm, includeNpm) };
}

export function toTargetsText(http, npm, includeNpm) {
  const lines = [];
  lines.push("# Generated from the official MCP Registry (registry.modelcontextprotocol.io).");
  lines.push("# HTTP remotes are safe to scan (no local code runs).");
  lines.push(`# ${http.length} HTTP target(s)${includeNpm ? `, ${npm.length} npm package(s) (commented — need --allow-exec)` : ""}.`);
  lines.push("");
  for (const u of http) lines.push(u);
  if (includeNpm && npm.length) {
    lines.push("");
    lines.push("# --- npm packages: uncomment to scan, ONLY with --allow-exec inside a sandbox ---");
    for (const id of npm) lines.push(`# npm:${id}`);
  }
  return lines.join("\n") + "\n";
}

// --- network (kept out of unit tests) ---
export async function fetchAllServers({ max = 500, pageLimit = 100, base = DEFAULT_BASE, log = () => {} } = {}) {
  const out = [];
  let cursor = null;
  while (out.length < max) {
    const url = new URL("/v0/servers", base);
    url.searchParams.set("limit", String(pageLimit));
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`registry returned HTTP ${res.status}`);
    const data = await res.json();

    const page = data.servers ?? [];
    out.push(...page);
    log(`fetched ${out.length} entries...`);

    cursor = data.metadata?.nextCursor ?? null;
    if (!cursor || page.length === 0) break;
  }
  return out.slice(0, max);
}
