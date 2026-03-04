const fs = require('fs');
const path = require('path');

/**
 * Helper to compare arrays
 */
function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

/**
 * Compute delta between two analysis snapshots
 * @param {object} baseAnalysis - Analysis at base ref
 * @param {object} headAnalysis - Analysis at head ref
 * @param {object} changedFiles - Changed files from getChangedFiles()
 * @returns {object} Delta summary
 */
function computeDelta(baseAnalysis, headAnalysis, changedFiles) {
  const { changed, renamed, deleted, added } = changedFiles;

  // Build component indexes by filePath
  const baseByPath = new Map();
  for (const c of baseAnalysis.components || []) {
    baseByPath.set(c.filePath, c);
  }

  const headByPath = new Map();
  for (const c of headAnalysis.components || []) {
    headByPath.set(c.filePath, c);
  }

  // Find changed components
  const changedComponents = [];
  const unmodeledChanges = [];

  for (const filePath of changed) {
    const headComp = headByPath.get(filePath);
    const baseComp = baseByPath.get(filePath);

    if (headComp) {
      // File exists in head
      if (baseComp) {
        // File exists in both - check if dependencies or roleTags changed
        const depsChanged = !arraysEqual(
          (baseComp.dependencies || []).sort(),
          (headComp.dependencies || []).sort()
        );
        const rolesChanged = !arraysEqual(
          (baseComp.roleTags || []).sort(),
          (headComp.roleTags || []).sort()
        );

        if (depsChanged || rolesChanged) {
          changedComponents.push({
            filePath,
            name: headComp.name,
            type: headComp.type,
            roleTags: headComp.roleTags,
            dependenciesAdded: (headComp.dependencies || []).filter(d => !(baseComp.dependencies || []).includes(d)),
            dependenciesRemoved: (baseComp.dependencies || []).filter(d => !(headComp.dependencies || []).includes(d)),
            roleTagsAdded: (headComp.roleTags || []).filter(r => !(baseComp.roleTags || []).includes(r)),
            roleTagsRemoved: (baseComp.roleTags || []).filter(r => !(headComp.roleTags || []).includes(r))
          });
        }
      } else {
        // New file in head
        changedComponents.push({
          filePath,
          name: headComp.name,
          type: headComp.type,
          roleTags: headComp.roleTags,
          dependenciesAdded: headComp.dependencies || [],
          dependenciesRemoved: [],
          roleTagsAdded: headComp.roleTags || [],
          roleTagsRemoved: [],
          isNew: true
        });
      }
    } else {
      // File changed but not modeled (e.g., config file, non-code)
      unmodeledChanges.push(filePath);
    }
  }

  // Compute dependency edge deltas
  const baseEdges = new Set();
  for (const c of baseAnalysis.components || []) {
    for (const dep of c.dependencies || []) {
      baseEdges.add(`${c.filePath}→${dep}`);
    }
  }

  const headEdges = new Set();
  for (const c of headAnalysis.components || []) {
    for (const dep of c.dependencies || []) {
      headEdges.add(`${c.filePath}→${dep}`);
    }
  }

  const edgesAdded = [...headEdges].filter(e => !baseEdges.has(e)).sort();
  const edgesRemoved = [...baseEdges].filter(e => !headEdges.has(e)).sort();

  return {
    changedComponents: changedComponents.sort((a, b) => a.filePath.localeCompare(b.filePath)),
    unmodeledChanges: unmodeledChanges.sort(),
    renamedFiles: renamed,
    deletedFiles: deleted.sort(),
    addedFiles: added.sort(),
    dependencyEdgeDelta: {
      added: edgesAdded,
      removed: edgesRemoved,
      count: edgesAdded.length + edgesRemoved.length
    }
  };
}

/**
 * Compute blast radius from delta
 */
