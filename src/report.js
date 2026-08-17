// Turn findings into a grade (A–F), a badge string, and Markdown / JSON reports.

const WEIGHTS = { critical: 40, high: 20, medium: 8, low: 3, info: 0 };

export function grade(findings) {
  const penalty = findings.reduce((s, f) => s + (WEIGHTS[f.severity] ?? 0), 0);
  const score = Math.max(0, 100 - penalty);
  const letter =
    score >= 90 ? "A" :
    score >= 80 ? "B" :
    score >= 70 ? "C" :
    score >= 55 ? "D" : "F";
  return { score, letter };
}

export function badge({ letter, score }) {
  return `MCP Security: ${letter} (${score}/100)`;
}

const ICON = { critical: "🔴", high: "🟠", medium: "🟡", low: "🔵", info: "⚪" };

export function toMarkdown(target, findings, g) {
  const lines = [];
  lines.push(`# MCP Security Report — \`${target}\``);
  lines.push("");
  lines.push(`**Grade: ${g.letter}** (${g.score}/100) · ${findings.length} finding(s)`);
  lines.push("");
  lines.push("> Heuristic scan. A clean report is not a security guarantee. Disclose responsibly.");
  lines.push("");
  const order = ["critical", "high", "medium", "low", "info"];
  for (const sev of order) {
    const group = findings.filter((f) => f.severity === sev);
    if (!group.length) continue;
    lines.push(`## ${ICON[sev]} ${sev.toUpperCase()}`);
    for (const f of group) {
      lines.push(`- **${f.title}**`);
      lines.push(`  - ${f.detail}`);
      if (f.evidence) lines.push(`  - evidence: \`${f.evidence}\``);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function toJson(target, findings, g) {
  return JSON.stringify({ target, grade: g, badge: badge(g), findings }, null, 2);
}
