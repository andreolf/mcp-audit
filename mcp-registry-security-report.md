# MCP Registry Security Snapshot

*An aggregate security review of the servers listed in the official Model Context Protocol
registry. Server names are intentionally omitted — see "Responsible disclosure" below.*

## Method
- **Source:** the official MCP Registry API (`registry.modelcontextprotocol.io`) — the canonical
  catalog, not a third-party directory.
- **Population:** **every** server in the registry exposing an HTTP remote endpoint — a full
  census, not a sample (**6,700** HTTP endpoints).
- **Reachability:** **3,658** responded to a read-only MCP `initialize` handshake
  (55%); 3,042 were unreachable (dead, timed out, or auth-gated) and are
  excluded from the percentages below.
- **What was tested:** a read-only `initialize` + `tools/list` handshake and inspection of the
  *declared* tools. No tool was called; no server's code was executed.
- **Scope note:** this covers **remote/HTTP** MCP servers. Local (stdio) servers — including many
  of the best-known ones — run on your own machine and are out of scope; "no authentication" is not
  a meaningful finding for a local server.
- **Tool:** `mcpaudit` (open source, MIT). `npx @andreolf/mcpaudit <url>`.

## Headline findings (of 3,658 reachable servers)
| Finding | Servers | Share |
|---|---:|---:|
| Accept `initialize` with **no authentication** | 1,866 | **51%** |
| Expose a URL-fetching tool (**SSRF surface**) | 951 | 26% |
| Expose a shell / exec / delete tool | 219 | 6% |
| Ship a tool description with prompt-injection-style text | 73 | 2% |

## Security grade distribution
| Grade | Servers | Share |
|---|---:|---:|
| A (no flagged surface) | 1,791 | 49% |
| B | 3 | 0% |
| D (missing auth) | 889 | 24% |
| F (missing auth + exposed surface) | 975 | 27% |

**51%** of reachable servers (1,864) graded D or F.

## How to read this
These are **heuristics that measure attack _surface_, not proven exploits.** "No auth" means the
server completed a handshake without credentials — anyone who can reach the endpoint can enumerate
and potentially drive its tools. "SSRF surface" means a tool takes a URL / makes outbound requests;
whether it's exploitable depends on the server's own controls. A clean grade is not a guarantee of
security. Grades reflect the state on the scan date and change as servers are updated.

## Responsible disclosure
Individual servers are not named here. Specific findings should be reported privately to each
server's maintainers with time to remediate before any public detail. This snapshot measures the
ecosystem's posture and encourages secure-by-default MCP servers (auth on, scoped tools, no static
keys) — not to single out any project.

## Reproduce it
```bash
npx -p @andreolf/mcpaudit mcpaudit-fetch --max 40000 --out targets.txt
npx -p @andreolf/mcpaudit mcpaudit-batch targets.txt --concurrency 50 --out audit.md
```
