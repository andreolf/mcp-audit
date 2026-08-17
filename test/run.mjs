// Minimal zero-dependency test runner. Exercises the stdio transport end-to-end
// against the mock insecure server, plus the unreachable-http path.
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseList, runBatch, aggregate } from "../src/batch.js";
import { serversToTargets } from "../src/registry.js";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "..", "bin", "mcp-audit.js");
const mock = join(here, "mock-mcp-server.js");

function run(args) {
  return new Promise((resolve) => {
    execFile("node", [cli, ...args], (err, stdout, stderr) => {
      resolve({ code: err?.code ?? 0, stdout, stderr });
    });
  });
}

let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
};

// 1) stdio scan of the mock insecure server
const a = await run(["--cmd", `node ${mock}`, "--json"]);
let parsed = null;
try { parsed = JSON.parse(a.stdout); } catch { /* leave null */ }
check("stdio: exits 1 (high/critical present)", a.code === 1);
check("stdio: grade is F", parsed?.grade?.letter === "F");
check("stdio: flags SSRF tool", !!parsed?.findings?.some((f) => f.id === "ssrf-surface"));
check("stdio: flags exec tool", !!parsed?.findings?.some((f) => f.id === "high-privilege-tool"));
check("stdio: flags injection in description", !!parsed?.findings?.some((f) => f.id === "injection-in-description"));

// 2) unreachable http -> not scanned (exit 2), not a passing grade
const b = await run(["http://127.0.0.1:59999/mcp", "--timeout", "2000"]);
check("http unreachable: exits 2 (not scanned)", b.code === 2);

// 3) no args -> usage (exit 2)
const c = await run([]);
check("no args: exits 2 (usage)", c.code === 2);

// 4) batch: safe-by-default skips exec targets unless --allow-exec
const list = `cmd:node ${mock}\nhttp://127.0.0.1:59999/mcp\n# a comment\nnot-a-valid-target`;
const specs = parseList(list);
check("batch: parses 3 targets (comment ignored)", specs.length === 3);

const safe = await runBatch(specs, { concurrency: 3, allowExec: false });
check("batch: skips exec target without --allow-exec", safe.find((r) => r.target.startsWith("cmd:"))?.skipped === true);

const exec = await runBatch(specs, { concurrency: 3, allowExec: true });
const mockRes = exec.find((r) => (r.target || "").includes("mock-mcp-server"));
check("batch: with --allow-exec, scans the mock server", mockRes?.reachable === true);
check("batch: mock server graded F", mockRes?.grade?.letter === "F");
const agg = aggregate(exec);
check("batch: aggregate computes exec-tool %", agg.execToolPct === 100);

// 5) registry transform (offline, real API shape)
const sample = [
  { server: { name: "a", remotes: [{ type: "streamable-http", url: "https://a.example/mcp" }] },
    _meta: { "io.modelcontextprotocol.registry/official": { status: "active", isLatest: true } } },
  { server: { name: "a", remotes: [{ type: "streamable-http", url: "https://a.example/old" }] },
    _meta: { "io.modelcontextprotocol.registry/official": { status: "active", isLatest: false } } }, // old version -> dropped
  { server: { name: "b", remotes: [{ type: "streamable-http", url: "https://a.example/mcp" }] }, // dup url -> deduped
    _meta: { "io.modelcontextprotocol.registry/official": { status: "active", isLatest: true } } },
  { server: { name: "c", packages: [{ registryType: "npm", identifier: "c-mcp" }] },
    _meta: { "io.modelcontextprotocol.registry/official": { status: "active", isLatest: true } } },
];
const t1 = serversToTargets(sample, { includeNpm: false });
check("registry: extracts + dedups http remotes, drops old versions", t1.http.length === 1 && t1.http[0] === "https://a.example/mcp");
check("registry: excludes npm by default", t1.npm.length === 0);
const t2 = serversToTargets(sample, { includeNpm: true });
check("registry: --include-npm surfaces npm packages", t2.npm.includes("c-mcp"));
check("registry: npm lines are commented out (no execution by default)", /# npm:c-mcp/.test(t2.text));

console.log(failures ? `\n${failures} test(s) failed` : "\nall tests passed");
process.exit(failures ? 1 : 0);
