#!/usr/bin/env node
// mcp-audit <http(s)-url>            scan a remote MCP server
// mcp-audit --npm <package>          scan a published server via `npx -y <package>`
// mcp-audit --cmd "<command line>"   scan a local server started by a command
// flags: --json  --header "K: V" (http)  --timeout <ms> (stdio)
import { scan } from "../src/scan.js";
import { toMarkdown, toJson, badge } from "../src/report.js";

function parseArgs(argv) {
  const a = { spec: null, json: false, headers: {}, timeoutMs: 15000 };
  let url = null, npm = null, cmd = null;
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--npm") npm = argv[++i];
    else if (t === "--cmd") cmd = argv[++i];
    else if (t === "--timeout") a.timeoutMs = parseInt(argv[++i], 10) || a.timeoutMs;
    else if (t === "--header" || t === "-H") {
      const h = argv[++i] ?? "";
      const idx = h.indexOf(":");
      if (idx > 0) a.headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (!t.startsWith("-")) url = t;
  }

  if (npm) {
    a.spec = { transport: "stdio", command: "npx", args: ["-y", npm], label: `npm:${npm}`, timeoutMs: a.timeoutMs };
  } else if (cmd) {
    const parts = cmd.split(/\s+/).filter(Boolean);
    a.spec = { transport: "stdio", command: parts[0], args: parts.slice(1), label: cmd, timeoutMs: a.timeoutMs };
  } else if (url && /^https?:\/\//.test(url)) {
    a.spec = { transport: "http", url, headers: a.headers };
  }
  return a;
}

function usage() {
  console.error(
    "usage:\n" +
    "  mcp-audit <http(s)-url> [--header \"Authorization: Bearer ...\"] [--json]\n" +
    "  mcp-audit --npm <package> [--timeout 20000] [--json]\n" +
    "  mcp-audit --cmd \"node server.js\" [--json]"
  );
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.spec) { usage(); process.exit(2); }

  let result;
  try {
    result = await scan(a.spec);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }

  const { target, findings, grade: g, probe } = result;

  // Unreachable != secure — don't emit a misleading passing grade.
  if (!probe.reachable) {
    if (a.json) console.log(JSON.stringify({ target, reachable: false, grade: null, findings }, null, 2));
    else {
      console.error(`could not scan \`${target}\` — server did not complete the MCP handshake.`);
      if (probe.errors.length) console.error(`  ${probe.errors.join("; ")}`);
    }
    process.exit(2);
  }

  if (a.json) console.log(toJson(target, findings, g));
  else {
    console.log(toMarkdown(target, findings, g));
    console.log(`\n${badge(g)}`);
  }

  const worst = findings.some((f) => f.severity === "critical" || f.severity === "high");
  process.exit(worst ? 1 : 0);
}

main();
