#!/usr/bin/env node
// mcpaudit-fetch [--max N] [--out FILE] [--include-npm]
// Pulls a scan target list from the official MCP Registry and writes a targets file.
// Discovery only — never executes any server.
import { writeFileSync } from "node:fs";
import { fetchAllServers, serversToTargets } from "../src/registry.js";

function parseArgs(argv) {
  const a = { max: 500, out: null, includeNpm: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--max") a.max = parseInt(argv[++i], 10) || a.max;
    else if (t === "--out") a.out = argv[++i];
    else if (t === "--include-npm") a.includeNpm = true;
  }
  return a;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  let entries;
  try {
    entries = await fetchAllServers({ max: a.max, log: (m) => process.stderr.write(m + "\r") });
    process.stderr.write("\n");
  } catch (err) {
    console.error(`error fetching registry: ${err.message}`);
    process.exit(1);
  }

  const { http, npm, text } = serversToTargets(entries, { includeNpm: a.includeNpm });
  process.stderr.write(`${http.length} HTTP targets${a.includeNpm ? `, ${npm.length} npm packages` : ""} from ${entries.length} registry entries.\n`);

  if (a.out) { writeFileSync(a.out, text); process.stderr.write(`wrote ${a.out}\n`); }
  else process.stdout.write(text);
}

main();
