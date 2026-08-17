#!/usr/bin/env node
// mcpaudit-batch <list-file> [--json] [--allow-exec] [--concurrency N] [--out FILE]
//
// <list-file>: one target per line —
//   https://host/mcp        (http, always safe to scan)
//   npm:<package>           (spawns `npx -y <package>` — needs --allow-exec)
//   cmd:<command line>      (spawns a local command — needs --allow-exec)
//
// Emits a worst-first leaderboard + the aggregate stats for a launch post.
import { readFileSync, writeFileSync } from "node:fs";
import { parseList, runBatch, aggregate, toLeaderboard } from "../src/batch.js";

function parseArgs(argv) {
  const a = { file: null, json: false, allowExec: false, concurrency: 5, out: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--allow-exec") a.allowExec = true;
    else if (t === "--concurrency") a.concurrency = parseInt(argv[++i], 10) || a.concurrency;
    else if (t === "--out") a.out = argv[++i];
    else if (!t.startsWith("-")) a.file = t;
  }
  return a;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.file) {
    console.error("usage: mcpaudit-batch <list-file> [--json] [--allow-exec] [--concurrency N] [--out FILE]");
    process.exit(2);
  }

  let specs;
  try {
    specs = parseList(readFileSync(a.file, "utf8"));
  } catch (err) {
    console.error(`error reading ${a.file}: ${err.message}`);
    process.exit(2);
  }

  const needsExec = specs.some((s) => s.execRequired);
  if (needsExec && !a.allowExec) {
    console.error("⚠️  Some targets would execute untrusted code locally (npm:/cmd:). They will be SKIPPED.");
    console.error("    Re-run with --allow-exec ONLY inside a sandbox/container you trust.");
  }

  const results = await runBatch(specs, { concurrency: a.concurrency, allowExec: a.allowExec });
  const agg = aggregate(results);

  if (a.json) {
    const out = JSON.stringify({ aggregate: agg, results }, null, 2);
    if (a.out) writeFileSync(a.out, out); else console.log(out);
  } else {
    const md = toLeaderboard(results, agg);
    if (a.out) { writeFileSync(a.out, md); console.error(`wrote ${a.out}`); }
    else console.log(md);
  }
}

main();
