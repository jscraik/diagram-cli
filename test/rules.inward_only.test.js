/**
 * Tests for inward_only dependency directionality feature
 */

const { expect } = require('chai');
const { ImportRule } = require('../src/rules/types/import-rule');
const { RuleFactory } = require('../src/rules/factory');
const { RulesEngine } = require('../src/rules');
const MockGraph = global.MockGraph;

describe('inward_only Feature', () => {
  describe('schema validation', () => {
    it('should accept inward_only: true', () => {
      const { ruleSchema } = require('../src/schema/rules-schema');
      const result = ruleSchema.safeParse({
        name: 'Test rule',
        layer: 'src/domain',
        inward_only: true
      });
      expect(result.success).to.be.true;
    });

    it('should reject rule with no constraints', () => {
      const { ruleSchema } = require('../src/schema/rules-schema');
      const result = ruleSchema.safeParse({
        name: 'Invalid rule',
        layer: 'src/domain'
      });
      expect(result.success).to.be.false;
    });

    it('should reject empty constraint arrays', () => {
      const { ruleSchema } = require('../src/schema/rules-schema');
      const result = ruleSchema.safeParse({
        name: 'Invalid rule',
        layer: 'src/domain',
        must_not_import_from: []  // Empty array is truthy but invalid
      });
      expect(result.success).to.be.false;
    });
  });

  describe('factory detection', () => {
    it('should detect inward_only as import type', () => {
      const type = RuleFactory.detectRuleType({
        name: 'Domain isolation',
        layer: 'src/domain',
        inward_only: true
      });
      expect(type).to.equal('import');
    });

    it('should create ImportRule for inward_only config', () => {
      const rules = RuleFactory.createRules({
        rules: [{
          name: 'Domain isolation',
          layer: 'src/domain/**',
          inward_only: true
        }]
      });
      expect(rules).to.have.lengthOf(1);
      expect(rules[0]).to.be.instanceOf(ImportRule);
      expect(rules[0].config.inward_only).to.be.true;
    });
  });

  describe('ImportRule helpers', () => {
    it('should have layerMatchers property', () => {
      const rule = new ImportRule({
        name: 'Test',
        layer: 'src/domain/**',
        inward_only: true
      });
      expect(rule.layerMatchers).to.be.an('array');
      expect(rule.layerMatchers).to.have.lengthOf(1);
    });

    it('should match layers correctly', () => {
      const rule = new ImportRule({
        name: 'Test',
        layer: 'src/domain/**',
        inward_only: true
      });
      expect(rule.matchesLayer('src/domain/foo.js', rule.layerMatchers)).to.be.true;
      expect(rule.matchesLayer('src/ui/foo.js', rule.layerMatchers)).to.be.false;
    });

    it('should resolve relative imports', () => {
      const rule = new ImportRule({
        name: 'Test',
        layer: 'src/domain',
        inward_only: true
      });

      // Same directory
      expect(rule._resolvesTo('./utils.js', 'src/domain/service.js', 'src/domain/utils.js')).to.be.true;

      // Parent directory
      expect(rule._resolvesTo('../utils.js', 'src/domain/sub/utils.js', 'src/domain/utils.js')).to.be.true;

      // External packages don't match
      expect(rule._resolvesTo('lodash', 'src/domain/service.js', 'node_modules/lodash/index.js')).to.be.false;
    });
  });

  describe('cross-layer blocking', () => {
    it('should block imports from another inward_only layer', () => {
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
        layer: 'src/domain/**',
        inward_only: true
      });

      const uiRule = new ImportRule({
        name: 'UI boundary',
        layer: 'src/ui/**',
        inward_only: true
      });

      // Pre-compute matchers (as RulesEngine would)
      const context = {
        inwardOnlyMatchers: new Map([
          ['Domain isolation', {
            pattern: 'src/domain/**',
            matchers: [p => p.startsWith('src/domain/')]
          }],
          ['UI boundary', {
            pattern: 'src/ui/**',
            matchers: [p => p.startsWith('src/ui/')]
          }]
        ])
      };

      // Domain rule should flag UI importing from it
      const violations = domainRule.validate(domainComponent, graph, context);
      expect(violations).to.have.lengthOf(1);
      expect(violations[0].file).to.equal('src/ui/Button.js');
      expect(violations[0].message).to.include('protected layer');
    });

    it('should allow imports from unprotected paths', () => {
      // Setup: Domain imports from shared (no inward_only on shared)
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
        layer: 'src/domain/**',
        inward_only: true
      });

      // Only domain has inward_only
      const context = {
        inwardOnlyMatchers: new Map([
          ['Domain isolation', {
            pattern: 'src/domain/**',
            matchers: [p => p.startsWith('src/domain/')]
          }]
        ])
      };

      // Domain should NOT be flagged for importing from shared
      const violations = domainRule.validate(domainComponent, graph, context);
      expect(violations).to.have.lengthOf(0);
    });

    it('should allow same-layer imports', () => {
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
        layer: 'src/domain/**',
        inward_only: true
      });

      const context = {
        inwardOnlyMatchers: new Map([
          ['Domain isolation', {
            pattern: 'src/domain/**',
            matchers: [p => p.startsWith('src/domain/')]
          }]
        ])
      };

      // No violations - same layer
      const violations = domainRule.validate(domainUtils, graph, context);
      expect(violations).to.have.lengthOf(0);
    });
  });

  describe('security limits', () => {
    it('should enforce pattern length limit', () => {
      const longPattern = 'src/' + 'a'.repeat(250);
      expect(() => {
        RuleFactory.createRules({
          rules: [{
            name: 'Long pattern',
            layer: longPattern,
            inward_only: true
          }]
        });
      }).to.throw(/too long/i);
    });

    it('should enforce brace depth limit', () => {
      // Use nested braces or multiple brace groups to exceed MAX_BRACE_DEPTH (3)
      expect(() => {
        RuleFactory.createRules({
          rules: [{
            name: 'Deep braces',
            layer: 'src/{a,b}/{c,d}/{e,f}/{g,h}',  // 4 opening braces
            inward_only: true
          }]
        });
      }).to.throw(/too many braces/i);
    });

    it('should enforce max inward_only rules limit', () => {
      const engine = new RulesEngine();

      // Create 51 inward_only rules
      const rules = [];
      for (let i = 0; i < 51; i++) {
        rules.push(new ImportRule({
          name: `Rule ${i}`,
          layer: `src/layer${i}/**`,
          inward_only: true
        }));
      }

      const graph = new MockGraph([]);

      expect(() => {
        engine.validate(rules, graph);
      }).to.throw(/Too many inward_only rules/);
    });
  });
});
