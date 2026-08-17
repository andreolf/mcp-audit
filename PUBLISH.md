# Publishing & distribution — mcpaudit

## Honest framing
`mcpaudit` is a **client-side security scanner**, not an MCP server. So the "list your MCP
server" registries (the official MCP Registry, mcp.so server listings) are **not** the right
home — those are for servers you connect to. Distribution for a *tool* is: npm, GitHub, the
curated `awesome-mcp-*` lists (tools/security sections), and a launch post carrying the audit data.

---

## 1. npm publish (primary — this is what makes `npx mcpaudit` work)

Prereqs: you must be logged in (`npm whoami` currently errors → not logged in).

```bash
npm login                      # opens browser auth
npm whoami                     # confirm
cd mcp-audit
npm test                       # 16 checks, must be green
npm pack --dry-run             # confirm contents (bin, src, README, LICENSE — no test/)
npm publish --access public    # name 'mcpaudit' is free; --access public required even unscoped is fine
```

After publish, verify the zero-install path works:
```bash
npx mcpaudit@latest https://api.adside.ai/mcp
```

Version bumps later: `npm version patch|minor` then `npm publish`.

> ⚠️ Publishing is public and largely irreversible (npm unpublish is heavily restricted after 72h).
> Do the `--dry-run` first. This step is yours to run — it needs your npm credentials.

## 2. GitHub polish (5 min, big credibility payoff)

```bash
# add discovery topics
gh repo edit andreolf/mcp-audit --add-topic mcp,security,scanner,ai-agents,llm,ssrf
# tag a release so the repo shows a version
gh release create v0.1.0 --title "mcpaudit v0.1.0" --notes "Security scanner for MCP servers: http/stdio/npm transports, batch audit runner, official-registry fetcher. A–F grades."
```

## 3. Get listed where MCP *tools* live

- **PR to `punkpeye/awesome-mcp-servers`** — it has a Frameworks/Utilities area; add under a
  tools/security bullet. Use the metadata block below verbatim.
- **`appcypher/awesome-mcp-servers`** and other curated lists — same one-line entry.
- **PulseMCP / Glama** — they primarily index servers, but both accept tool/utility submissions;
  submit if their form has a "tools" category. Skip the official MCP Registry (servers only).

## 4. The launch post (where the virality actually comes from)

Generate real data first:
```bash
node bin/mcp-audit-fetch.js --max 300 --out targets.txt
node bin/mcp-audit-batch.js targets.txt --concurrency 8 --out audit.md
```
Then post the **aggregate** numbers (not a named shame-list) to: Show HN, r/mcp, X/Twitter,
LinkedIn. Headline template: *"I scanned N MCP servers from the official registry. X% accept
connections with no auth. Here's `npx mcpaudit`."* Link the repo.

⚠️ **Responsible disclosure before naming names:** the aggregate stat is the story. If you name
specific vulnerable servers publicly, notify them first and give time to fix. Keep the public post
to aggregates + your own tool.

---

## Reusable metadata pack (paste into every submission)

- **Name:** mcpaudit
- **One-liner:** npm audit for MCP servers — grade any server A–F on auth, SSRF, and prompt-injection surface.
- **Install:** `npx mcpaudit <url>`
- **Repo:** https://github.com/andreolf/mcp-audit
- **npm:** https://www.npmjs.com/package/mcpaudit
- **License:** MIT
- **Category:** Security / Tools / Utilities
- **Keywords:** mcp, security, audit, scanner, ssrf, prompt-injection, agents, llm
- **Description (long):** A zero-dependency CLI that audits MCP servers over HTTP, stdio, and npm
  transports. Flags missing auth, SSRF-exploitable tools, shell/exec capabilities, and
  prompt-injection-prone tool descriptions, then grades A–F. Batch mode + an official-registry
  fetcher produce a ranked leaderboard and ecosystem-wide stats.
- **awesome-list one-liner:**
  `- [mcpaudit](https://github.com/andreolf/mcp-audit) - Security scanner that grades MCP servers A–F on auth, SSRF, and prompt-injection surface (http/stdio/npm, batch + registry audit).`
