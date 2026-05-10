const fs = require('fs');
const path = require('path');
const { actionableMissingArtifacts } = require('./evidence-manifest');
const { summarizeAnalysis } = require('./evidence-summary');

const BRIEF_HEADINGS = Object.freeze([
  '# Archscope Evidence Brief',
  '## Summary',
  '## Review Decision',
  '## Changed Areas',
  '## Risk And Reasons',
  '## Reviewer Checks',
  '## Evidence Status',
  '## Artifact Read Order',
  '## Warnings',
  '## Agent Handoff',
  '## Next Action',
]);

/**
 * Format a list of values as markdown bullet lines.
 *
 * @param {any[]} items - Values to format as list entries.
 * @param {string} emptyText - Fallback text used when `items` is not an array or contains no elements.
 * @returns {string[]} Array of markdown bullet lines: one `- <emptyText>` when no items are provided, otherwise one `- <item>` per entry.
 */
function formatList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return [`- ${emptyText}`];
  }
  return items.map((item) => `- ${item}`);
}

/**
 * Produce markdown bullet lines that report blocked or missing artifacts from a manifest.
 *
 * The function examines manifest.artifacts and identifies entries considered blocked (status
 * 'failed' or 'partial', or status 'deferred' with a reason other than 'pr_refs_not_supplied'
 * or 'ui_spec_required'). If no blocked artifacts are found it returns a single line
 * stating no missing artifacts; otherwise it returns one bullet per blocked entry in the
 * form `- <path>: <status> (<reason>) [<errorCategory>]` (reason and category omitted when absent).
 *
 * @param {Object} manifest - Manifest object containing an `artifacts` array.
 *   Each artifact entry may include `path`, `status`, `reason`, and `errorCategory`.
 * @returns {string[]} An array of markdown bullet lines describing blocked artifacts or a single
 *   line `- Missing artifacts: none` when no blocked artifacts are present.
 */
function artifactStatusLines(manifest) {
  const blockedArtifacts = actionableMissingArtifacts(manifest.artifacts);
  if (blockedArtifacts.length === 0) return ['- Missing artifacts: none'];
  return blockedArtifacts.map((entry) => {
    const reason = entry.reason ? ` (${entry.reason})` : '';
    const category = entry.errorCategory ? ` [${entry.errorCategory}]` : '';
    return `- ${entry.path}: ${entry.status}${reason}${category}`;
  });
}

function evidenceStatus(manifest) {
  if (manifest.artifacts.some((entry) => entry.status === 'failed')) return 'failed';
  if (manifest.artifacts.some((entry) => entry.status === 'partial')) return 'partial';
  return 'written';
}

function manifestWasWritten(manifest) {
  return manifest.artifacts.some(
    (entry) => entry.id === 'manifest' && entry.status === 'written',
  );
}

function handoffLines(manifest) {
  if (!manifestWasWritten(manifest)) {
    return [
      '- Manifest was not written; inspect the reported errors before consuming evidence artifacts.',
    ];
  }

  return [
    `- Read ${manifest.artifactReadOrder[0]} first for artifact status.`,
    `- Use ${manifest.primaryAgentArtifact} as the parser-safe agent contract.`,
    `- Open ${manifest.primaryHumanArtifact} for the concise human summary.`,
  ];
}

/**
 * Format the manifest's artifact read order as numbered markdown lines.
 *
 * @param {Object} manifest - The manifest containing an artifact read order.
 * @param {string[]} manifest.artifactReadOrder - Ordered list of artifact paths.
 * @returns {string[]} Numbered lines like `1. path/to/artifact` for each artifact in order.
 */
function readNextLines(manifest) {
  return manifest.artifactReadOrder.map((artifactPath, index) => `${index + 1}. ${artifactPath}`);
}

/**
 * Build a markdown "Archscope Evidence Brief" describing analysis and manifest outcomes.
 *
 * Produces a structured markdown string containing headings for summary, review decision,
 * changed areas, risk, evidence status, artifact read order, handoff and next actions,
 * plus PR-specific details when PR impact information is provided or PR evidence generation failed.
 *
 * @param {Object} params - Input parameters.
 * @param {Object} params.manifest - Manifest describing artifacts, read order and validation status.
 * @param {Object} params.analysis - Analysis result used to summarise components, files, languages and areas.
 * @param {Object|null} [params.prImpact=null] - Optional PR impact data; when present the brief includes PR base/head, changed components, blast radius, risk reasons, suggested reviewer checks, validation evidence and confidence.
 * @param {string[]} [params.warnings=[]] - Array of warning messages to include in the brief.
 * @param {Array<{category:string,message:string,artifact?:string}>} [params.errors=[]] - Array of error objects to include; PR evidence generation errors are surfaced in the PR section.
 * @param {Object|null} [params.nextSafeAction=null] - Operational next action shared with terminal and machine output.
 * @returns {string} A markdown-formatted evidence brief.
 */
