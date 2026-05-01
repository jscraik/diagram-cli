const fs = require('fs');
const path = require('path');
const { summarizeAnalysis } = require('../artifacts/evidence-summary');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function attr(value) {
  return escapeHtml(value);
}

function riskLevel(prImpact) {
  return prImpact?.risk?.level || 'unknown';
}

function statusLabel(status) {
  return String(status || 'unknown').replace(/_/g, ' ');
}

function hrefForArtifact(manifest, artifactPath) {
  const outputDirectory = String(manifest.outputDirectory || '.');
  const normalized = String(artifactPath || '');
  if (outputDirectory === '.') return normalized;
  const prefix = `${outputDirectory}/`;
  return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
}

function componentRows(components) {
  const rows = [...(components || [])]
    .sort((left, right) => String(left.filePath || left.name).localeCompare(String(right.filePath || right.name)))
    .slice(0, 20)
    .map((component) => `
        <tr>
          <td>${escapeHtml(component.name || component.originalName || 'unknown')}</td>
          <td>${escapeHtml(component.type || 'unknown')}</td>
          <td>${escapeHtml(component.language || 'unknown')}</td>
          <td>${escapeHtml(component.filePath || 'unknown')}</td>
        </tr>`);
  if (rows.length === 0) {
    return '<tr><td colspan="4">No components detected.</td></tr>';
  }
  return rows.join('\n');
}

function dependencyRows(components) {
  const rows = [...(components || [])]
    .filter((component) => Array.isArray(component.dependencies) && component.dependencies.length > 0)
    .sort((left, right) => String(left.name).localeCompare(String(right.name)))
    .slice(0, 20)
    .map((component) => `
        <tr>
          <td>${escapeHtml(component.name || 'unknown')}</td>
          <td>${escapeHtml(component.dependencies.join(', '))}</td>
        </tr>`);
  if (rows.length === 0) {
    return '<tr><td colspan="2">No internal dependency links detected.</td></tr>';
  }
  return rows.join('\n');
}

function artifactPathCell(manifest, entry) {
  if (entry.status !== 'written') {
    return escapeHtml(entry.path);
  }
  return `<a href="${attr(hrefForArtifact(manifest, entry.path))}">${escapeHtml(entry.path)}</a>`;
}

function artifactRows(manifest) {
  return manifest.artifacts.map((entry) => `
        <tr>
          <td>${artifactPathCell(manifest, entry)}</td>
          <td><span class="status status-${attr(entry.status)}">${escapeHtml(statusLabel(entry.status))}</span></td>
          <td>${escapeHtml(entry.role)}</td>
          <td>${escapeHtml(entry.reason || entry.errorCategory || 'ready')}</td>
        </tr>`).join('\n');
}

function readOrderItems(manifest) {
  return manifest.artifactReadOrder
    .map((entry) => `<li><a href="${attr(hrefForArtifact(manifest, entry))}">${escapeHtml(entry)}</a></li>`)
    .join('\n');
}

function artifactById(manifest, id) {
  return manifest.artifacts.find((entry) => entry.id === id) || null;
}

function reviewerChecks(prImpact) {
  const checks = prImpact?.agentSummary?.suggestedReviewerChecks || [];
  if (checks.length === 0) {
    return '<li>Run PR scan mode with <code>--base</code> and <code>--head</code> to populate reviewer checks.</li>';
  }
  return checks.map((check) => `<li>${escapeHtml(check)}</li>`).join('\n');
}

function riskReasons(prImpact) {
  const reasons = prImpact?.agentSummary?.riskReasons || [];
  if (reasons.length === 0) {
    return '<li>No PR risk reasons recorded.</li>';
  }
  return reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('\n');
}

