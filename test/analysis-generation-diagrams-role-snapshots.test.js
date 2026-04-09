const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { generate } = require('../src/core/analysis-generation');
const {
  classifyExternalPackage,
} = require('../src/core/analysis-generation-diagrams-role-ai-context');

const fixtureDir = path.join(__dirname, 'fixtures', 'analysis-generation');

const snapshotAnalysis = {
  rootPath: '/tmp/diagram-snapshot-project',
  entryPoints: [],
  components: [
    {
      name: 'web-ui',
      originalName: 'web-ui',
      type: 'service',
      roleTags: ['user'],
      dependencies: ['auth-service', 'orders-db', 'agent-worker', 'event-bus'],
      imports: [{ path: 'stripe' }, { path: '@sendgrid/mail' }, { path: 'pg' }],
    },
    {
      name: 'auth-service',
      originalName: 'auth-service',
      type: 'service',
      roleTags: ['auth', 'security'],
      dependencies: ['orders-db'],
      imports: [{ path: '@octokit/rest' }, { path: 'passport' }],
    },
    {
      name: 'orders-db',
      originalName: 'orders-db',
      type: 'service',
      roleTags: ['database', 'memory'],
      dependencies: [],
      imports: [{ path: 'pg' }],
    },
    {
      name: 'event-bus',
      originalName: 'event-bus',
      type: 'service',
      roleTags: ['events'],
      dependencies: [],
      imports: [{ path: '@aws-sdk/client-s3' }],
    },
    {
      name: 'agent-worker',
      originalName: 'agent-worker',
      type: 'service',
      roleTags: ['agent', 'llm', 'tool', 'integrations'],
      dependencies: ['orders-db', 'event-bus'],
      imports: [{ path: 'openai' }, { path: '@slack/web-api' }],
    },
    {
      name: 'security-gateway',
      originalName: 'security-gateway',
      type: 'service',
      roleTags: ['security', 'integrations'],
      dependencies: ['auth-service'],
      imports: [{ path: 'twilio' }],
    },
  ],
};

function readSnapshot(type) {
  const filePath = path.join(fixtureDir, `${type}.mmd`);
  return fs.readFileSync(filePath, 'utf8').trimEnd();
}

describe('analysis generation role diagrams snapshots', () => {
  const diagramTypes = ['database', 'user', 'events', 'auth', 'security', 'c4context', 'rag'];

  for (const type of diagramTypes) {
    it(`matches the ${type} snapshot`, () => {
      const output = generate(snapshotAnalysis, type).trimEnd();
      const expected = readSnapshot(type);
      expect(output).to.equal(expected);
    });
  }

  it('classifies external package categories through rule-table mapping', () => {
    expect(classifyExternalPackage('stripe')).to.equal('payment');
    expect(classifyExternalPackage('@sendgrid/mail')).to.equal('email');
    expect(classifyExternalPackage('pg')).to.equal('external');
    expect(classifyExternalPackage('@octokit/rest')).to.equal('vcs');
    expect(classifyExternalPackage('@slack/web-api')).to.equal('messaging');
    expect(classifyExternalPackage('@aws-sdk/client-s3')).to.equal('cloud');
  });
});
