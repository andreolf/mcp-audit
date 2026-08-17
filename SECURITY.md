# Security & responsible use

## How mcpaudit behaves
- By default mcpaudit sends only a read-only MCP handshake (`initialize` + `tools/list`) over HTTP
  and inspects the **declared** tool metadata. It does not call any tool.
- It **never executes a scanned server's code** unless you explicitly pass `--allow-exec` (which
  spawns a local `cmd:` / npm `npm:` server via `npx`). Run `--allow-exec` only inside a sandbox
  you trust — spawning untrusted packages is remote-code-execution exposure.
- Findings are **heuristics** describing attack *surface* (missing auth, URL-fetching tools, shell
  tools, injection-prone descriptions), not proven vulnerabilities. A clean grade is not a
  guarantee of security.

## Responsible use of results
- Scan only servers you own or are explicitly authorized to test.
- When publishing aggregate findings, **do not name specific vulnerable servers** without first
  contacting their maintainers privately and giving reasonable time to remediate.
- Do not publish exploit steps for specific unpatched servers.

## Reporting a vulnerability in mcpaudit itself
Please open a GitHub security advisory or email the maintainer rather than filing a public issue
with reproduction details. We aim to acknowledge within a few days.

## Scope
mcpaudit is a defensive/auditing tool. It is intended for security review, hardening, and
ecosystem measurement — not for attacking systems you do not control.
