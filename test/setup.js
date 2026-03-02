/**
 * Test setup and utilities
 */

const path = require('path');

// Set test environment
process.env.NODE_ENV = 'test';

// Global test utilities
global.testDir = path.join(__dirname, 'fixtures');

/**
 * Create a mock graph for testing
 */
class MockGraph {
  constructor(components = []) {
    this.components = components;
    this._componentByName = new Map();
    this._dependents = new Map();

    for (const c of components) {
      if (c.name) {
        this._componentByName.set(c.name, c);
        this._dependents.set(c.name, []);
      }
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

global.MockGraph = MockGraph;

/**
 * Assert helpers
 */
const chai = require('chai');
global.expect = chai.expect;
global.assert = chai.assert;
