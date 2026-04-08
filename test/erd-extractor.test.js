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
});