function computeBlastRadiusFromDelta(delta, headAnalysis, maxDepth, maxNodes) {
  const impacted = new Set();
  const visited = new Set();
  const queue = [];

  // Start from changed components
  for (const comp of delta.changedComponents) {
    queue.push({ name: comp.name, depth: 0 });
    visited.add(comp.name);
  }

  // Also include components whose files were added
  for (const filePath of delta.addedFiles) {
    const comp = headAnalysis.components.find(c => c.filePath === filePath);
    if (comp && !visited.has(comp.name)) {
      queue.push({ name: comp.name, depth: 0 });
      visited.add(comp.name);
    }
  }

  // BFS traversal to find downstream dependencies
  const byName = new Map();
  for (const c of headAnalysis.components) {
    byName.set(c.name, c);
  }

  while (queue.length > 0 && impacted.size < maxNodes) {
    const { name, depth } = queue.shift();

    if (depth > maxDepth) break;

    const comp = byName.get(name);
    if (!comp) continue;

    // Find components that depend on this one (reverse dependencies)
    for (const potentialDep of headAnalysis.components) {
      if (potentialDep.dependencies && potentialDep.dependencies.includes(name)) {
        if (!visited.has(potentialDep.name)) {
          visited.add(potentialDep.name);
          queue.push({ name: potentialDep.name, depth: depth + 1 });
          if (impacted.size < maxNodes) {
            impacted.add(potentialDep.name);
          }
        }
      }
    }
  }

  const truncated = visited.size > maxNodes;
  const omittedCount = Math.max(0, visited.size - maxNodes);

  return {
    impactedComponents: [...impacted].sort(),
    truncated,
    omittedCount
  };
}

/**
 * Compute risk from delta using differentiated weights
 */
