const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SOURCE_PRECEDENCE, extractErdModel, __test } = require('../src/schema/erd-extractor');

const {
  SCHEMA_PARSERS,
  inferRelationshipsFromForeignKeyNames,
  parseJsonSchema,
  parsePrismaSchema,
  parseSqlSchema,
  relationshipKey,
  splitSqlTypeAndRemainder,
} = __test;

function fixturePath(name) {
  return path.join(__dirname, 'fixtures', 'erd', name);
}

function hasRelationship(extracted, fromEntity, toEntity, provenance = 'explicit') {
  return extracted.model.relationships.some((relationship) =>
    relationship.fromEntity === fromEntity
    && relationship.toEntity === toEntity
    && relationship.provenance === provenance
  );
}

function findRelationship(extracted, fromEntity, toEntity, cardinality, provenance = 'explicit') {
  return extracted.model.relationships.find((relationship) =>
    relationship.fromEntity === fromEntity
    && relationship.toEntity === toEntity
    && relationship.cardinality === cardinality
    && relationship.provenance === provenance
  );
}

function findEntity(extracted, name) {
  return extracted.model.entities.find((entity) => entity.name === name);
}

function createMixedSourceWorkspace() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-cli-erd-mixed-'));
  fs.mkdirSync(path.join(workspace, 'prisma'), { recursive: true });
  fs.mkdirSync(path.join(workspace, 'contracts'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'prisma', 'schema.prisma'), [
    'model User {',
    '  id String @id',
    '  email String @unique',
    '}',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(workspace, 'contracts', 'event.schema.json'), JSON.stringify({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'AuditEvent',
    type: 'object',
    properties: {
      id: { type: 'string' },
      user: { $ref: '#/$defs/UserRef' },
    },
    required: ['id', 'user'],
    $defs: {
      UserRef: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, null, 2));
  return workspace;
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

    expect(hasRelationship(extracted, 'TICKET', 'USER')).to.equal(true);
    expect(hasRelationship(extracted, 'USER', 'TICKET')).to.equal(false);
  });

  it('marks missing schema sources with failed_no_schema', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('no-schema') });

    expect(extracted.terminalClass).to.equal('failed_no_schema');
    expect(extracted.sourceFiles).to.deep.equal([]);
    expect(extracted.sourceFilesByKind).to.deep.equal({});
    expect(extracted.model.entities).to.have.length(0);
    expect(extracted.diagnostics[0]).to.include('no supported schema sources found');
    expect(extracted.diagnostics[0]).to.include('.schema.json');
  });

  it('extracts entities, attributes, and explicit relationships from JSON Schema contracts', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('contract-schema-json') });

    expect(extracted.terminalClass).to.equal('completed');
    expect(extracted.sourceFiles).to.deep.equal(['manifest.schema.json']);
    expect(extracted.sourceFilesByKind).to.deep.equal({
      'json-schema': ['manifest.schema.json'],
    });
    expect(extracted.sourcePrecedence).to.deep.equal(['prisma', 'sql', 'json-schema']);
    expect(extracted.model.entities.map((entity) => entity.name)).to.deep.equal([
      'AGENTRUNEVENT',
      'AGENTRUNMANIFEST',
      'REVIEWER',
    ]);

    const manifest = findEntity(extracted, 'AGENTRUNMANIFEST');
    expect(manifest.attributes).to.deep.include({
      name: 'runId',
      type: 'string',
      nullable: false,
      keyFlags: [],
    });
    expect(manifest.attributes).to.deep.include({
      name: 'eventId',
      type: 'string',
      nullable: true,
      keyFlags: [],
    });
    expect(manifest.attributes).to.deep.include({
      name: 'currentEvent',
      type: 'AgentRunEvent',
      nullable: false,
      keyFlags: [],
    });
    expect(manifest.attributes).to.deep.include({
      name: 'events',
      type: 'array',
      nullable: true,
      keyFlags: [],
    });

    expect(findRelationship(extracted, 'AGENTRUNMANIFEST', 'AGENTRUNEVENT', '}o--||')).to.include({
      provenance: 'explicit',
    });
    expect(findRelationship(extracted, 'AGENTRUNMANIFEST', 'AGENTRUNEVENT', '||--o{')).to.include({
      provenance: 'explicit',
    });
    expect(findRelationship(extracted, 'AGENTRUNEVENT', 'REVIEWER', '}o--||')).to.include({
      provenance: 'explicit',
    });
  });

  it('reports unsupported JSON Schema references without fabricating relationships', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('contract-schema-json-diagnostics') });

    expect(extracted.terminalClass).to.equal('completed');
    expect(extracted.sourceFiles).to.deep.equal(['problem.schema.json']);
    expect(extracted.sourceFilesByKind).to.deep.equal({
      'json-schema': ['problem.schema.json'],
    });

    const diagnostics = extracted.diagnostics.join('\n');
    expect(diagnostics).to.include('remote_ref_unsupported');
    expect(diagnostics).to.include('cross_file_ref_unsupported');
    expect(diagnostics).to.include('local_ref_unresolved');
    expect(diagnostics).to.include('non_object_definition_ignored');
    expect(diagnostics).to.include('composition_unsupported');

    const manifest = findEntity(extracted, 'PROBLEMMANIFEST');
    expect(manifest.attributes).to.deep.include({
      name: 'escapedRef',
      type: 'Path_Token',
      nullable: true,
      keyFlags: [],
    });
    expect(findRelationship(extracted, 'PROBLEMMANIFEST', 'PATH_TOKEN', '}o--||')).to.include({
      provenance: 'explicit',
    });
    expect(hasRelationship(extracted, 'PROBLEMMANIFEST', 'MISSINGTHING')).to.equal(false);
    expect(hasRelationship(extracted, 'PROBLEMMANIFEST', 'THING')).to.equal(false);
  });

  it('honors caller-provided ignore patterns when discovering schema sources', () => {
    const extracted = extractErdModel({
      rootPath: fixturePath('explicit-schema'),
      ignore: ['prisma/**'],
    });

    expect(extracted.terminalClass).to.equal('failed_no_schema');
    expect(extracted.sourceFiles).to.deep.equal([]);
    expect(extracted.sourceFilesByKind).to.deep.equal({});
  });

  it('reports mixed source-kind evidence in source precedence order', () => {
    const workspace = createMixedSourceWorkspace();
    try {
      const extracted = extractErdModel({ rootPath: workspace });

      expect(extracted.terminalClass).to.equal('completed');
      expect(extracted.sourceFiles).to.deep.equal([
        'prisma/schema.prisma',
        'contracts/event.schema.json',
      ]);
      expect(extracted.sourceFilesByKind).to.deep.equal({
        prisma: ['prisma/schema.prisma'],
        'json-schema': ['contracts/event.schema.json'],
      });
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('infers relationships from *_id fields when explicit FK constraints are absent', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('inferred-heavy') });

    expect(extracted.terminalClass).to.equal('completed');
    expect(hasRelationship(extracted, 'COMMENTS', 'USERS', 'inferred')).to.equal(true);
  });

  it('supports schema-qualified SQL table names and references', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-schema-qualified') });

    expect(extracted.terminalClass).to.equal('completed');
    expect(extracted.model.entities.map((entity) => entity.name)).to.deep.equal(['SESSIONS', 'USERS']);
    expect(hasRelationship(extracted, 'SESSIONS', 'USERS')).to.equal(true);
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

    expect(hasRelationship(extracted, 'SESSIONS', 'USERS')).to.equal(true);
  });

  it('parses sequential SQL CREATE TABLE blocks without semicolons', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-no-semicolon') });

    expect(extracted.terminalClass).to.equal('completed');
    expect(extracted.model.entities.map((entity) => entity.name)).to.deep.equal(['COMMENTS', 'USERS']);
    expect(hasRelationship(extracted, 'COMMENTS', 'USERS')).to.equal(true);
  });

  it('retains multi-word SQL types while splitting trailing constraints', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-multiword-types') });

    expect(extracted.terminalClass).to.equal('completed');
    const orders = extracted.model.entities.find((entity) => entity.name === 'ORDERS');
    expect(orders).to.exist;

    const createdAt = orders.attributes.find((attribute) => attribute.name === 'created_at');
    const amount = orders.attributes.find((attribute) => attribute.name === 'amount');
    const displayName = orders.attributes.find((attribute) => attribute.name === 'display_name');

    expect(createdAt.type).to.equal('timestamp_with_time_zone');
    expect(createdAt.nullable).to.equal(false);
    expect(amount.type).to.equal('double_precision');
    expect(amount.nullable).to.equal(false);
    expect(displayName.type).to.equal('character_varying_255_');
    expect(displayName.nullable).to.equal(false);
  });

  it('parses quoted SQL column identifiers with spaces, hyphens, and leading digits', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-quoted-identifiers') });

    expect(extracted.terminalClass).to.equal('completed');
    expect(extracted.model.entities.map((entity) => entity.name)).to.deep.equal(['SESSIONS', 'USERS']);

    const users = extracted.model.entities.find((entity) => entity.name === 'USERS');
    expect(users).to.exist;
    expect(users.attributes.map((attribute) => attribute.name)).to.include('2fa_enabled');
    expect(users.attributes.map((attribute) => attribute.name)).to.include('display_name');

    const sessions = extracted.model.entities.find((entity) => entity.name === 'SESSIONS');
    expect(sessions).to.exist;
    const userId = sessions.attributes.find((attribute) => attribute.name === 'user_id');
    expect(userId).to.exist;
    expect(userId.keyFlags).to.include('FK');

    expect(hasRelationship(extracted, 'SESSIONS', 'USERS')).to.equal(true);
  });

  it('marks sources with no extractable entities as failed_parse', () => {
    const extracted = extractErdModel({ rootPath: fixturePath('sql-no-table') });

    expect(extracted.terminalClass).to.equal('failed_parse');
    expect(extracted.model.entities).to.have.length(0);
    expect(extracted.diagnostics[0]).to.include('schema sources found but no ERD entities extracted');
  });
});

