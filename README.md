# mcp-audit

**npm audit for MCP servers.** Point it at an MCP server and get a security grade (A–F) covering
missing auth, SSRF surface, high-privilege tools, prompt-injection-prone tool descriptions, and
leaked secrets.

Why this exists (2026 data): of ~7,000 public MCP servers, **41% require no auth, 36.7% expose an
SSRF surface, only 8.5% use OAuth**, and 30+ CVEs were filed in a single 60-day window. Server
*count* is saturated (22k+ servers); security posture is not. Other tools (e.g. Invariant's
`mcp-scan`) inspect a single server deeply — mcpaudit adds **registry-wide batch auditing**: point
it at the official MCP Registry and grade the whole ecosystem at once.

```bash
npm i -g @andreolf/mcpaudit    # then: mcpaudit <url>
# or zero-install:  npx @andreolf/mcpaudit <url>
```

**Is it safe to run?** Yes by design: mcpaudit sends only a read-only `initialize` + `tools/list`
handshake and inspects the *declared* tools. It **never executes a scanned server's code** unless
you explicitly pass `--allow-exec` to spawn a local/npm server.

> ⚠️ Heuristic scanner. Findings describe *surface* (e.g. "no auth", "exposes a URL-fetching tool"),
> not proven exploits — a clean report is **not** a security guarantee. Scan only servers you're
> authorized to test, and disclose findings responsibly. See [SECURITY.md](SECURITY.md).

## Usage

Scan a **remote** server (Streamable HTTP):
```bash
node bin/mcp-audit.js https://example.com/mcp
node bin/mcp-audit.js https://example.com/mcp --header "Authorization: Bearer $TOKEN" --json
```

Scan a **published** server (spawned via `npx -y <package>`):
```bash
node bin/mcp-audit.js --npm @modelcontextprotocol/server-filesystem --timeout 20000
```

Scan a **local** server started by a command (stdio):
```bash
node bin/mcp-audit.js --cmd "node my-server.js"
```

Requires Node 18+ (uses global `fetch`). Zero dependencies. Install: `npm i -g @andreolf/mcpaudit` then `mcpaudit <url>` — or `npx @andreolf/mcpaudit <url>`.

Exit codes: `0` clean · `1` critical/high finding · `2` couldn't scan / bad usage. CI-friendly.

## Batch mode (the launch audit)

Scan many servers and get a worst-first leaderboard + the aggregate stats for a launch post:

```bash
node bin/mcp-audit-batch.js targets.txt --out audit.md
```

`targets.txt` is one target per line (`https://…`, `npm:<package>`, or `cmd:<command>`; `#` comments allowed).

> ⚠️ **Safety:** scanning an `npm:`/`cmd:` server *runs that server's code on your machine*. Batch mode
> is **HTTP-only by default** and SKIPS local/npm targets unless you pass `--allow-exec` — do that only
> inside a sandbox/container you trust. Mass-running untrusted packages is remote-code-execution exposure.

Output includes the headline numbers ("X% of reachable HTTP servers accept initialize with no auth")
that become the launch thread.

### The full launch pipeline

Pull targets from the **official MCP Registry** (discovery only — never executes a server), then audit them:

```bash
node bin/mcp-audit-fetch.js --max 300 --out targets.txt   # HTTP remotes = safe to scan
node bin/mcp-audit-batch.js targets.txt --concurrency 8 --out audit.md
```

`mcpaudit-fetch` emits registry HTTP endpoints as scannable lines and npm packages as *commented*
lines (opt in with `--include-npm`, then `--allow-exec` in a sandbox). A real run of the first 30
registry servers found **50% accept `initialize` with no auth** — the kind of number the launch
post is built on.

## Use in CI (GitHub Action)

Gate your MCP server's security on every PR. Start your server, then point the action at it:

```yaml
- name: Start my MCP server
  run: node my-server.js &   # or docker run ..., then wait for it to be ready

- name: Security-audit the MCP server
  uses: andreolf/mcp-audit@v1
  with:
    url: http://localhost:3000/mcp
    fail-on: D                      # fail the job on grade D or worse (default: F)
    # header: "Authorization: Bearer ${{ secrets.MCP_TOKEN }}"   # optional
```

The job prints an A–F grade and the findings, and fails if the grade is at or below `fail-on`.
Nothing is executed on the scanned server — it only sends a read-only handshake.

## Test

```bash
npm test   # spawns the mock insecure server (stdio + batch) and asserts findings — 12 checks
```

## What it checks (starter heuristics — expand these)
- **no-auth** — server accepts `initialize` with no credentials (critical)
- **ssrf-surface** — tools that take URLs / make outbound requests (high)
- **high-privilege-tool** — exec/shell/delete/write-file style tools (high)
- **injection-in-description** — override/injection phrasing in tool descriptions (medium)
- **leaked-secret** — token/key-shaped strings in tool metadata (critical)

## Architecture
```
bin/mcp-audit.js   CLI entry (arg parsing, exit codes for CI)
src/scan.js        orchestrator
src/mcpClient.js   MCP Streamable-HTTP transport: initialize + tools/list
src/checks.js      heuristic security checks -> findings
src/report.js      grading (A–F), badge, Markdown/JSON output
```

## Roadmap (turn this skeleton into the viral thing)
1. ✅ **stdio + npm transports** — scan local (`--cmd`) and published (`--npm`, via npx) servers,
   not just remote URLs. This unlocks scanning the registry's top servers for the launch audit.
   *(PyPI/`uvx` equivalent is a small follow-up.)*
2. **Static-key vs OAuth detection** — inspect the auth challenge / token format.
3. **Deeper SSRF probe** — actually call fetch-style tools against a canary internal URL in a sandbox.
4. ✅ **Batch mode + leaderboard** — `mcpaudit-batch targets.txt` → ranked report + headline stats.
   *That ranked report is the launch artifact:* "We audited the 200 most-installed MCP servers."
5. ✅ **Registry fetcher** (`mcpaudit-fetch`) — pulls HTTP targets from the official MCP Registry
   (discovery only, never executes). npm packages emitted commented-out. `--include-npm` to opt in.
5. **Embeddable badge** — `MCP Security: A` shields.io-style badge servers add to their README
   (2026 ranking signal, and free distribution for you).
6. **Registry presence** — list on mcp.so, smithery.ai, glama.ai, PulseMCP, official MCP Registry,
   and PR to punkpeye/awesome-mcp-servers. Prepare one metadata pack, submit to all.

## License
MIT
