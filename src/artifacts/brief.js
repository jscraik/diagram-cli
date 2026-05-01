const fs = require('fs');
const path = require('path');
const { summarizeAnalysis } = require('./evidence-summary');

const BRIEF_HEADINGS = Object.freeze([
  '# Archscope Evidence Brief',
  '## Summary',
  '## Artifact Read Order',
  '## Risk And Validation',
  '## Warnings',
  '## Agent Handoff',
  '## Next Action',
]);

function formatList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return [`- ${emptyText}`];
  }
  return items.map((item) => `- ${item}`);
}

function buildArchitectureBrief({
  manifest,
  analysis,
  prImpact = null,
  warnings = [],
  errors = [],
}) {
  const [
    titleHeading,
    summaryHeading,
    readOrderHeading,
    riskHeading,
    warningsHeading,
    handoffHeading,
    nextActionHeading,
  ] = BRIEF_HEADINGS;
  const summary = summarizeAnalysis(analysis);
  const languageText = summary.languages.length > 0
    ? summary.languages.map(([name, count]) => `${name} (${count})`).join(', ')
    : 'unknown';
  const areaText = summary.areas.length > 0
    ? summary.areas.map(([name, count]) => `${name} (${count})`).join(', ')
    : 'unknown';
  const modeText = prImpact ? 'pr scan' : 'repository scan';
  const warningLines = formatList(warnings, 'No warnings recorded.');
  const errorLines = formatList(
    errors.map((error) => `${error.category}: ${error.message}`),
    'No errors recorded.'
  );
  const prLines = prImpact
    ? [
      `- PR base: ${prImpact.base}`,
      `- PR head: ${prImpact.head}`,
      `- Changed components: ${prImpact.agentSummary?.changedComponents ?? prImpact.changedComponents?.length ?? 0}`,
      `- Blast radius: ${prImpact.blastRadius?.impactedComponents?.length ?? 0}`,
      `- Risk reasons: ${(prImpact.agentSummary?.riskReasons || []).join(', ') || 'none'}`,
      `- Reviewer checks: ${(prImpact.agentSummary?.suggestedReviewerChecks || []).join('; ') || 'none'}`,
      `- Validation evidence: workflow pr contract reused via .diagram/pr-impact/pr-impact.json`,
      `- Confidence: ${prImpact.confidence?.level || 'unknown'}`,
    ]
    : ['- PR refs not supplied.'];

  const lines = [
    titleHeading,
    '',
    summaryHeading,
    '',
    `- Mode: ${modeText}`,
    `- Components detected: ${summary.componentCount}`,
    `- Files considered: ${summary.totalFilesFound}`,
    `- Entry points detected: ${summary.entryPointCount}`,
    `- Languages: ${languageText}`,
    `- Architecture areas: ${areaText}`,
    '',
    readOrderHeading,
    '',
    ...manifest.artifactReadOrder.map((artifactPath, index) => `${index + 1}. ${artifactPath}`),
    '',
    riskHeading,
    '',
    `- Validation: ${manifest.validation.status}`,
    `- Risk: ${prImpact?.risk?.level || 'unknown until PR refs or policy validation are supplied'}`,
    `- Evidence status: ${manifest.artifacts.some((entry) => entry.status === 'failed') ? 'failed' : 'written'}`,
    ...prLines,
    '',
    warningsHeading,
    '',
    ...warningLines,
    '',
    handoffHeading,
    '',
    `- Read ${manifest.artifactReadOrder[0]} first for artifact status.`,
    `- Use ${manifest.primaryAgentArtifact} as the parser-safe agent contract.`,
    `- Open ${manifest.primaryHumanArtifact} for the concise human summary.`,
    '',
    nextActionHeading,
    '',
    ...errorLines,
  ];

  return `${lines.join('\n')}\n`;
}

function writeArchitectureBrief(filePath, input) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const content = buildArchitectureBrief(input);
  fs.writeFileSync(filePath, content);
  return {
    path: filePath,
    lines: content.trimEnd().split(/\r?\n/).length,
    bytes: Buffer.byteLength(content, 'utf8'),
  };
}

module.exports = {
  BRIEF_HEADINGS,
  buildArchitectureBrief,
  summarizeAnalysis,
  writeArchitectureBrief,
};