describe('erd extractor helpers', () => {
  describe('SCHEMA_PARSERS dispatch', () => {
    it('maps prisma to parsePrismaSchema', () => {
      expect(SCHEMA_PARSERS.prisma).to.equal(parsePrismaSchema);
    });

    it('maps sql to parseSqlSchema', () => {
      expect(SCHEMA_PARSERS.sql).to.equal(parseSqlSchema);
    });

    it('maps json-schema to parseJsonSchema', () => {
      expect(parseJsonSchema).to.be.a('function');
      expect(SCHEMA_PARSERS['json-schema']).to.equal(parseJsonSchema);
    });
  });

  describe('SOURCE_PRECEDENCE', () => {
    it('checks JSON Schema after database-native sources', () => {
      expect(SOURCE_PRECEDENCE).to.deep.equal(['prisma', 'sql', 'json-schema']);
    });
  });

  describe('splitSqlTypeAndRemainder', () => {
    it('preserves multi-word SQL types before constraints', () => {
      const parsed = splitSqlTypeAndRemainder('TIMESTAMP WITH TIME ZONE NOT NULL');
      expect(parsed.columnType).to.equal('TIMESTAMP WITH TIME ZONE');
      expect(parsed.remainder).to.equal('NOT NULL');
    });

    it('does not split on constraint keywords inside quoted literals', () => {
      const parsed = splitSqlTypeAndRemainder("ENUM('not null', 'active') DEFAULT 'active'");
      expect(parsed.columnType).to.equal("ENUM('not null', 'active')");
      expect(parsed.remainder).to.equal("DEFAULT 'active'");
    });

    it('respects parenthesis depth when scanning constraints', () => {
      const parsed = splitSqlTypeAndRemainder('NUMERIC(10,2) NOT NULL');
      expect(parsed.columnType).to.equal('NUMERIC(10,2)');
      expect(parsed.remainder).to.equal('NOT NULL');
    });
  });

  describe('relationship inference deduplication', () => {
    it('returns stable keys for canonicalized entity pairs', () => {
      const key1 = relationshipKey('users', 'ORDERS');
      const key2 = relationshipKey('USERS', 'orders');
      expect(key1).to.equal(key2);
    });

    it('skips inferred relationships when explicit relationships exist for the same pair', () => {
      const entities = [
        { name: 'orders', attributes: [{ name: 'id' }, { name: 'user_id' }] },
        { name: 'users', attributes: [{ name: 'id' }] },
      ];
      const explicitRelationships = [{ fromEntity: 'ORDERS', toEntity: 'USERS', cardinality: '}o--||' }];
      const inferred = inferRelationshipsFromForeignKeyNames(entities, explicitRelationships);
      expect(inferred).to.have.length(0);
    });

    it('does not infer self-relationships from an entity own id field', () => {
      const entities = [
        { name: 'reviewer', attributes: [{ name: 'reviewerId' }] },
      ];
      const inferred = inferRelationshipsFromForeignKeyNames(entities, []);
      expect(inferred).to.have.length(0);
    });
  });
});
