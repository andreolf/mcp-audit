// MCP client over the stdio transport (newline-delimited JSON-RPC).
// Covers local commands AND published packages (via `npx -y <pkg>`).
// Zero dependencies — Node built-ins only.

import { spawn } from "node:child_process";

const PROTOCOL_VERSION = "2025-06-18";

export async function probeStdioServer(command, args = [], { timeoutMs = 15000, env = process.env } = {}) {
  const result = {
    url: [command, ...args].join(" "),
    transport: "stdio",
    reachable: false,
    initStatus: null,
    respondedWithoutAuth: false, // not applicable to stdio; kept for a uniform shape
    serverInfo: null,
    tools: [],
    errors: [],
  };

  return await new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, { env, stdio: ["pipe", "pipe", "pipe"] });
    } catch (err) {
      result.errors.push(`spawn failed: ${err.message}`);
      return resolve(result);
    }

    let buf = "";
    let stderr = "";
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { child.kill("SIGTERM"); } catch { /* already gone */ }
      if (!result.reachable && stderr.trim() && result.errors.length === 0) {
        result.errors.push(stderr.slice(0, 500).trim());
      }
      resolve(result);
    };

    const send = (obj) => {
      try { child.stdin.write(JSON.stringify(obj) + "\n"); } catch { /* pipe closed */ }
    };

    const handle = (msg) => {
      if (msg.id === 1 && msg.result) {
        result.reachable = true;
        result.initStatus = "initialized";
        result.serverInfo = msg.result.serverInfo ?? null;
        send({ jsonrpc: "2.0", method: "notifications/initialized" });
        send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
      } else if (msg.id === 1 && msg.error) {
        result.errors.push(`initialize error: ${JSON.stringify(msg.error)}`);
        finish();
      } else if (msg.id === 2) {
        result.tools = msg.result?.tools ?? [];
        finish();
      }
    };

    child.stdout.on("data", (d) => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; } // ignore non-JSON log noise
        handle(msg);
      }
    });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => { result.errors.push(err.message); finish(); });
    child.on("exit", () => finish());

    const timer = setTimeout(() => {
      result.errors.push(`timeout after ${timeoutMs}ms waiting for the MCP handshake`);
      finish();
    }, timeoutMs);

    // Kick off the handshake.
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "mcp-audit", version: "0.1.0" },
      },
    });
  });
}