function buildArchitectureBrief({
  manifest,
  analysis,
  prImpact = null,
  warnings = [],
  errors = [],
  nextSafeAction = null,
}) {
  const [
    titleHeading,
    summaryHeading,
    reviewDecisionHeading,
    changedAreasHeading,
    riskHeading,
    reviewerChecksHeading,
    evidenceStatusHeading,
    readOrderHeading,
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
  const prError = errors.find((error) => error.artifact === 'pr-impact');
  const modeText = prImpact || prError ? 'pr scan' : 'repository scan';
  const warningLines = formatList(warnings, 'No warnings recorded.');
  const errorLines = errors
    .filter((error) => error && (error.category || error.message))
    .map((error) => `- ${error.category || 'unknown'}: ${error.message || 'no message'}`);
  const prImpactPath = prImpact?.prImpactPath
    || manifest.artifacts.find((entry) => entry.id === 'pr-impact' && entry.status === 'written')?.path
    || null;
  const nextActionMessage = nextSafeAction?.message
    || (errors.length > 0
      ? 'Inspect scan errors before consuming evidence artifacts.'
      : 'Read written evidence artifacts in manifest order.');
  const decisionLine = prImpact
    ? `- Review readiness: can proceed after inspecting ${prImpactPath || 'the PR evidence outcome'}.`
    : prError
      ? '- Review readiness: blocked until PR evidence failure is resolved.'
      : '- Review readiness: repository evidence is ready for orientation; PR review needs base/head refs.';
  const changedAreaLines = prImpact
    ? [
      `- Changed components: ${prImpact.agentSummary?.changedComponents ?? prImpact.changedComponents?.length ?? 0}`,
      `- Changed files: ${prImpact.changedFiles?.length ?? 0}`,
      `- Blast radius: ${prImpact.blastRadius?.impactedComponents?.length ?? 0}`,
    ]
    : prError
      ? ['- Changed areas unavailable because PR evidence failed.']
      : [`- Architecture areas: ${areaText}`];
  const riskReasonLines = prImpact
    ? formatList(prImpact.agentSummary?.riskReasons || [], 'No PR risk reasons recorded.')
    : prError
      ? [`- ${prError.category}: ${prError.message}`]
      : ['- Risk unknown until PR refs or policy validation are supplied.'];
  const reviewerCheckLines = prImpact
    ? formatList(prImpact.agentSummary?.suggestedReviewerChecks || [], 'No reviewer checks recorded.')
    : prError
      ? ['- Resolve PR evidence failure before approving architecture-sensitive changes.']
      : ['- Run with --base and --head to generate PR reviewer checks.'];
  let validationLines;
  if (prImpact) {
    validationLines = [
      `- PR base: ${prImpact.base}`,
      `- PR head: ${prImpact.head}`,
      prImpactPath
        ? `- Validation evidence: workflow pr contract reused via ${prImpactPath}`
        : `- Validation evidence: PR impact artifact not written (${prImpact._meta?.status || 'not_written'}).`,
      `- Confidence: ${prImpact.confidence?.level || 'unknown'}`,
    ];
  } else if (prError) {
    validationLines = [`- PR evidence generation failed: ${prError.category}: ${prError.message}`];
  } else {
    validationLines = ['- PR refs not supplied.'];
  }

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
    reviewDecisionHeading,
    '',
    decisionLine,
    '',
    changedAreasHeading,
    '',
    ...changedAreaLines,
    '',
    riskHeading,
    '',
    `- Risk: ${prImpact?.risk?.level || 'unknown until PR refs or policy validation are supplied'}`,
    ...riskReasonLines,
    '',
    reviewerChecksHeading,
    '',
    ...reviewerCheckLines,
    '',
    evidenceStatusHeading,
    '',
    `- Validation: ${manifest.validation.status}`,
    `- Evidence status: ${evidenceStatus(manifest)}`,
    ...artifactStatusLines(manifest),
    ...validationLines,
    '',
    readOrderHeading,
    '',
    ...readNextLines(manifest),
    '',
    warningsHeading,
    '',
    ...warningLines,
    '',
    handoffHeading,
    '',
    ...handoffLines(manifest),
    '',
    nextActionHeading,
    '',
    `- ${nextActionMessage}`,
    ...(nextSafeAction?.category ? [`- Category: ${nextSafeAction.category}`] : []),
    ...(nextSafeAction?.action ? [`- Action: ${nextSafeAction.action}`] : []),
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
