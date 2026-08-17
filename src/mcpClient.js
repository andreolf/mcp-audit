// Minimal MCP client over the Streamable HTTP transport.
// Skeleton: implements initialize + tools/list. stdio / npm-package transports are TODO.
// Zero dependencies — relies on Node 18+ global fetch.

const PROTOCOL_VERSION = "2025-06-18";

async function rpc(url, headers, body, timeoutMs = 12000) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // MCP streamable-HTTP servers may reply with JSON or an SSE stream.
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
    // Don't let an unresponsive server hang a batch run.
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  let json = null;

  // Try plain JSON first, then fall back to parsing the first SSE `data:` frame.
  try {
    json = JSON.parse(text);
  } catch {
    const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
    if (dataLine) {
      try {
        json = JSON.parse(dataLine.slice(5).trim());
      } catch {
        /* leave json null */
      }
    }
  }

  return { status: res.status, headers: res.headers, json, raw: text };
}

// Connect to a remote MCP server and return everything the checks need.
// `authHeaders` is whatever the user passed via --header (may be empty → tests the no-auth path).
export async function probeHttpServer(url, authHeaders = {}) {
  const result = {
    url,
    transport: "http",
    reachable: false,
    initStatus: null,
    respondedWithoutAuth: false,
    serverInfo: null,
    tools: [],
    errors: [],
  };

  const initBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "mcp-audit", version: "0.1.0" },
    },
  };

  try {
    // 1) Probe WITHOUT auth first — this is the core security signal.
    const noAuth = await rpc(url, {}, initBody);
    result.reachable = true;
    result.initStatus = noAuth.status;
    if (noAuth.status < 400 && noAuth.json?.result) {
      result.respondedWithoutAuth = true;
      result.serverInfo = noAuth.json.result.serverInfo ?? null;
    }

    // 2) Re-run with any provided auth to enumerate tools.
    const authed = await rpc(url, authHeaders, initBody);
    if (authed.json?.result?.serverInfo) {
      result.serverInfo = authed.json.result.serverInfo;
    }

    const listed = await rpc(url, authHeaders, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });
    result.tools = listed.json?.result?.tools ?? [];
  } catch (err) {
    result.errors.push(String(err?.message ?? err));
  }

  return result;
}
