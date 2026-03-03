/**
 * Tests for PR Impact HTML explainer
 * Tests: Gate A (sections), Gate B (deterministic order), Gate C (blast-radius metadata),
 * Gate D (artifact compatibility), and escaping
 */

const assert = require('assert');
const {
  generateHtmlExplainer,
  groupChangePaths,
  buildRiskNarrative,
  buildSummaryMeta,
  escapeHtml
} = require('../src/diagram.js');

// =============================================================================
// Fixtures
// =============================================================================

const emptyResult = {
  schemaVersion: '1.0',
  generatedAt: '2026-03-03T12:00:00.000Z',
  base: 'abc123',
  head: 'def456',
  changedFiles: [],
  renamedFiles: [],
  addedFiles: [],
  deletedFiles: [],
  unmodeledChanges: [],
  changedComponents: [],
  dependencyEdgeDelta: { added: [], removed: [], count: 0 },
  blastRadius: {
    depth: 2,
    truncated: false,
    omittedCount: 0,
    impactedComponents: []
  },
  risk: {
    score: 0,
    level: 'none',
    flags: [],
    factors: {
      authTouch: false,
      securityBoundaryTouch: false,
      databasePathTouch: false,
      blastRadiusSize: 0,
      blastRadiusDepth: 0,
      edgeDeltaCount: 0
    },
    override: {
      applied: false,
      reason: null
    }
  },
  _meta: {
    status: 'no_changes',
    message: 'No changes detected',
    durationMs: 42
  }
};

const highRiskResult = {
  schemaVersion: '1.0',
  generatedAt: '2026-03-03T12:00:00.000Z',
  base: 'abc123',
  head: 'def456',
  changedFiles: ['src/auth/login.js', 'src/auth/middleware.js'],
  renamedFiles: [{ from: 'src/old.js', to: 'src/new.js' }],
  addedFiles: ['src/utils/helper.js'],
  deletedFiles: ['src/deprecated.js'],
  unmodeledChanges: ['config/settings.json'],
  changedComponents: [
    { name: 'AuthService', filePath: 'src/auth/login.js', roleTags: ['auth', 'security'], isNew: false },
    { name: 'DatabaseService', filePath: 'src/db/connection.js', roleTags: ['database'], isNew: true }
  ],
  dependencyEdgeDelta: { added: [], removed: [], count: 12 },
  blastRadius: {
    depth: 2,
    truncated: true,
    omittedCount: 5,
    impactedComponents: ['UserService', 'SessionManager', 'APIGateway', 'CacheLayer', 'Logger']
  },
  risk: {
    score: 8,
    level: 'high',
    flags: ['auth_touch', 'security_boundary_touch', 'database_path_touch'],
    factors: {
      authTouch: true,
      securityBoundaryTouch: true,
      databasePathTouch: true,
      blastRadiusSize: 5,
      blastRadiusDepth: 2,
      edgeDeltaCount: 12
    },
    override: {
      applied: true,
      reason: 'Approved by security team for hotfix'
    }
  },
  _meta: {
    status: 'analyzed',
    message: 'Analysis complete',
    durationMs: 150
  }
};

const specialCharsResult = {
  schemaVersion: '1.0',
  generatedAt: '2026-03-03T12:00:00.000Z',
  base: 'abc123',
  head: 'def456',
  changedFiles: ['src/<script>alert(1)</script>.js', 'src/test&"\'quote.js'],
  renamedFiles: [],
  addedFiles: [],
  deletedFiles: [],
  unmodeledChanges: [],
  changedComponents: [
    { name: 'Test<script>Component', filePath: 'src/test.js', roleTags: [], isNew: false }
  ],
  dependencyEdgeDelta: { added: [], removed: [], count: 0 },
  blastRadius: {
    depth: 2,
    truncated: false,
    omittedCount: 0,
    impactedComponents: ['Component<with>brackets', 'Component&with&ampersands']
  },
  risk: {
    score: 1,
    level: 'low',
    flags: [],
    factors: {
      authTouch: false,
      securityBoundaryTouch: false,
      databasePathTouch: false,
      blastRadiusSize: 2,
      blastRadiusDepth: 0,
      edgeDeltaCount: 0
    },
    override: {
      applied: false,
      reason: null
    }
  },
  _meta: {
    status: 'analyzed',
    message: 'Analysis complete',
    durationMs: 50
  }
};

// =============================================================================
// Gate A: HTML Rendering Sections
// =============================================================================

