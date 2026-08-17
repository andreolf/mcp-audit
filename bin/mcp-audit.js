#!/usr/bin/env node
// mcp-audit <http(s)-mcp-url> [--json] [--header "Key: Value"]...
import { scan } from "../src/scan.js";
import { toMarkdown, toJson, badge } from "../src/report.js";

function parseArgs(argv) {
  const args = { target: null, json: false, headers: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--header" || a === "-H") {
      const h = argv[++i] ?? "";
      const idx = h.indexOf(":");
      if (idx > 0) args.headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (!a.startsWith("-")) {
      args.target = a;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target) {
    console.error("usage: mcp-audit <http(s)-mcp-url> [--json] [--header \"Authorization: Bearer ...\"]");
    process.exit(2);
  }

  let result;
  try {
    result = await scan(args.target, { headers: args.headers });
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }

  const { target, findings, grade: g } = result;
  if (args.json) {
    console.log(toJson(target, findings, g));
  } else {
    console.log(toMarkdown(target, findings, g));
    console.log(`\n${badge(g)}`);
  }

  // Non-zero exit if anything critical/high — makes it CI-friendly.
  const worst = findings.some((f) => f.severity === "critical" || f.severity === "high");
  process.exit(worst ? 1 : 0);
}

main();
