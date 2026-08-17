// Heuristic security checks over a probed MCP server.
// Each check returns findings: { id, severity, title, detail, evidence? }.
// Severities: "critical" | "high" | "medium" | "low" | "info".
// These are STARTER heuristics — expand them; do not treat clean output as a security guarantee.

const SSRF_HINTS = /\b(fetch|http|https|url|request|curl|webhook|proxy|download|open[_-]?url)\b/i;
const HIGH_PRIV = /\b(exec|shell|command|eval|spawn|subprocess|delete|drop|rm\b|write[_-]?file|sudo)\b/i;
const INJECTION_BAIT = /(ignore (all|previous)|disregard|you must|system prompt|do not tell|exfiltrat)/i;
const SECRET_HINT = /(sk-[a-z0-9]{16,}|AKIA[0-9A-Z]{12,}|ghp_[a-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY)/i;

function toolText(t) {
  return `${t?.name ?? ""} ${t?.description ?? ""} ${JSON.stringify(t?.inputSchema ?? {})}`;
}

export function runChecks(probe) {
  const findings = [];
  const add = (f) => findings.push(f);

  if (!probe.reachable) {
    add({ id: "unreachable", severity: "info", title: `Server not reachable (${probe.transport})`,
      detail: probe.errors.join("; ") || "No response to the MCP initialize handshake." });
    return findings;
  }

  // --- AUTH (HTTP-only; stdio is a local trust boundary, not a network one) ---
  if (probe.transport === "http") {
    if (probe.respondedWithoutAuth) {
      add({ id: "no-auth", severity: "critical",
        title: "Server accepts initialize with no authentication",
        detail: `initialize returned ${probe.initStatus} without any auth header. ~41% of public MCP servers require no auth (BlueRock 2026). Anyone who can reach this endpoint can drive its tools.` });
    } else if (probe.initStatus === 401 || probe.initStatus === 403) {
      add({ id: "auth-present", severity: "info", title: "Auth required",
        detail: `Unauthenticated initialize returned ${probe.initStatus}. Good. Verify it's OAuth, not a shared static key (only 8.5% of servers use OAuth).` });
    }
  } else if (probe.transport === "stdio") {
    add({ id: "stdio-scope", severity: "info", title: "Local (stdio) server — capability review",
      detail: "Auth is out of scope for a local stdio server; the risk is what its tools can do and what secrets it reads from the environment. Findings below focus on tool capabilities." });
  }

  // --- TOOL-SURFACE CHECKS ---
  for (const t of probe.tools) {
    const text = toolText(t);
    if (SSRF_HINTS.test(text)) {
      add({ id: "ssrf-surface", severity: "high",
        title: `Tool "${t.name}" can make outbound requests (SSRF surface)`,
        detail: "Fetch/URL-taking tools are the #1 SSRF vector (36.7% of servers are SSRF-vulnerable). Confirm it blocks internal/link-local addresses and enforces an allowlist.",
        evidence: t.name });
    }
    if (HIGH_PRIV.test(text)) {
      add({ id: "high-privilege-tool", severity: "high",
        title: `Tool "${t.name}" exposes a high-privilege capability`,
        detail: "Exec/shell/delete/write-file style tools should be scoped, confirmable, and off by default.",
        evidence: t.name });
    }
    if (INJECTION_BAIT.test(text)) {
      add({ id: "injection-in-description", severity: "medium",
        title: `Tool "${t.name}" description contains prompt-injection-style text`,
        detail: "Tool descriptions are fed to the model verbatim. Imperative/override phrasing here is an injection vector.",
        evidence: t.name });
    }
    if (SECRET_HINT.test(text)) {
      add({ id: "leaked-secret", severity: "critical",
        title: `Possible secret exposed in tool "${t.name}" metadata`,
        detail: "A token/key-shaped string appears in the tool schema or description.",
        evidence: t.name });
    }
  }

  if (probe.tools.length === 0 && probe.reachable) {
    add({ id: "no-tools-listed", severity: "info", title: "No tools enumerated",
      detail: "tools/list returned nothing — server may gate tools behind auth, a session, or dynamic registration." });
  }

  return findings;
}
