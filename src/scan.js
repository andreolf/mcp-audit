// Orchestrator: probe a target (http or stdio), run checks, grade.
import { probeHttpServer } from "./mcpClient.js";
import { probeStdioServer } from "./stdioClient.js";
import { runChecks } from "./checks.js";
import { grade } from "./report.js";

// `spec` is one of:
//   { transport: "http",  url, headers }
//   { transport: "stdio", command, args, label, timeoutMs }
export async function scan(spec) {
  let probe;
  if (spec.transport === "http") {
    probe = await probeHttpServer(spec.url, spec.headers || {});
  } else if (spec.transport === "stdio") {
    probe = await probeStdioServer(spec.command, spec.args || [], {
      timeoutMs: spec.timeoutMs || 15000,
    });
  } else {
    throw new Error(`unknown transport: ${spec.transport}`);
  }

  const findings = runChecks(probe);
  const g = grade(findings);
  return { target: spec.label || spec.url || probe.url, probe, findings, grade: g };
}
