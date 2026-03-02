/**
 * Tests for inward_only dependency directionality feature
 * Run with: node test/rules.inward_only.test.js
 */

const assert = require('assert');
const { ImportRule } = require('../src/rules/types/import-rule');
const { RuleFactory } = require('../src/rules/factory');
const { RulesEngine } = require('../src/rules');

console.log('=== inward_only Feature Tests ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

// ============================================
// Phase 1: Schema & Factory Tests
// ============================================

test('Schema accepts inward_only: true', () => {
  const { ruleSchema } = require('../src/schema/rules-schema');
  const result = ruleSchema.safeParse({
    name: 'Test rule',
    layer: 'src/domain',
    inward_only: true
  });
  assert(result.success, 'Schema should accept inward_only: true');
});

test('Schema rejects rule with no constraints', () => {
  const { ruleSchema } = require('../src/schema/rules-schema');
  const result = ruleSchema.safeParse({
    name: 'Invalid rule',
    layer: 'src/domain'
    // No constraints
  });
  assert(!result.success, 'Schema should reject rule with no constraints');
});

test('Schema rejects empty constraint arrays', () => {
  const { ruleSchema } = require('../src/schema/rules-schema');
  const result = ruleSchema.safeParse({
    name: 'Invalid rule',
    layer: 'src/domain',
    must_not_import_from: []  // Empty array is truthy but invalid
  });
  assert(!result.success, 'Schema should reject empty constraint arrays');
});

test('Factory detects inward_only as import type', () => {
  const type = RuleFactory.detectRuleType({
    name: 'Domain isolation',
    layer: 'src/domain',
    inward_only: true
  });
  assert.strictEqual(type, 'import');
});

test('Factory creates ImportRule for inward_only config', () => {
  const rules = RuleFactory.createRules({
    rules: [{
      name: 'Domain isolation',
      layer: 'src/domain',
      inward_only: true
    }]
  });
  assert.strictEqual(rules.length, 1);
  assert(rules[0] instanceof ImportRule);
  assert.strictEqual(rules[0].config.inward_only, true);
});

// ============================================
// Phase 2: ImportRule Validation Tests
// ============================================

test('ImportRule has layerMatchers property', () => {
  const rule = new ImportRule({
    name: 'Test',
    layer: 'src/domain',
    inward_only: true
  });
  assert(Array.isArray(rule.layerMatchers));
  assert.strictEqual(rule.layerMatchers.length, 1);
});

test('ImportRule matchesLayer works correctly', () => {
  const rule = new ImportRule({
    name: 'Test',
    layer: 'src/domain/**',  // Use glob pattern to match subdirectories
    inward_only: true
  });
  assert(rule.matchesLayer('src/domain/foo.js', rule.layerMatchers));
  assert(!rule.matchesLayer('src/ui/foo.js', rule.layerMatchers));
});

test('ImportRule _resolvesTo handles relative imports', () => {
  const rule = new ImportRule({
    name: 'Test',
    layer: 'src/domain',
    inward_only: true
  });

  // Same directory
  assert(rule._resolvesTo('./utils.js', 'src/domain/service.js', 'src/domain/utils.js'));

  // Parent directory
  assert(rule._resolvesTo('../utils.js', 'src/domain/sub/utils.js', 'src/domain/utils.js'));

  // External packages don't match
  assert(!rule._resolvesTo('lodash', 'src/domain/service.js', 'node_modules/lodash/index.js'));
});

// ============================================
// Phase 3: Cross-Layer Blocking Tests
// ============================================

// Mock graph for testing
class MockGraph {
  constructor(components) {
    this.components = components;
    this._componentByName = new Map();
    this._dependents = new Map();

    for (const c of components) {
      this._componentByName.set(c.name, c);
      this._dependents.set(c.name, []);
    }

    for (const c of components) {
      for (const dep of (c.dependencies || [])) {
        if (this._dependents.has(dep)) {
          this._dependents.get(dep).push(c.name);
        }
      }
    }
  }

  getComponent(name) {
    return this._componentByName.get(name);
  }

  getDependents(name) {
    const names = this._dependents.get(name) || [];
    return names.map(n => this._componentByName.get(n)).filter(Boolean);
  }

  getFilesInLayer(matchers) {
    return this.components.filter(c =>
      matchers.some(m => m(c.filePath))
    );
  }
}

test('inward_only blocks cross-layer imports (Domain -> UI)', () => {
  // Setup: UI imports from Domain, both have inward_only
  const uiComponent = {
    name: 'ui/Button',
    filePath: 'src/ui/Button.js',
    imports: [{ path: '../domain/UserService', line: 5 }],
    dependencies: ['domain/UserService']
  };

  const domainComponent = {
    name: 'domain/UserService',
    filePath: 'src/domain/UserService.js',
    imports: [],
    dependencies: []
  };

  const graph = new MockGraph([uiComponent, domainComponent]);

  // Create rules
  const domainRule = new ImportRule({
    name: 'Domain isolation',
    layer: 'src/domain',
    inward_only: true
  });

  const uiRule = new ImportRule({
    name: 'UI boundary',
    layer: 'src/ui',
    inward_only: true
  });

  // Pre-compute matchers (as RulesEngine would)
  const context = {
    inwardOnlyMatchers: new Map([
      ['Domain isolation', {
        pattern: 'src/domain',
        matchers: [p => p.startsWith('src/domain/')]
      }],
      ['UI boundary', {
        pattern: 'src/ui',
        matchers: [p => p.startsWith('src/ui/')]
      }]
    ])
  };

  // Domain rule should flag UI importing from it
  const violations = domainRule.validate(domainComponent, graph, context);
  assert.strictEqual(violations.length, 1);
  assert.strictEqual(violations[0].file, 'src/ui/Button.js');
  assert(violations[0].message.includes('protected layer'));
});

test('inward_only allows imports from unprotected paths', () => {
  // Setup: Domain imports from shared (no inward_only)
  const domainComponent = {
    name: 'domain/UserService',
    filePath: 'src/domain/UserService.js',
    imports: [{ path: '../shared/utils', line: 3 }],
    dependencies: ['shared/utils']
  };

  const sharedComponent = {
    name: 'shared/utils',
    filePath: 'src/shared/utils.js',
    imports: [],
    dependencies: []
  };

  const graph = new MockGraph([domainComponent, sharedComponent]);

  const domainRule = new ImportRule({
    name: 'Domain isolation',
    layer: 'src/domain',
    inward_only: true
  });

  // Only domain has inward_only
  const context = {
    inwardOnlyMatchers: new Map([
      ['Domain isolation', {
        pattern: 'src/domain',
        matchers: [p => p.startsWith('src/domain/')]
      }]
    ])
  };

  // Domain should NOT be flagged for importing from shared
  const violations = domainRule.validate(domainComponent, graph, context);
  assert.strictEqual(violations.length, 0);
});

test('inward_only allows same-layer imports', () => {
  // Setup: Domain/sub imports from Domain
  const domainService = {
    name: 'domain/UserService',
    filePath: 'src/domain/UserService.js',
    imports: [{ path: './utils', line: 2 }],
    dependencies: ['domain/utils']
  };

  const domainUtils = {
    name: 'domain/utils',
    filePath: 'src/domain/utils.js',
    imports: [],
    dependencies: []
  };

  const graph = new MockGraph([domainService, domainUtils]);

  const domainRule = new ImportRule({
    name: 'Domain isolation',
    layer: 'src/domain',
    inward_only: true
  });

  const context = {
    inwardOnlyMatchers: new Map([
      ['Domain isolation', {
        pattern: 'src/domain',
        matchers: [p => p.startsWith('src/domain/')]
      }]
    ])
  };

  // No violations - same layer
  const violations = domainRule.validate(domainUtils, graph, context);
  assert.strictEqual(violations.length, 0);
});

// ============================================
// Phase 4: Security Limits Tests
// ============================================

test('Pattern complexity limit enforced (MAX_PATTERN_LENGTH)', () => {
  const longPattern = 'src/' + 'a'.repeat(250);
  assert.throws(() => {
    RuleFactory.createRules({
      rules: [{
        name: 'Long pattern',
        layer: longPattern,
        inward_only: true
      }]
    });
  }, /too long/i);
});

test('Pattern complexity limit enforced (MAX_BRACE_DEPTH)', () => {
  // Use nested braces or multiple brace groups to exceed MAX_BRACE_DEPTH (3)
  assert.throws(() => {
    RuleFactory.createRules({
      rules: [{
        name: 'Deep braces',
        layer: 'src/{a,b}/{c,d}/{e,f}/{g,h}',  // 4 opening braces
        inward_only: true
      }]
    });
  }, /too many braces/i);
});

test('RulesEngine enforces MAX_INWARD_ONLY_RULES', () => {
  const engine = new RulesEngine();

  // Create 51 inward_only rules
  const rules = [];
  for (let i = 0; i < 51; i++) {
    rules.push(new ImportRule({
      name: `Rule ${i}`,
      layer: `src/layer${i}`,
      inward_only: true
    }));
  }

  const graph = new MockGraph([]);

  assert.throws(() => {
    engine.validate(rules, graph);
  }, /Too many inward_only rules/);
});

// ============================================
// Summary
// ============================================

console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}

console.log('\nAll tests passed!');
