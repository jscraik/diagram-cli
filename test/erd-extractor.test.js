const { expect } = require('chai');
const path = require('path');
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
  });

  it('marks missing schema sources with failed_no_schema', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('no-schema') });

    expect(extracted.terminalClass).to.equal('failed_no_schema');
    expect(extracted.model.entities).to.have.length(0);
    expect(extracted.diagnostics[0]).to.include('no supported schema sources found');
  });

  it('infers relationships from *_id fields when explicit FK constraints are absent', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('inferred-heavy') });

    expect(extracted.terminalClass).to.equal('completed');
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

  it('extracts table-level SQL constraints into key flags and relationships', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-table-constraints') });

    expect(extracted.terminalClass).to.equal('completed');

    const users = extracted.model.entities.find((entity) => entity.name === 'USERS');
    expect(users).to.exist;
    const userId = users.attributes.find((attribute) => attribute.name === 'id');
    const email = users.attributes.find((attribute) => attribute.name === 'email');
    expect(userId.keyFlags).to.include('PK');
    expect(email.keyFlags).to.include('UK');

    const sessions = extracted.model.entities.find((entity) => entity.name === 'SESSIONS');
    expect(sessions).to.exist;
    const userIdFk = sessions.attributes.find((attribute) => attribute.name === 'user_id');
    expect(userIdFk.keyFlags).to.include('FK');

    expect(extracted.model.relationships.some((relationship) =>
      relationship.fromEntity === 'SESSIONS'
      && relationship.toEntity === 'USERS'
      && relationship.provenance === 'explicit'
    )).to.equal(true);
  });

  it('parses sequential SQL CREATE TABLE blocks without semicolons', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-no-semicolon') });

    expect(extracted.terminalClass).to.equal('completed');
    expect(extracted.model.entities.map((entity) => entity.name)).to.deep.equal(['COMMENTS', 'USERS']);
    expect(extracted.model.relationships.some((relationship) =>
      relationship.fromEntity === 'COMMENTS'
      && relationship.toEntity === 'USERS'
      && relationship.provenance === 'explicit'
    )).to.equal(true);
  });

  it('marks sources with no extractable entities as failed_parse', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-no-table') });

    expect(extracted.terminalClass).to.equal('failed_parse');
    expect(extracted.model.entities).to.have.length(0);
    expect(extracted.diagnostics[0]).to.include('schema sources found but no ERD entities extracted');
  });
});
