# mcp-audit

**npm audit for MCP servers.** Point it at an MCP server and get a security grade (A–F) covering
missing auth, SSRF surface, high-privilege tools, prompt-injection-prone tool descriptions, and
leaked secrets.

Why this exists (2026 data): of ~7,000 public MCP servers, **41% require no auth, 36.7% are
SSRF-vulnerable, only 8.5% use OAuth**, and 30+ CVEs were filed in a single 60-day window. Count
is saturated (22k+ servers); **quality/security is the differentiator.**

> ⚠️ Heuristic scanner. A clean report is **not** a security guarantee. Scan only servers you're
> authorized to test, and disclose findings responsibly (coordinated, no public exploit steps).

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

Requires Node 18+ (uses global `fetch`). Zero dependencies. Once published: `npx mcp-audit ...`.

Exit codes: `0` clean · `1` critical/high finding · `2` couldn't scan / bad usage. CI-friendly.

## Test

```bash
npm test   # spawns the mock insecure server over stdio and asserts the findings
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
4. **Batch mode + leaderboard** — `mcp-audit --registry pulsemcp --top 200` → a ranked report.
   *That ranked report is the launch artifact:* "We audited the 200 most-installed MCP servers."
5. **Embeddable badge** — `MCP Security: A` shields.io-style badge servers add to their README
   (2026 ranking signal, and free distribution for you).
6. **Registry presence** — list on mcp.so, smithery.ai, glama.ai, PulseMCP, official MCP Registry,
   and PR to punkpeye/awesome-mcp-servers. Prepare one metadata pack, submit to all.

## License
MIT
