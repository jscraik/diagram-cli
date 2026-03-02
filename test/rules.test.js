/**
 * Tests for architecture rules validation
 */

const { expect } = require('chai');
const { ImportRule } = require('../src/rules/types/import-rule');
const { RuleFactory } = require('../src/rules/factory');
const { RulesEngine } = require('../src/rules');
const MockGraph = global.MockGraph;

describe('ImportRule', () => {
  describe('basic constraints', () => {
    it('should detect forbidden imports', () => {
      const rule = new ImportRule({
        name: 'Domain isolation',
        layer: 'src/domain',
        must_not_import_from: ['src/ui']
      });

      const file = {
        name: 'domain/UserService',
        filePath: 'src/domain/UserService.js',
        imports: [{ path: '../ui/Button', line: 5 }]
      };

      const violations = rule.validate(file, new MockGraph([file]));
      expect(violations).to.have.lengthOf(1);
      expect(violations[0].message).to.include('Forbidden import');
    });

    it('should allow whitelisted imports', () => {
      const rule = new ImportRule({
        name: 'API contract',
        layer: 'src/api',
        may_import_from: ['src/domain', 'src/shared']
      });

      const file = {
        name: 'api/users',
        filePath: 'src/api/users.js',
        imports: [{ path: '../domain/User', line: 3 }]
      };

      const violations = rule.validate(file, new MockGraph([file]));
      expect(violations).to.have.lengthOf(0);
    });

    it('should block non-whitelisted imports', () => {
      const rule = new ImportRule({
        name: 'API contract',
        layer: 'src/api',
        may_import_from: ['src/domain']
      });

      const file = {
        name: 'api/users',
        filePath: 'src/api/users.js',
        imports: [{ path: '../ui/Button', line: 3 }]
      };

      const violations = rule.validate(file, new MockGraph([file]));
      expect(violations).to.have.lengthOf(1);
      expect(violations[0].message).to.include('not in whitelist');
    });

    it('should enforce required imports', () => {
      const rule = new ImportRule({
        name: 'Shared utils',
        layer: 'src/shared',
        must_import_from: ['src/types']
      });

      const file = {
        name: 'shared/helpers',
        filePath: 'src/shared/helpers.js',
        imports: [] // Missing required import
      };

      const violations = rule.validate(file, new MockGraph([file]));
      expect(violations).to.have.lengthOf(1);
      expect(violations[0].message).to.include('Missing required import');
    });
  });

  describe('pattern matching', () => {
    it('should match subdirectories', () => {
      const rule = new ImportRule({
        name: 'Domain',
        layer: 'src/domain/**',
        must_not_import_from: ['src/ui']
      });

      const file = {
        name: 'domain/user/UserService',
        filePath: 'src/domain/user/UserService.js',
        imports: [{ path: '../../ui/Button', line: 5 }]
      };

      const violations = rule.validate(file, new MockGraph([file]));
      expect(violations).to.have.lengthOf(1);
    });

    it('should handle external packages', () => {
      const rule = new ImportRule({
        name: 'Domain',
        layer: 'src/domain',
        may_import_from: ['src/shared']  // lodash not in whitelist
      });

      const file = {
        name: 'domain/User',
        filePath: 'src/domain/User.js',
        imports: [{ path: 'lodash', line: 1 }]  // External - should be blocked
      };

      const violations = rule.validate(file, new MockGraph([file]));
      expect(violations).to.have.lengthOf(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty imports', () => {
      const rule = new ImportRule({
        name: 'Test',
        layer: 'src/test',
        must_not_import_from: ['src/ui']
      });

      const file = {
        name: 'test/empty',
        filePath: 'src/test/empty.js',
        imports: []
      };

      const violations = rule.validate(file, new MockGraph([file]));
      expect(violations).to.have.lengthOf(0);
    });

    it('should handle malformed import objects', () => {
      const rule = new ImportRule({
        name: 'Test',
        layer: 'src/test',
        must_not_import_from: ['src/ui']
      });

      const file = {
        name: 'test/malformed',
        filePath: 'src/test/malformed.js',
        imports: [null, { path: null }, 'string-import']
      };

      const violations = rule.validate(file, new MockGraph([file]));
      expect(violations).to.have.lengthOf(0);
    });
  });
});
