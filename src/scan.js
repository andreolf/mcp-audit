// Orchestrator: probe a target, run checks, grade.
import { probeHttpServer } from "./mcpClient.js";
import { runChecks } from "./checks.js";
import { grade } from "./report.js";

export async function scan(target, { headers = {} } = {}) {
  if (!/^https?:\/\//.test(target)) {
    throw new Error(
      `Only http(s) MCP endpoints are supported in this skeleton. Got: ${target}\n` +
      `stdio/npm-package transports are the next thing to implement (see README roadmap).`
    );
  }
  const probe = await probeHttpServer(target, headers);
  const findings = runChecks(probe);
  const g = grade(findings);
  return { target, probe, findings, grade: g };
}
