# Launch post drafts

Fill the `{PLACEHOLDERS}` with real numbers from your own audit run:
`npx @andreolf/mcpaudit@latest ...` → `mcpaudit-fetch --max {N} --out targets.txt` → `mcpaudit-batch targets.txt`.

Rules baked in: aggregate-only (no named servers), "surface" not "exploit", not claiming to be first.

---

## Show HN

**Title:**
`Show HN: mcpaudit – grade any MCP server's security (A–F), and audit the whole registry`

**Body:**
> I kept seeing MCP servers shipped with no auth, so I built mcpaudit — a zero-dependency CLI that
> connects to an MCP server (HTTP, stdio, or npm), inspects its declared tools, and grades it A–F
> on things like missing auth, URL-fetching (SSRF) surface, shell/exec tools, and
> prompt-injection-prone tool descriptions.
>
> The part I found most useful: it can pull the target list straight from the official MCP Registry
> and batch-audit the ecosystem. I scanned {N} servers from the registry — **{PCT}% accept an
> `initialize` handshake with no auth**, {SSRF_PCT}% expose a URL-fetching tool. (Aggregate only;
> I'm not naming servers — reporting specifics privately.)
>
> It's heuristic, not a vulnerability scanner — findings describe *surface*, not proven exploits.
> It only sends a read-only handshake and never runs a scanned server's code unless you opt in with
> `--allow-exec`. Complements deeper single-server tools like Invariant's mcp-scan; the angle here
> is registry-wide measurement.
>
> Try it: `npx @andreolf/mcpaudit <url>`
> Code: https://github.com/andreolf/mcp-audit
>
> Feedback on the checks (false-positive-prone ones especially) very welcome.

---

## X / Twitter (thread)

**1/**
> I scanned {N} MCP servers from the official registry.
> {PCT}% accept connections with **no auth at all**.
> So I open-sourced the scanner: `npx @andreolf/mcpaudit <url>` → an A–F security grade. 🧵

**2/**
> It checks the stuff that actually bites: missing auth, URL-fetching tools (SSRF surface),
> shell/exec tools, and prompt-injection-prone tool descriptions. HTTP, stdio, and npm servers.

**3/**
> Safe by design: it only sends a read-only initialize + tools/list. It never runs a scanned
> server's code unless you pass --allow-exec. Heuristic — it flags *surface*, not proven exploits.

**4/**
> Batch mode pulls targets from the official MCP Registry and grades the ecosystem at once.
> Aggregate stats only — I'm not naming servers publicly; specifics go to maintainers privately.

**5/**
> MIT, zero deps, Node 18+.
> `npx @andreolf/mcpaudit <url>`
> ⭐ / issues: https://github.com/andreolf/mcp-audit

---

## Where to post
- Show HN (aim for a US-morning weekday)
- r/mcp, r/LocalLLaMA
- X/Twitter + LinkedIn
- The MCP / Agentic AI community Discords

## Pre-flight (must be true before posting)
- [ ] 0.1.1 published (usage text correct)
- [ ] `npx @andreolf/mcpaudit@latest <url>` works from a clean machine
- [ ] repo `main` matches npm (PR #3 merged); README + SECURITY.md live
- [ ] real numbers generated; specifics kept private