describe('pr-impact renderer sections', function() {
  it('should include all required section headings for non-empty result', function() {
    const html = generateHtmlExplainer(highRiskResult);

    assert.ok(html.includes('Executive Summary'), 'Missing Executive Summary');
    assert.ok(html.includes('Change Story'), 'Missing Change Story');
    assert.ok(html.includes('Risk Reasoning'), 'Missing Risk Reasoning');
    assert.ok(html.includes('Blast Radius'), 'Missing Blast Radius');
    assert.ok(html.includes('Action Checklist'), 'Missing Action Checklist');
  });

  it('should include semantic structure for accessibility', function() {
    const html = generateHtmlExplainer(highRiskResult);

    assert.ok(html.includes('<main'), 'Missing <main> element');
    assert.ok(html.includes('aria-labelledby'), 'Missing aria-labelledby');
    assert.ok(html.includes('<section'), 'Missing <section> elements');
    assert.ok(html.includes('<footer'), 'Missing <footer> element');
  });

  it('should include risk override section when override is applied', function() {
    const html = generateHtmlExplainer(highRiskResult);

    assert.ok(html.includes('Risk Override Applied'), 'Missing risk override notice');
    assert.ok(html.includes('Approved by security team for hotfix'), 'Missing override reason');
  });

  it('should not include risk override section when not applied', function() {
    const html = generateHtmlExplainer(emptyResult);

    assert.ok(!html.includes('Risk Override Applied'), 'Should not show override notice');
  });
});

// =============================================================================
// Gate B: Deterministic Order
// =============================================================================

describe('pr-impact render ordering is stable', function() {
  it('should produce identical output for identical input across multiple runs', function() {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      runs.push(generateHtmlExplainer(highRiskResult));
    }

    assert.strictEqual(runs[0], runs[1], 'Run 1 != Run 2');
    assert.strictEqual(runs[1], runs[2], 'Run 2 != Run 3');
  });

  it('should sort components alphabetically', function() {
    const html = generateHtmlExplainer(highRiskResult);
    const authServicePos = html.indexOf('AuthService');
    const databaseServicePos = html.indexOf('DatabaseService');

    assert.ok(authServicePos > 0, 'AuthService not found');
    assert.ok(databaseServicePos > 0, 'DatabaseService not found');
    assert.ok(authServicePos < databaseServicePos, 'Components not sorted alphabetically');
  });

  it('should sort blast radius components alphabetically', function() {
    const html = generateHtmlExplainer(highRiskResult);
    const apiPos = html.indexOf('APIGateway');
    const cachePos = html.indexOf('CacheLayer');
    const loggerPos = html.indexOf('Logger');

    assert.ok(apiPos > 0 && cachePos > 0 && loggerPos > 0, 'Components not found');
    assert.ok(apiPos < cachePos, 'APIGateway should come before CacheLayer');
    assert.ok(cachePos < loggerPos, 'CacheLayer should come before Logger');
  });
});

// =============================================================================
// Gate C: Blast-Radius Metadata
// =============================================================================

describe('pr-impact blast-radius metadata', function() {
  it('should include truncation metadata when blast radius is truncated', function() {
    const html = generateHtmlExplainer(highRiskResult);

    assert.ok(html.includes('truncated'), 'Missing truncation indicator');
    assert.ok(html.includes('5'), 'Missing omitted count');
    assert.ok(html.includes('depth 2') || html.includes('depth limit: 2'), 'Missing depth info');
  });

  it('should not show truncation when not truncated', function() {
    const html = generateHtmlExplainer(emptyResult);

    // Empty result has no blast radius section at all
    assert.ok(!html.includes('truncated'), 'Should not show truncation when not truncated');
  });
});

// =============================================================================
// Gate D: Artifact Compatibility (empty diff contract)
// =============================================================================

describe('pr-impact no-change artifact contract', function() {
  it('should render coherent empty state for empty result', function() {
    const html = generateHtmlExplainer(emptyResult);

    assert.ok(html.includes('No file changes detected') || html.includes('0 files'), 'Missing empty state message');
    assert.ok(html.includes('Risk Level: NONE'), 'Missing risk level for empty result');
  });

  it('should include valid HTML structure even for empty results', function() {
    const html = generateHtmlExplainer(emptyResult);

    assert.ok(html.includes('<!DOCTYPE html>'), 'Missing DOCTYPE');
    assert.ok(html.includes('</html>'), 'Missing closing html tag');
    assert.ok(html.includes('<main'), 'Missing main element');
  });
});

// =============================================================================
// Escaping Tests
// =============================================================================

