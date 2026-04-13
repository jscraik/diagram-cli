const { expect } = require('chai');
const {
  extractImports,
  extractImportsWithPositions,
} = require('../src/core/analysis-generation-utils-core');

describe('analysis generation core utils', () => {
  it('extracts JavaScript imports in source order', () => {
    const content = [
      'import api from "axios";',
      'const db = require("pg");',
      'const lazy = import("openai");',
    ].join('\n');

    expect(extractImports(content, 'javascript')).to.deep.equal(['axios', 'pg', 'openai']);
  });

  it('extracts import positions for JavaScript, including multiple matches on one line', () => {
    const content = 'import api from "axios"; const db = require("pg"); const lazy = import("openai");';

    expect(extractImportsWithPositions(content, 'javascript')).to.deep.equal([
      { path: 'axios', line: 1 },
      { path: 'pg', line: 1 },
      { path: 'openai', line: 1 },
    ]);
  });

  it('extracts import positions for python modules', () => {
    const content = [
      'from os import path',
      'import requests',
    ].join('\n');

    expect(extractImportsWithPositions(content, 'python')).to.deep.equal([
      { path: 'os', line: 1 },
      { path: 'requests', line: 2 },
    ]);
  });

  it('extracts Go imports from block syntax with positions', () => {
    const content = [
      'package demo',
      'import (',
      '  "fmt"',
      '  alias "os"',
      ')',
    ].join('\n');

    expect(extractImports(content, 'go')).to.deep.equal(['fmt', 'os']);
    expect(extractImportsWithPositions(content, 'go')).to.deep.equal([
      { path: 'fmt', line: 2 },
      { path: 'os', line: 3 },
    ]);
  });
});