function computeRiskFromDelta(delta, blastRadius) {
  let score = 0;
  const flags = [];
  const factors = {
    authTouch: false,
    securityBoundaryTouch: false,
    databasePathTouch: false,
    blastRadiusSize: 0,
    blastRadiusDepth: 0,
    edgeDeltaCount: 0
  };

  // Check for role touches (differentiated weights)
  for (const comp of delta.changedComponents) {
    const roles = comp.roleTags || [];

    if (roles.includes('auth') && !factors.authTouch) {
      score += 3;
      flags.push('auth_touch');
      factors.authTouch = true;
    }
    if (roles.includes('security') && !factors.securityBoundaryTouch) {
      score += 3;
      flags.push('security_boundary_touch');
      factors.securityBoundaryTouch = true;
    }
    if (roles.includes('database') && !factors.databasePathTouch) {
      score += 2;
      flags.push('database_path_touch');
      factors.databasePathTouch = true;
    }
  }

  // Check blast radius size
  const blastRadiusSize = blastRadius.impactedComponents.length;
  if (blastRadiusSize >= 5) {
    score += 1;
    factors.blastRadiusSize = blastRadiusSize;
  }

  // Check edge delta count
  const edgeDeltaCount = delta.dependencyEdgeDelta.count || 0;
  if (edgeDeltaCount >= 10) {
    score += 1;
    factors.edgeDeltaCount = edgeDeltaCount;
  }

  // Determine level (score 0 = none, 1-2 = low, 3-5 = medium, 6+ = high)
  let level = 'none';
  if (score >= 6) {
    level = 'high';
  } else if (score >= 3) {
    level = 'medium';
  } else if (score >= 1) {
    level = 'low';
  }

  return { score, level, flags, factors };
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Group file paths by change status with stable sorting
 * @param {object} result - PR impact result
 * @param {number} maxPreview - Maximum items to show per group (default: 10)
 * @returns {object} Grouped paths with counts and previews
 */
function groupChangePaths(result, maxPreview = 10) {
  const groups = {
    changed: { items: [], count: 0, truncated: false },
    renamed: { items: [], count: 0, truncated: false },
    added: { items: [], count: 0, truncated: false },
    deleted: { items: [], count: 0, truncated: false },
    unmodeled: { items: [], count: 0, truncated: false }
  };

  // Process each file status array with stable sorting
  const sortStrings = (arr) => [...arr].sort((a, b) => String(a).localeCompare(String(b)));

  // Changed files
  const changed = sortStrings(result.changedFiles || []);
  groups.changed.count = changed.length;
  groups.changed.items = changed.slice(0, maxPreview);
  groups.changed.truncated = changed.length > maxPreview;

  // Renamed files (array of { from, to } objects)
  const renamed = result.renamedFiles || [];
  const renamedSorted = [...renamed].sort((a, b) =>
    (a.from || '').localeCompare(b.from || '')
  );
  groups.renamed.count = renamedSorted.length;
  groups.renamed.items = renamedSorted.slice(0, maxPreview);
  groups.renamed.truncated = renamedSorted.length > maxPreview;

  // Added files
  const added = sortStrings(result.addedFiles || []);
  groups.added.count = added.length;
  groups.added.items = added.slice(0, maxPreview);
  groups.added.truncated = added.length > maxPreview;

  // Deleted files
  const deleted = sortStrings(result.deletedFiles || []);
  groups.deleted.count = deleted.length;
  groups.deleted.items = deleted.slice(0, maxPreview);
  groups.deleted.truncated = deleted.length > maxPreview;

  // Unmodeled changes
  const unmodeled = sortStrings(result.unmodeledChanges || []);
  groups.unmodeled.count = unmodeled.length;
  groups.unmodeled.items = unmodeled.slice(0, maxPreview);
  groups.unmodeled.truncated = unmodeled.length > maxPreview;

  return groups;
}

/**
 * Build risk narrative from risk object
 * @param {object} risk - Risk object from result
 * @returns {object} Risk narrative with level, score, reasons, and override info
 */
function buildRiskNarrative(risk) {
  const narrative = {
    level: risk?.level || 'none',
    score: risk?.score || 0,
    reasons: [],
    override: null
  };

  // Build human-readable reasons from flags and factors
  const factors = risk?.factors || {};
  const flagDescriptions = {
    'auth_touch': 'Touches authentication components',
    'security_boundary_touch': 'Crosses security boundaries',
    'database_path_touch': 'Modifies database-related code'
  };

  // Add flag-based reasons
  for (const flag of risk?.flags || []) {
    if (flagDescriptions[flag]) {
      narrative.reasons.push(flagDescriptions[flag]);
    } else {
      narrative.reasons.push(flag.replace(/_/g, ' '));
    }
  }

  // Add factor-based context
  if (factors.blastRadiusSize >= 5) {
    narrative.reasons.push(`Large blast radius (${factors.blastRadiusSize} components impacted)`);
  }
  if (factors.edgeDeltaCount >= 10) {
    narrative.reasons.push(`Significant dependency changes (${factors.edgeDeltaCount} edges modified)`);
  }

  // Sort reasons for deterministic output
  narrative.reasons.sort();

  // Handle override
  if (risk?.override?.applied) {
    narrative.override = {
      applied: true,
      reason: risk.override.reason || 'No reason provided'
    };
  }

  return narrative;
}

/**
 * Build summary metadata for executive summary section
 * @param {object} result - PR impact result
 * @returns {object} Summary metadata
 */
function buildSummaryMeta(result) {
  const fileGroups = groupChangePaths(result);

  return {
    totalFilesChanged: fileGroups.changed.count + fileGroups.renamed.count +
                       fileGroups.added.count + fileGroups.deleted.count,
    changedComponents: (result.changedComponents || []).length,
    blastRadiusSize: (result.blastRadius?.impactedComponents || []).length,
    blastRadiusTruncated: result.blastRadius?.truncated || false,
    blastRadiusOmitted: result.blastRadius?.omittedCount || 0,
    blastRadiusDepth: result.blastRadius?.depth || 0,
    riskLevel: result.risk?.level || 'none',
    riskScore: result.risk?.score || 0,
    unmodeledCount: fileGroups.unmodeled.count,
    hasOverride: result.risk?.override?.applied || false,
    generatedAt: result.generatedAt || new Date().toISOString(),
    base: result.base || 'unknown',
    head: result.head || 'unknown',
    durationMs: result._meta?.durationMs || 0
  };
}

/**
 * Generate HTML explainer for PR impact
 * @param {object} result - PR impact result
 * @returns {string} HTML content
 */
function generateHtmlExplainer(result) {
  // Build content models using helpers
  const summary = buildSummaryMeta(result);
  const pathGroups = groupChangePaths(result);
  const riskNarrative = buildRiskNarrative(result.risk);

  const riskColors = {
    none: '#6b7280',
    low: '#22c55e',
    medium: '#eab308',
    high: '#ef4444'
  };

  const riskColor = riskColors[riskNarrative.level] || '#6b7280';

  // Sort changed components deterministically
  const sortedComponents = [...(result.changedComponents || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  );

  // Build changed components HTML
  const changedComponentsHtml = sortedComponents.map(comp => `
      <li class="component">
        <div class="component-name">${escapeHtml(comp.name)}</div>
        <div class="component-path">${escapeHtml(comp.filePath)}</div>
        <div class="component-roles">${(comp.roleTags || []).sort().map(r => `<span class="role-tag">${escapeHtml(r)}</span>`).join(' ')}</div>
        ${comp.isNew ? '<span class="badge new">NEW</span>' : ''}
      </li>
    `).join('');

  // Build blast radius HTML with sorted components
  const sortedBlastRadius = [...(result.blastRadius?.impactedComponents || [])].sort();
  const blastRadiusHtml = sortedBlastRadius.map(name => `
      <li>${escapeHtml(name)}</li>
    `).join('');

  // Build path group HTML for Change Story section
  const buildPathList = (items, label) => {
    if (items.length === 0) return '';
    return `
      <div class="path-group">
        <h4>${label}</h4>
        <ul class="file-list">
          ${items.map(p => `<li><code>${escapeHtml(p)}</code></li>`).join('')}
        </ul>
      </div>
    `;
  };

  const buildRenamedList = (items) => {
    if (items.length === 0) return '';
    return `
      <div class="path-group">
        <h4>Renamed Files</h4>
        <ul class="file-list">
          ${items.map(r => `<li><code>${escapeHtml(r.from)}</code> → <code>${escapeHtml(r.to)}</code></li>`).join('')}
        </ul>
      </div>
    `;
  };

  // Build action checklist based on risk and changes
  const actionItems = [];

  if (riskNarrative.level === 'high') {
    actionItems.push('Review all changes carefully - high risk detected');
  }
  if (riskNarrative.reasons.some(r => r.includes('authentication'))) {
    actionItems.push('Verify authentication flow is not compromised');
    actionItems.push('Test all auth-related endpoints');
  }
  if (riskNarrative.reasons.some(r => r.includes('security'))) {
    actionItems.push('Review security implications of boundary changes');
    actionItems.push('Check for potential privilege escalation');
  }
  if (riskNarrative.reasons.some(r => r.includes('database'))) {
    actionItems.push('Review database schema changes');
    actionItems.push('Verify migration safety if applicable');
  }
  if (summary.blastRadiusSize >= 5) {
    actionItems.push('Review impact on downstream components');
  }
  if (summary.unmodeledCount > 0) {
    actionItems.push('Review unmodeled file changes');
  }
  if (riskNarrative.override?.applied) {
    actionItems.push(`Risk gate overridden: ${riskNarrative.override.reason}`);
  }
  if (actionItems.length === 0) {
    actionItems.push('Standard review - no elevated risk factors detected');
  }

  // Sort action items for determinism
  actionItems.sort();

  const actionChecklistHtml = actionItems.map(item => `
      <li>${escapeHtml(item)}</li>
    `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Impact Analysis</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 2rem;
    }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #111827; }
    h2 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
    h3 { font-size: 1.1rem; margin: 1rem 0 0.5rem; color: #374151; }
    h4 { font-size: 0.9rem; margin: 0.75rem 0 0.25rem; color: #6b7280; }
    section { margin-bottom: 1.5rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .summary-card { background: white; padding: 1rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .summary-card .label { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-card .value { font-size: 1.5rem; font-weight: 600; margin-top: 0.25rem; }
    .risk-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; color: white; }
    .component { background: white; padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); list-style: none; }
    .component-name { font-weight: 600; color: #111827; }
    .component-path { font-size: 0.875rem; color: #6b7280; font-family: monospace; }
    .component-roles { margin-top: 0.5rem; }
    .role-tag { display: inline-block; padding: 0.125rem 0.5rem; background: #e5e7eb; border-radius: 0.25rem; font-size: 0.75rem; margin-right: 0.25rem; }
    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; }
    .badge.new { background: #dbeafe; color: #1d4ed8; }
    .risk-reason { padding: 0.25rem 0; color: #b45309; }
    .override-notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 0.75rem 1rem; margin: 0.5rem 0; border-radius: 0.25rem; }
    .override-notice strong { color: #92400e; }
    ul { list-style: disc; margin-left: 1.5rem; }
    ul.file-list { list-style: none; margin-left: 0; }
    ul.file-list li { padding: 0.125rem 0; }
    ul.file-list code { font-size: 0.85rem; background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
    li { padding: 0.25rem 0; }
    .path-group { margin-bottom: 1rem; }
    .truncation-note { font-size: 0.875rem; color: #6b7280; font-style: italic; margin-top: 0.5rem; }
    .meta { font-size: 0.75rem; color: #9ca3af; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
    .empty { color: #9ca3af; font-style: italic; }
    .checklist { background: #f0fdf4; border: 1px solid #86efac; padding: 1rem; border-radius: 0.5rem; }
    .checklist li { color: #166534; }
  </style>
</head>
<body>
  <main class="container">
    <h1>PR Impact Analysis</h1>

    <section aria-labelledby="executive-summary-heading">
      <h2 id="executive-summary-heading">Executive Summary</h2>
      <p>This PR touches <strong>${summary.totalFilesChanged} file${summary.totalFilesChanged !== 1 ? 's' : ''}</strong>
         across <strong>${summary.changedComponents} component${summary.changedComponents !== 1 ? 's' : ''}</strong>
         with a <strong>Risk Level: ${riskNarrative.level.toUpperCase()}</strong> (score: ${riskNarrative.score}).</p>
      ${summary.blastRadiusSize > 0 ? `
      <p>The blast radius includes <strong>${summary.blastRadiusSize} additional component${summary.blastRadiusSize !== 1 ? 's' : ''}</strong>
         that may be affected${summary.blastRadiusTruncated ? ` (${summary.blastRadiusOmitted} more truncated at depth ${summary.blastRadiusDepth})` : ''}.</p>
      ` : ''}
      ${summary.unmodeledCount > 0 ? `
      <p><strong>${summary.unmodeledCount} file${summary.unmodeledCount !== 1 ? 's' : ''}</strong> changed outside modeled components.</p>
      ` : ''}
    </section>

    <div class="summary" role="region" aria-label="Key metrics">
      <div class="summary-card">
        <div class="label">Changed Components</div>
        <div class="value">${summary.changedComponents}</div>
      </div>
      <div class="summary-card">
        <div class="label">Blast Radius</div>
        <div class="value">${summary.blastRadiusSize}${summary.blastRadiusTruncated ? '+' : ''}</div>
      </div>
      <div class="summary-card">
        <div class="label">Risk Level</div>
        <div class="value"><span class="risk-badge" style="background: ${riskColor}">${riskNarrative.level.toUpperCase()}</span></div>
      </div>
      <div class="summary-card">
        <div class="label">Risk Score</div>
        <div class="value">${riskNarrative.score}</div>
      </div>
    </div>

    ${riskNarrative.override?.applied ? `
    <div class="override-notice" role="alert">
      <strong>Risk Override Applied:</strong> ${escapeHtml(riskNarrative.override.reason)}
    </div>
    ` : ''}

    <section aria-labelledby="change-story-heading">
      <h2 id="change-story-heading">Change Story</h2>
      ${pathGroups.changed.count > 0 ? buildPathList(pathGroups.changed.items, `Modified Files (${pathGroups.changed.count})`) + (pathGroups.changed.truncated ? `<p class="truncation-note">+ ${pathGroups.changed.count - pathGroups.changed.items.length} more modified files</p>` : '') : ''}
      ${pathGroups.renamed.count > 0 ? buildRenamedList(pathGroups.renamed.items) + (pathGroups.renamed.truncated ? `<p class="truncation-note">+ ${pathGroups.renamed.count - pathGroups.renamed.items.length} more renamed files</p>` : '') : ''}
      ${pathGroups.added.count > 0 ? buildPathList(pathGroups.added.items, `Added Files (${pathGroups.added.count})`) + (pathGroups.added.truncated ? `<p class="truncation-note">+ ${pathGroups.added.count - pathGroups.added.items.length} more added files</p>` : '') : ''}
      ${pathGroups.deleted.count > 0 ? buildPathList(pathGroups.deleted.items, `Deleted Files (${pathGroups.deleted.count})`) + (pathGroups.deleted.truncated ? `<p class="truncation-note">+ ${pathGroups.deleted.count - pathGroups.deleted.items.length} more deleted files</p>` : '') : ''}
      ${pathGroups.unmodeled.count > 0 ? buildPathList(pathGroups.unmodeled.items, `Unmodeled Changes (${pathGroups.unmodeled.count})`) + (pathGroups.unmodeled.truncated ? `<p class="truncation-note">+ ${pathGroups.unmodeled.count - pathGroups.unmodeled.items.length} more unmodeled files</p>` : '') : ''}
      ${summary.totalFilesChanged === 0 ? '<p class="empty">No file changes detected</p>' : ''}
    </section>

    ${sortedComponents.length > 0 ? `
    <section aria-labelledby="components-heading">
      <h2 id="components-heading">Changed Components</h2>
      <ul style="list-style: none; margin-left: 0;">
        ${changedComponentsHtml}
      </ul>
    </section>
    ` : ''}

    ${riskNarrative.reasons.length > 0 ? `
    <section aria-labelledby="risk-heading">
      <h2 id="risk-heading">Risk Reasoning</h2>
      <h3>Why this PR is flagged:</h3>
      <ul>
        ${riskNarrative.reasons.map(r => `<li class="risk-reason">${escapeHtml(r)}</li>`).join('')}
      </ul>
    </section>
    ` : ''}

    ${summary.blastRadiusSize > 0 ? `
    <section aria-labelledby="blast-radius-heading">
      <h2 id="blast-radius-heading">Blast Radius</h2>
      <p>Components that may be affected by these changes${summary.blastRadiusTruncated ? ` (truncated at depth ${summary.blastRadiusDepth}, ${summary.blastRadiusOmitted} omitted)` : ''}:</p>
      <ul>
        ${blastRadiusHtml}
      </ul>
      ${summary.blastRadiusTruncated ? `<p class="truncation-note">Output truncated: ${summary.blastRadiusOmitted} additional components not shown (depth limit: ${summary.blastRadiusDepth})</p>` : ''}
    </section>
    ` : ''}

    <section aria-labelledby="actions-heading">
      <h2 id="actions-heading">Action Checklist</h2>
      <div class="checklist">
        <ul>
          ${actionChecklistHtml}
        </ul>
      </div>
    </section>

    <footer class="meta">
      <p>Generated: ${escapeHtml(summary.generatedAt)}</p>
      <p>Base: <code>${escapeHtml(summary.base)}</code> | Head: <code>${escapeHtml(summary.head)}</code></p>
      <p>Analysis duration: ${summary.durationMs}ms</p>
    </footer>
  </main>
</body>
</html>`;
}

/**
 * Write PR impact artifacts to disk
 * @param {string} outputDir - Output directory path
 * @param {object} result - PR impact result
 * @param {boolean} skipHtml - Skip HTML generation
 */
function writePrImpactArtifacts(outputDir, result, skipHtml = false) {
  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
  }

  // Write JSON
  const jsonPath = path.join(outputDir, 'pr-impact.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n');

  // Write HTML (unless --json flag)
  if (!skipHtml) {
    const htmlPath = path.join(outputDir, 'pr-impact.html');
    const htmlContent = generateHtmlExplainer(result);
    fs.writeFileSync(htmlPath, htmlContent);
  }

  return { jsonPath, htmlPath: skipHtml ? null : path.join(outputDir, 'pr-impact.html') };
}

module.exports = {
  computeDelta,
  computeBlastRadiusFromDelta,
  computeRiskFromDelta,
  escapeHtml,
  groupChangePaths,
  buildRiskNarrative,
  buildSummaryMeta,
  generateHtmlExplainer,
  writePrImpactArtifacts,
};
