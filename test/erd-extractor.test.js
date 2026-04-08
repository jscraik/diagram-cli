const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const { SOURCE_PRECEDENCE, extractErdModel } = require('../src/schema/erd-extractor');

function fixturePath(name) {
  return path.join(__dirname, 'fixtures', 'erd', name);
}

describe('erd extractor', () => {
  it('extracts explicit Prisma entities, keys, and relationships', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('explicit-schema') });

    expect(extracted.terminalClass).to.equal('completed');
    expect(extracted.sourcePrecedence).to.deep.equal(SOURCE_PRECEDENCE);
    expect(extracted.model.entities.map((entity) => entity.name)).to.deep.equal(['TICKET', 'USER']);

    const ticket = extracted.model.entities.find((entity) => entity.name === 'TICKET');
    expect(ticket).to.exist;
    const authorId = ticket.attributes.find((attribute) => attribute.name === 'authorId');
    expect(authorId).to.exist;
    expect(authorId.keyFlags).to.include('FK');

    const user = extracted.model.entities.find((entity) => entity.name === 'USER');
    const email = user.attributes.find((attribute) => attribute.name === 'email');
    expect(email.keyFlags).to.include('UK');

    expect(extracted.model.relationships.some((relationship) =>
      relationship.fromEntity === 'TICKET'
      && relationship.toEntity === 'USER'
      && relationship.provenance === 'explicit'
    )).to.equal(true);
    expect(extracted.model.relationships.some((relationship) =>
      relationship.fromEntity === 'USER'
      && relationship.toEntity === 'TICKET'
      && relationship.provenance === 'explicit'
    )).to.equal(false);
    expect(extracted.model.relationships.filter((relationship) =>
      relationship.provenance === 'explicit'
    )).to.have.length(1);
  });

  it('marks missing schema sources with failed_no_schema', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('no-schema') });

    expect(extracted.terminalClass).to.equal('failed_no_schema');
    expect(extracted.model.entities).to.have.length(0);
    expect(extracted.diagnostics[0]).to.include('no supported schema sources found');
  });

  it('infers relationships from *_id fields when explicit FK constraints are absent', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('inferred-heavy') });
    const inferredCount = extracted.model.relationships.filter(
      (relationship) => relationship.provenance === 'inferred'
    ).length;

    expect(extracted.terminalClass).to.equal('completed');
    expect(inferredCount).to.be.greaterThan(0);
    expect(extracted.model.relationships.some((relationship) =>
      relationship.fromEntity === 'COMMENTS'
      && relationship.toEntity === 'USERS'
      && relationship.provenance === 'inferred'
    )).to.equal(true);
  });

  it('supports schema-qualified SQL table names and references', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-schema-qualified') });

    expect(extracted.terminalClass).to.equal('completed');
    expect(extracted.model.entities.map((entity) => entity.name)).to.deep.equal(['SESSIONS', 'USERS']);
    expect(extracted.model.relationships.some((relationship) =>
      relationship.fromEntity === 'SESSIONS'
      && relationship.toEntity === 'USERS'
      && relationship.provenance === 'explicit'
    )).to.equal(true);
  });

  it('applies table-level SQL PK/UK/FK constraints to attribute key flags', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-table-constraints') });

    expect(extracted.terminalClass).to.equal('completed');

    const users = extracted.model.entities.find((entity) => entity.name === 'USERS');
    expect(users).to.exist;
    const id = users.attributes.find((attribute) => attribute.name === 'id');
    const email = users.attributes.find((attribute) => attribute.name === 'email');
    const primaryPseudoColumn = users.attributes.find((attribute) => attribute.name === 'PRIMARY');
    expect(id.keyFlags).to.include('PK');
    expect(email.keyFlags).to.include('UK');
    expect(primaryPseudoColumn).to.equal(undefined);

    const sessions = extracted.model.entities.find((entity) => entity.name === 'SESSIONS');
    const userId = sessions.attributes.find((attribute) => attribute.name === 'user_id');
    expect(userId.keyFlags).to.include('FK');
    expect(extracted.model.relationships.some((relationship) =>
      relationship.fromEntity === 'SESSIONS'
      && relationship.toEntity === 'USERS'
      && relationship.provenance === 'explicit'
    )).to.equal(true);
  });

  it('parses CREATE TABLE definitions without trailing semicolons', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-erd-no-semi-'));
    const sqlPath = path.join(workspace, 'schema.sql');
    fs.writeFileSync(sqlPath, `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE
)

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id)
)
`);

    const extracted = extractErdModel({ rootPath: workspace });
    expect(extracted.terminalClass).to.equal('completed');
    expect(extracted.model.entities.map((entity) => entity.name)).to.include('USERS');
    expect(extracted.model.entities.map((entity) => entity.name)).to.include('SESSIONS');
  });

  it('marks sources with no extractable entities as failed_parse', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-no-table') });

    expect(extracted.terminalClass).to.equal('failed_parse');
    expect(extracted.model.entities).to.have.length(0);
    expect(extracted.diagnostics[0]).to.include('schema sources found but no ERD entities extracted');
  });
});