describe('pr-impact HTML escaping', function() {
  it('should escape < and > in file paths', function() {
    const html = generateHtmlExplainer(specialCharsResult);

    // Should contain escaped versions, not raw script tags
    assert.ok(!html.includes('<script>alert'), 'Unescaped <script> found');
    assert.ok(html.includes('&lt;script&gt;'), 'Missing escaped script tag');
  });

  it('should escape & and quotes in file paths', function() {
    const html = generateHtmlExplainer(specialCharsResult);

    assert.ok(html.includes('&amp;'), 'Missing escaped ampersand');
    assert.ok(html.includes('&quot;') || html.includes('&#039;'), 'Missing escaped quotes');
  });

  it('should escape special chars in component names', function() {
    const html = generateHtmlExplainer(specialCharsResult);

    assert.ok(!html.includes('Test<script>Component'), 'Unescaped component name');
    assert.ok(html.includes('Test&lt;script&gt;Component'), 'Missing escaped component name');
  });

  it('should escape special chars in blast radius component names', function() {
    const html = generateHtmlExplainer(specialCharsResult);

    assert.ok(!html.includes('Component<with>brackets'), 'Unescaped blast radius component');
    assert.ok(html.includes('Component&lt;with&gt;brackets'), 'Missing escaped blast radius component');
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('helper functions', function() {
  describe('escapeHtml', function() {
    it('should escape all special characters', function() {
      assert.strictEqual(escapeHtml('<'), '&lt;');
      assert.strictEqual(escapeHtml('>'), '&gt;');
      assert.strictEqual(escapeHtml('&'), '&amp;');
      assert.strictEqual(escapeHtml('"'), '&quot;');
      assert.strictEqual(escapeHtml("'"), '&#039;');
    });

    it('should handle non-string input', function() {
      assert.strictEqual(escapeHtml(null), '');
      assert.strictEqual(escapeHtml(undefined), '');
      assert.strictEqual(escapeHtml(123), '');
    });

    it('should handle complex strings', function() {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
      assert.strictEqual(escapeHtml(input), expected);
    });
  });

  describe('groupChangePaths', function() {
    it('should group paths by status with counts', function() {
      const groups = groupChangePaths(highRiskResult);

      assert.strictEqual(groups.changed.count, 2);
      assert.strictEqual(groups.renamed.count, 1);
      assert.strictEqual(groups.added.count, 1);
      assert.strictEqual(groups.deleted.count, 1);
      assert.strictEqual(groups.unmodeled.count, 1);
    });

    it('should sort paths alphabetically', function() {
      const groups = groupChangePaths(highRiskResult);

      assert.strictEqual(groups.changed.items[0], 'src/auth/login.js');
      assert.strictEqual(groups.changed.items[1], 'src/auth/middleware.js');
    });

    it('should handle empty result', function() {
      const groups = groupChangePaths(emptyResult);

      assert.strictEqual(groups.changed.count, 0);
      assert.strictEqual(groups.renamed.count, 0);
      assert.strictEqual(groups.added.count, 0);
      assert.strictEqual(groups.deleted.count, 0);
      assert.strictEqual(groups.unmodeled.count, 0);
    });
  });

  describe('buildRiskNarrative', function() {
    it('should build narrative from high risk result', function() {
      const narrative = buildRiskNarrative(highRiskResult.risk);

      assert.strictEqual(narrative.level, 'high');
      assert.strictEqual(narrative.score, 8);
      assert.ok(narrative.reasons.length > 0, 'Should have reasons');
      assert.strictEqual(narrative.override.applied, true);
    });

    it('should build narrative from low risk result', function() {
      const narrative = buildRiskNarrative(emptyResult.risk);

      assert.strictEqual(narrative.level, 'none');
      assert.strictEqual(narrative.score, 0);
      assert.strictEqual(narrative.reasons.length, 0);
      assert.strictEqual(narrative.override, null);
    });
  });

  describe('buildSummaryMeta', function() {
    it('should build summary metadata from result', function() {
      const summary = buildSummaryMeta(highRiskResult);

      assert.strictEqual(summary.totalFilesChanged, 5); // 2 changed + 1 renamed + 1 added + 1 deleted
      assert.strictEqual(summary.changedComponents, 2);
      assert.strictEqual(summary.blastRadiusSize, 5);
      assert.strictEqual(summary.blastRadiusTruncated, true);
      assert.strictEqual(summary.blastRadiusOmitted, 5);
      assert.strictEqual(summary.riskLevel, 'high');
      assert.strictEqual(summary.riskScore, 8);
    });

    it('should handle empty result', function() {
      const summary = buildSummaryMeta(emptyResult);

      assert.strictEqual(summary.totalFilesChanged, 0);
      assert.strictEqual(summary.changedComponents, 0);
      assert.strictEqual(summary.blastRadiusSize, 0);
      assert.strictEqual(summary.riskLevel, 'none');
    });
  });
});