function buildArchitectureReportHtml({
  manifest,
  analysis,
  prImpact = null,
  warnings = [],
  errors = [],
}) {
  const summary = summarizeAnalysis(analysis);
  const mode = prImpact ? 'PR scan' : 'Repository scan';
  const risk = riskLevel(prImpact);
  const artifactStatus = manifest.artifacts.some((entry) => entry.status === 'failed') ? 'partial' : 'complete';
  const architecturePath = artifactById(manifest, 'architecture')?.path || 'architecture.mmd';
  const prImpactArtifact = artifactById(manifest, 'pr-impact');
  const prImpactPath = prImpactArtifact?.path || 'pr-impact/pr-impact.json';
  const prImpactMarkup = prImpactArtifact?.status === 'written'
    ? `<a href="${attr(hrefForArtifact(manifest, prImpactPath))}">${escapeHtml(prImpactPath)}</a>`
    : `${escapeHtml(prImpactPath)} (${escapeHtml(statusLabel(prImpactArtifact?.status || 'deferred'))})`;
  const warningItems = warnings.length === 0
    ? '<li>No warnings recorded.</li>'
    : warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('\n');
  const errorItems = errors.length === 0
    ? '<li>No errors recorded.</li>'
    : errors.map((error) => `<li>${escapeHtml(error.category)}: ${escapeHtml(error.message)}</li>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Archscope Evidence Report</title>
  <style>
    :root { color-scheme: light; --ink: #172026; --muted: #58626b; --line: #d8dee4; --panel: #f6f8fa; --accent: #0b6bcb; --good: #176f3d; --warn: #9a5b00; --bad: #a91d3a; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; }
    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 48px; }
    header { border-bottom: 1px solid var(--line); padding-bottom: 18px; margin-bottom: 24px; }
    h1 { font-size: 2rem; line-height: 1.15; margin: 0 0 12px; letter-spacing: 0; }
    h2 { font-size: 1.25rem; margin: 0 0 12px; letter-spacing: 0; }
    h3 { font-size: 1rem; margin: 0 0 8px; letter-spacing: 0; }
    section { padding: 18px 0; border-bottom: 1px solid var(--line); }
    .summary-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
    .metric { border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: var(--panel); min-width: 0; }
    .metric strong { display: block; font-size: 1.35rem; line-height: 1.2; overflow-wrap: anywhere; }
    .metric span, .muted { color: var(--muted); }
    .badge, .status { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 8px; font-size: 0.85rem; font-weight: 650; border: 1px solid var(--line); }
    .risk-low, .status-written { color: var(--good); border-color: #9bd2b1; background: #effaf3; }
    .risk-medium, .status-partial, .status-deferred { color: var(--warn); border-color: #e6bf78; background: #fff8e8; }
    .risk-high, .status-failed { color: var(--bad); border-color: #ef9fb0; background: #fff0f3; }
    table { width: 100%; border-collapse: collapse; display: block; overflow-x: auto; }
    th, td { border-bottom: 1px solid var(--line); padding: 8px; text-align: left; vertical-align: top; }
    th { background: var(--panel); font-weight: 700; }
    a { color: var(--accent); }
    a:focus-visible { outline: 3px solid #7db7ff; outline-offset: 2px; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
    .columns { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    @media (max-width: 520px) {
      main { width: min(100% - 20px, 1120px); padding-top: 18px; }
      h1 { font-size: 1.55rem; }
      th, td { padding: 7px 6px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="muted">Generated by archscope scan</p>
      <h1>Archscope Evidence Report</h1>
      <div class="summary-grid" aria-label="Evidence summary">
        <div class="metric"><strong>${escapeHtml(mode)}</strong><span>Mode</span></div>
        <div class="metric"><strong>${escapeHtml(summary.componentCount)}</strong><span>Components</span></div>
        <div class="metric"><strong>${escapeHtml(summary.totalFilesFound)}</strong><span>Files considered</span></div>
        <div class="metric"><strong><span class="badge risk-${attr(risk)}">${escapeHtml(risk)}</span></strong><span>Risk</span></div>
      </div>
    </header>

    <section aria-labelledby="evidence-status">
      <h2 id="evidence-status">Evidence Status</h2>
      <p>Status is <strong>${escapeHtml(artifactStatus)}</strong>. Read the manifest first, then consume artifacts in the listed order.</p>
      <ol>
        ${readOrderItems(manifest)}
      </ol>
    </section>

    <section aria-labelledby="risk-review">
      <h2 id="risk-review">Risk And Review Focus</h2>
      <div class="columns">
        <div>
          <h3>Risk Reasons</h3>
          <ul>${riskReasons(prImpact)}</ul>
        </div>
        <div>
          <h3>Reviewer Checks</h3>
          <ul>${reviewerChecks(prImpact)}</ul>
        </div>
      </div>
    </section>

    <section aria-labelledby="components">
      <h2 id="components">Architecture Components</h2>
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Language</th><th>Path</th></tr></thead>
        <tbody>${componentRows(analysis.components)}</tbody>
      </table>
    </section>

    <section aria-labelledby="dependencies">
      <h2 id="dependencies">Dependency Neighborhood</h2>
      <table>
        <thead><tr><th>Component</th><th>Internal dependencies</th></tr></thead>
        <tbody>${dependencyRows(analysis.components)}</tbody>
      </table>
    </section>

    <section aria-labelledby="diagrams">
      <h2 id="diagrams">Diagrams</h2>
      <p><a href="${attr(hrefForArtifact(manifest, architecturePath))}">${escapeHtml(architecturePath)}</a></p>
      <pre aria-label="Architecture diagram summary">Architecture diagram is stored as Mermaid source. Open the linked artifact to inspect or render it.</pre>
    </section>

    <section aria-labelledby="validation">
      <h2 id="validation">Validation And Evidence</h2>
      <p>Validation status: <strong>${escapeHtml(manifest.validation.status)}</strong>. ${escapeHtml(manifest.validation.summary)}</p>
      <div class="columns">
        <div><h3>Warnings</h3><ul>${warningItems}</ul></div>
        <div><h3>Errors</h3><ul>${errorItems}</ul></div>
      </div>
    </section>

    <section aria-labelledby="agent-handoff">
      <h2 id="agent-handoff">Agent Handoff</h2>
      <p>Agents should read <a href="${attr(hrefForArtifact(manifest, manifest.artifactReadOrder[0]))}">${escapeHtml(manifest.artifactReadOrder[0])}</a> before optional artifacts, then use <a href="${attr(hrefForArtifact(manifest, manifest.primaryAgentArtifact))}">${escapeHtml(manifest.primaryAgentArtifact)}</a> as the parser-safe context.</p>
    </section>

    <section aria-labelledby="raw-artifacts">
      <h2 id="raw-artifacts">Raw Artifacts</h2>
      <table>
        <thead><tr><th>Artifact</th><th>Status</th><th>Role</th><th>Note</th></tr></thead>
        <tbody>${artifactRows(manifest)}</tbody>
      </table>
      <p>PR impact: ${prImpactMarkup}</p>
    </section>
  </main>
</body>
</html>
`;
}

function writeArchitectureReport(filePath, input) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const content = buildArchitectureReportHtml(input);
  fs.writeFileSync(filePath, content);
  return {
    path: filePath,
    bytes: Buffer.byteLength(content, 'utf8'),
  };
}

module.exports = {
  buildArchitectureReportHtml,
  escapeHtml,
  hrefForArtifact,
  writeArchitectureReport,
};
