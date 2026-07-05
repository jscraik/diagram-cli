const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { canonicalEntityName, normalizeErdModel } = require('./erd-model');

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/test/fixtures/**',
  '**/tests/fixtures/**',
  '**/__fixtures__/**',
];
const SOURCE_PRECEDENCE = Object.freeze(['prisma', 'sql', 'json-schema']);
const SOURCE_FILE_PATTERNS = Object.freeze({
  prisma: '**/schema.prisma',
  sql: '**/*.sql',
  'json-schema': '**/*.schema.json',
});
const PRISMA_SCALAR_TYPES = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes']);
const SQL_IDENTIFIER_SOURCE = '(?:["`][^"`]+["`]|[A-Za-z_][A-Za-z0-9_]*)';
const SQL_QUALIFIED_IDENTIFIER_SOURCE = `${SQL_IDENTIFIER_SOURCE}(?:\\s*\\.\\s*${SQL_IDENTIFIER_SOURCE})?`;
const SQL_CREATE_TABLE_RE = new RegExp(
  `\\bcreate\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(${SQL_QUALIFIED_IDENTIFIER_SOURCE})\\s*\\(([\\s\\S]*?)\\)\\s*(?:;|(?=\\s*(?:create\\s+table\\b|$)))`,
  'gi'
);
const SQL_INLINE_REFERENCES_RE = new RegExp(`\\breferences\\s+(${SQL_QUALIFIED_IDENTIFIER_SOURCE})`, 'i');
const SQL_TABLE_PRIMARY_KEY_RE = /^(?:constraint\s+\S+\s+)?primary\s+key\s*\(([^)]+)\)/i;
const SQL_TABLE_UNIQUE_RE = /^(?:constraint\s+\S+\s+)?unique\s*\(([^)]+)\)/i;
const SQL_TABLE_FOREIGN_KEY_RE = new RegExp(
  `^(?:constraint\\s+\\S+\\s+)?foreign\\s+key\\s*\\(([^)]+)\\)\\s+references\\s+(${SQL_QUALIFIED_IDENTIFIER_SOURCE})`,
  'i'
);
const SQL_TABLE_CONSTRAINT_LINE_RE = /^(?:constraint|foreign\s+key|primary\s+key|unique)\b/i;
const SQL_COLUMN_NAME_AND_BODY_RE = new RegExp(`^(${SQL_IDENTIFIER_SOURCE})\\s+([\\s\\S]+)$`, 'i');
const SQL_COLUMN_CONSTRAINT_STARTERS = new Set([
  'constraint',
  'not',
  'null',
  'default',
  'references',
  'primary',
  'unique',
  'check',
  'generated',
  'collate',
]);
const SCHEMA_PARSERS = Object.freeze({
  prisma: parsePrismaSchema,
  sql: parseSqlSchema,
  'json-schema': parseJsonSchema,
});

function parsePrismaField(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return null;

  const name = parts[0];
  const rawType = parts[1];
  const rest = parts.slice(2).join(' ');
  const isArray = rawType.endsWith('[]');
  const nullable = rawType.endsWith('?');
  const baseType = rawType.replace(/\?$/, '').replace(/\[\]$/, '');
  const keyFlags = [];

  if (/\@id\b/.test(rest)) keyFlags.push('PK');
  if (/\@unique\b/.test(rest)) keyFlags.push('UK');

  const relationMatch = rest.match(/\@relation\s*\(([\s\S]*?)\)/);
  const relationMeta = relationMatch ? relationMatch[1] : '';
  const fieldListMatch = relationMeta.match(/fields\s*:\s*\[([^\]]+)\]/i);
  const relationFields = fieldListMatch
    ? fieldListMatch[1]
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean)
    : [];

  const isRelationType = /^[A-Z]/.test(baseType) && !PRISMA_SCALAR_TYPES.has(baseType);

  return {
    name,
    type: baseType,
    nullable,
    isArray,
    isRelationType,
    relationFields,
    keyFlags,
  };
}

function parsePrismaSchema(fileContent) {
  const entities = [];
  const relationships = [];
  const modelRe = /\bmodel\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\}/g;
  let match;

  while ((match = modelRe.exec(fileContent)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const fields = body.split(/\r?\n/).map(parsePrismaField).filter(Boolean);
    const attributes = fields
      .filter((field) => !field.isRelationType)
      .map((field) => ({
        name: field.name,
        type: field.type,
        nullable: field.nullable,
        keyFlags: [...field.keyFlags],
      }));
    const attributesByName = new Map(attributes.map((attribute) => [attribute.name, attribute]));

    for (const field of fields) {
      for (const relationField of field.relationFields) {
        const attribute = attributesByName.get(relationField);
        if (attribute && !attribute.keyFlags.includes('FK')) {
          attribute.keyFlags.push('FK');
        }
      }
    }

    entities.push({
      name: modelName,
      source: 'explicit',
      attributes,
    });

    for (const field of fields) {
      if (!field.isRelationType) continue;
      if ((field.relationFields || []).length === 0) continue;
      const cardinality = field.isArray ? '||--o{' : '}o--||';
      relationships.push({
        fromEntity: modelName,
        toEntity: field.type,
        cardinality,
        provenance: 'explicit',
      });
    }
  }

  return { entities, relationships };
}

function splitSqlDefinitions(body) {
  const chunks = [];
  let cursor = '';
  let depth = 0;
  for (const char of body) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      chunks.push(cursor.trim());
      cursor = '';
      continue;
    }
    cursor += char;
  }
  if (cursor.trim()) chunks.push(cursor.trim());
  return chunks;
}

function tableNameFromSql(token) {
  const normalized = String(token || '').trim().replace(/\s*\.\s*/g, '.');
  if (!normalized) return '';
  const base = normalized.split('.').pop() || normalized;
  return base.replace(/^["`]/, '').replace(/["`]$/, '');
}

function parseSqlIdentifierList(tokenList) {
  return String(tokenList || '')
    .split(',')
    .map((token) => tableNameFromSql(token))
    .filter(Boolean);
}

function addSqlKeyFlags(attributeMap, columns, flag) {
  for (const column of columns) {
    const attribute = attributeMap.get(String(column).toLowerCase());
    if (!attribute) continue;
    if (!attribute.keyFlags.includes(flag)) {
      attribute.keyFlags.push(flag);
    }
  }
}

function pushExplicitSqlRelationship(relationships, fromEntity, toEntityToken) {
  const toEntity = tableNameFromSql(toEntityToken);
  if (!toEntity) return;
  relationships.push({
    fromEntity,
    toEntity,
    cardinality: '}o--||',
    provenance: 'explicit',
  });
}

function applyTableConstraint(line, tableName, attributeMap, relationships) {
  const primaryMatch = line.match(SQL_TABLE_PRIMARY_KEY_RE);
  if (primaryMatch) {
    addSqlKeyFlags(attributeMap, parseSqlIdentifierList(primaryMatch[1]), 'PK');
    return;
  }

  const uniqueMatch = line.match(SQL_TABLE_UNIQUE_RE);
  if (uniqueMatch) {
    addSqlKeyFlags(attributeMap, parseSqlIdentifierList(uniqueMatch[1]), 'UK');
    return;
  }

  const foreignKeyMatch = line.match(SQL_TABLE_FOREIGN_KEY_RE);
  if (!foreignKeyMatch) return;

  addSqlKeyFlags(attributeMap, parseSqlIdentifierList(foreignKeyMatch[1]), 'FK');
  pushExplicitSqlRelationship(relationships, tableName, foreignKeyMatch[2]);
}

function splitSqlTypeAndRemainder(columnBody) {
  const body = String(columnBody || '').trim();
  if (!body) return { columnType: '', remainder: '' };

  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktickQuote = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const prev = body[index - 1];

    if (!inDoubleQuote && !inBacktickQuote && char === '\'' && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (!inSingleQuote && !inBacktickQuote && char === '"' && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (!inSingleQuote && !inDoubleQuote && char === '`' && prev !== '\\') {
      inBacktickQuote = !inBacktickQuote;
      continue;
    }
    if (inSingleQuote || inDoubleQuote || inBacktickQuote) continue;

    if (char === '(') {
      depth += 1;
      continue;
    }
    if (char === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (!/\s/.test(char) || depth !== 0) continue;

    let lookahead = index;
    while (lookahead < body.length && /\s/.test(body[lookahead])) lookahead += 1;
    if (lookahead >= body.length) break;

    let wordEnd = lookahead;
    while (wordEnd < body.length && /[A-Za-z_]/.test(body[wordEnd])) wordEnd += 1;
    if (wordEnd === lookahead) continue;

    const maybeConstraint = body.slice(lookahead, wordEnd).toLowerCase();
    if (!SQL_COLUMN_CONSTRAINT_STARTERS.has(maybeConstraint)) continue;

    return {
      columnType: body.slice(0, index).trim(),
      remainder: body.slice(index).trimStart(),
    };
  }

  return { columnType: body, remainder: '' };
}

function parseSqlSchema(fileContent) {
  const entities = [];
  const relationships = [];
  let tableMatch;
  SQL_CREATE_TABLE_RE.lastIndex = 0;

  while ((tableMatch = SQL_CREATE_TABLE_RE.exec(fileContent)) !== null) {
    const tableName = tableNameFromSql(tableMatch[1]);
    const body = tableMatch[2];
    const definitions = splitSqlDefinitions(body);
    const attributes = [];
    const tableConstraints = [];

    for (const definition of definitions) {
      const line = definition.trim();
      if (!line) continue;

      if (SQL_TABLE_CONSTRAINT_LINE_RE.test(line)) {
        tableConstraints.push(line);
        continue;
      }

      const columnMatch = line.match(SQL_COLUMN_NAME_AND_BODY_RE);
      if (!columnMatch) continue;
      const columnName = tableNameFromSql(columnMatch[1]);
      const {
        columnType,
        remainder,
      } = splitSqlTypeAndRemainder(columnMatch[2]);
      const remainderLower = remainder.toLowerCase();
      const keyFlags = [];

      if (/\bprimary\s+key\b/i.test(remainder)) keyFlags.push('PK');
      if (/\bunique\b/i.test(remainder)) keyFlags.push('UK');

      const referencesMatch = remainder.match(SQL_INLINE_REFERENCES_RE);
      if (referencesMatch) {
        keyFlags.push('FK');
        pushExplicitSqlRelationship(relationships, tableName, referencesMatch[1]);
      }

      attributes.push({
        name: columnName,
        type: columnType.toLowerCase(),
        nullable: !/\bnot\s+null\b/.test(remainderLower),
        keyFlags,
      });
    }

    if (tableConstraints.length > 0) {
      const attributeMap = new Map(
        attributes.map((attribute) => [String(attribute.name).toLowerCase(), attribute])
      );
      for (const constraintLine of tableConstraints) {
        applyTableConstraint(constraintLine, tableName, attributeMap, relationships);
      }
    }

    entities.push({
      name: tableName,
      source: 'explicit',
      attributes,
    });
  }

  return { entities, relationships };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isJsonSchemaObjectLike(schema) {
  return isPlainObject(schema) && (schema.type === 'object' || isPlainObject(schema.properties));
}

function jsonPointerEscape(segment) {
  return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

function jsonSchemaRootEntityName(schema, context = {}) {
  if (typeof schema?.title === 'string' && schema.title.trim()) return schema.title.trim();
  const relativeFilePath = context.relativeFilePath || 'schema.schema.json';
  const fileName = path.basename(relativeFilePath).replace(/\.schema\.json$/i, '');
  return fileName || 'schema';
}

function jsonSchemaDefinitions(schema) {
  const definitions = [];
  for (const sectionName of ['$defs', 'definitions']) {
    const section = schema?.[sectionName];
    if (!isPlainObject(section)) continue;
    for (const [key, definition] of Object.entries(section)) {
      definitions.push({
        key,
        pointer: `#/${sectionName}/${jsonPointerEscape(key)}`,
        schema: definition,
      });
    }
  }
  return definitions;
}

function jsonSchemaTypeForProperty(propertySchema, entityIndex) {
  if (!isPlainObject(propertySchema)) return 'unknown';
  if (typeof propertySchema.$ref === 'string') {
    const target = entityIndex.get(propertySchema.$ref);
    return target?.entityName || 'ref';
  }
  if (propertySchema.type === 'array') return 'array';
  if (Array.isArray(propertySchema.type)) {
    return propertySchema.type.find((type) => type !== 'null') || 'unknown';
  }
  if (typeof propertySchema.type === 'string') return propertySchema.type;
  return 'unknown';
}

function classifyJsonSchemaRef(ref) {
  const token = String(ref || '');
  if (/^https?:\/\//i.test(token)) return { kind: 'remote' };
  const hashIndex = token.indexOf('#');
  if (hashIndex > 0) return { kind: 'cross-file' };
  if (hashIndex === -1 && token) return { kind: 'cross-file' };
  return { kind: 'local', pointer: token || '#' };
}

function jsonSchemaDiagnostic(context, pointer, category, detail = '') {
  const relativeFilePath = context?.relativeFilePath || 'unknown.schema.json';
  const suffix = detail ? ` ${detail}` : '';
  return `json-schema:${relativeFilePath}:${pointer} ${category}${suffix}`;
}

function pushJsonSchemaRefDiagnostic(diagnostics, context, pointer, ref, entityIndex, nonObjectPointers) {
  const classified = classifyJsonSchemaRef(ref);
  if (classified.kind === 'remote') {
    diagnostics.push(jsonSchemaDiagnostic(context, pointer, 'remote_ref_unsupported', ref));
    return;
  }
  if (classified.kind === 'cross-file') {
    diagnostics.push(jsonSchemaDiagnostic(context, pointer, 'cross_file_ref_unsupported', ref));
    return;
  }
  if (nonObjectPointers.has(classified.pointer)) {
    diagnostics.push(jsonSchemaDiagnostic(context, pointer, 'non_object_definition_ignored', ref));
    return;
  }
  if (!entityIndex.has(classified.pointer)) {
    diagnostics.push(jsonSchemaDiagnostic(context, pointer, 'local_ref_unresolved', ref));
  }
}

function pushJsonSchemaRelationshipForRef({
  relationships,
  diagnostics,
  context,
  pointer,
  ref,
  fromEntity,
  cardinality,
  entityIndex,
  nonObjectPointers,
}) {
  const classified = classifyJsonSchemaRef(ref);
  const target = classified.kind === 'local' ? entityIndex.get(classified.pointer) : null;
  if (target) {
    relationships.push({
      fromEntity,
      toEntity: target.entityName,
      cardinality,
      provenance: 'explicit',
    });
    return;
  }

  pushJsonSchemaRefDiagnostic(
    diagnostics,
    context,
    pointer,
    ref,
    entityIndex,
    nonObjectPointers
  );
}

function parseJsonSchema(fileContent, context = {}) {
  const schema = JSON.parse(fileContent);
  const entities = [];
  const relationships = [];
  const diagnostics = [];
  const entityIndex = new Map();
  const nonObjectPointers = new Set();
  const candidates = [];

  candidates.push({
    entityName: jsonSchemaRootEntityName(schema, context),
    pointer: '#',
    schema,
  });
  for (const definition of jsonSchemaDefinitions(schema)) {
    candidates.push({
      entityName: definition.key,
      pointer: definition.pointer,
      schema: definition.schema,
    });
  }

  for (const candidate of candidates) {
    if (isJsonSchemaObjectLike(candidate.schema)) {
      entityIndex.set(candidate.pointer, {
        entityName: candidate.entityName,
        schema: candidate.schema,
      });
    } else if (candidate.pointer !== '#') {
      nonObjectPointers.add(candidate.pointer);
    }
  }

  for (const candidate of candidates) {
    const indexed = entityIndex.get(candidate.pointer);
    if (!indexed) continue;

    const required = new Set(
      Array.isArray(candidate.schema.required)
        ? candidate.schema.required.map((field) => String(field))
        : []
    );
    const properties = isPlainObject(candidate.schema.properties) ? candidate.schema.properties : {};
    const attributes = [];

    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      const propertyPointer = `${candidate.pointer === '#' ? '#/properties' : `${candidate.pointer}/properties`}/${jsonPointerEscape(propertyName)}`;
      const type = jsonSchemaTypeForProperty(propertySchema, entityIndex);

      attributes.push({
        name: propertyName,
        type,
        nullable: !required.has(propertyName),
        keyFlags: [],
      });

      if (!isPlainObject(propertySchema)) continue;

      if (propertySchema.allOf || propertySchema.anyOf || propertySchema.oneOf) {
        diagnostics.push(jsonSchemaDiagnostic(context, propertyPointer, 'composition_unsupported'));
      }

      if (typeof propertySchema.$ref === 'string') {
        pushJsonSchemaRelationshipForRef({
          relationships,
          diagnostics,
          context,
          pointer: propertyPointer,
          ref: propertySchema.$ref,
          fromEntity: indexed.entityName,
          cardinality: '}o--||',
          entityIndex,
          nonObjectPointers,
        });
      }

      const items = propertySchema.items;
      if (propertySchema.type === 'array' && typeof items?.$ref === 'string') {
        pushJsonSchemaRelationshipForRef({
          relationships,
          diagnostics,
          context,
          pointer: `${propertyPointer}/items`,
          ref: items.$ref,
          fromEntity: indexed.entityName,
          cardinality: '||--o{',
          entityIndex,
          nonObjectPointers,
        });
      }
    }

    entities.push({
      name: indexed.entityName,
      source: 'explicit',
      attributes,
    });
  }

  return { entities, relationships, diagnostics };
}

function parseSchemaSource(source, content, context = {}) {
  const parser = SCHEMA_PARSERS[source];
  if (parser) return parser(content, context);
  throw new Error(`unsupported schema source: ${source}`);
}

function appendParseDiagnostics(diagnostics, parseErrors) {
  if (parseErrors.length === 0) return;
  diagnostics.push(...parseErrors.map((error) => `${error.source}:${error.file}: ${error.message}`));
}

function relationshipKey(fromEntity, toEntity) {
  // Deduplicate inferred links against explicit relationships at the entity-pair level.
  // Cardinality differences are preserved later in erd-model relationship storage.
  return `${canonicalEntityName(fromEntity)}|${canonicalEntityName(toEntity)}`;
}

function inferRelationshipsFromForeignKeyNames(entities, explicitRelationships) {
  const byEntity = new Map(entities.map((entity) => [canonicalEntityName(entity.name), entity]));
  const explicitKeys = new Set(
    explicitRelationships.map((relationship) => relationshipKey(relationship.fromEntity, relationship.toEntity))
  );

  const inferred = [];
  for (const entity of entities) {
    const from = canonicalEntityName(entity.name);
    for (const attribute of entity.attributes || []) {
      const attributeName = String(attribute.name || '');
      if (!/(?:_id|Id)$/.test(attributeName)) continue;
      const rawBase = attributeName.replace(/(?:_id|Id)$/, '');
      if (!rawBase) continue;
      const candidates = [
        canonicalEntityName(rawBase),
        canonicalEntityName(`${rawBase}s`),
        canonicalEntityName(rawBase.endsWith('s') ? rawBase.slice(0, -1) : rawBase),
      ].filter(Boolean);

      const target = candidates.find((candidate) => byEntity.has(candidate));
      if (!target) continue;
      if (target === from) continue;
      const key = relationshipKey(from, target);
      if (explicitKeys.has(key)) continue;
      explicitKeys.add(key);
      inferred.push({
        fromEntity: from,
        toEntity: target,
        cardinality: '}o--||',
        provenance: 'inferred',
      });
    }
  }

  return inferred;
}

function normalizeIgnore(ignore) {
  return [...new Set([
    ...DEFAULT_IGNORE,
    ...(Array.isArray(ignore) ? ignore : []),
  ].filter(Boolean))];
}

function extractErdModel({ rootPath, ignore = [] }) {
  const result = {
    extractionInvoked: true,
    sourcePrecedence: [...SOURCE_PRECEDENCE],
    sourceFiles: [],
    sourceFilesByKind: {},
    diagnostics: [],
    terminalClass: 'completed',
    model: normalizeErdModel({ entities: [], relationships: [] }),
  };

  if (!rootPath || !fs.existsSync(rootPath)) {
    result.terminalClass = 'failed_parse';
    result.diagnostics.push('root path is missing or does not exist');
    return result;
  }

  const sourceCandidates = Object.fromEntries(
    SOURCE_PRECEDENCE.map((source) => [
      source,
      globSync(SOURCE_FILE_PATTERNS[source], {
        cwd: rootPath,
        absolute: true,
        ignore: normalizeIgnore(ignore),
        nodir: true,
      }).sort(),
    ])
  );

  const entities = [];
  const relationships = [];
  const parserDiagnostics = [];
  const parseErrors = [];

  for (const source of SOURCE_PRECEDENCE) {
    const files = sourceCandidates[source] || [];
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativeFilePath = path.relative(rootPath, filePath);
        const parsed = parseSchemaSource(source, content, {
          absoluteFilePath: filePath,
          relativeFilePath,
          rootPath,
        });
        entities.push(...parsed.entities);
        relationships.push(...parsed.relationships);
        parserDiagnostics.push(...(parsed.diagnostics || []));
        result.sourceFiles.push(relativeFilePath);
        if (!result.sourceFilesByKind[source]) {
          result.sourceFilesByKind[source] = [];
        }
        result.sourceFilesByKind[source].push(relativeFilePath);
      } catch (error) {
        parseErrors.push({
          source,
          file: path.relative(rootPath, filePath),
          message: error.message,
        });
      }
    }
  }

  const normalized = normalizeErdModel({
    entities,
    relationships,
    sourceFiles: result.sourceFiles,
    diagnostics: [],
    sourcePrecedence: SOURCE_PRECEDENCE,
  });

  const inferredRelationships = inferRelationshipsFromForeignKeyNames(
    normalized.entities,
    normalized.relationships
  );
  const model = normalizeErdModel({
    ...normalized,
    relationships: [...normalized.relationships, ...inferredRelationships],
    sourcePrecedence: SOURCE_PRECEDENCE,
  });

  for (const source of Object.keys(result.sourceFilesByKind)) {
    result.sourceFilesByKind[source].sort();
    if (result.sourceFilesByKind[source].length === 0) {
      delete result.sourceFilesByKind[source];
    }
  }

  if (result.sourceFiles.length === 0 && parseErrors.length === 0) {
    result.terminalClass = 'failed_no_schema';
    result.diagnostics.push('no supported schema sources found (expected schema.prisma, .sql, or .schema.json files)');
  } else if (model.entities.length === 0) {
    result.terminalClass = 'failed_parse';
    if (parseErrors.length === 0) {
      result.diagnostics.push(
        'schema sources found but no ERD entities extracted (check supported model shapes)'
      );
    }
    result.diagnostics.push(...parserDiagnostics);
    appendParseDiagnostics(result.diagnostics, parseErrors);
  } else {
    result.diagnostics.push(...parserDiagnostics);
    appendParseDiagnostics(result.diagnostics, parseErrors);
    result.terminalClass = 'completed';
  }

  result.model = model;
  return result;
}

module.exports = {
  SOURCE_PRECEDENCE,
  extractErdModel,
  // Expose parser internals for focused unit coverage without duplicating logic.
  __test: {
    SCHEMA_PARSERS,
    inferRelationshipsFromForeignKeyNames,
    parseJsonSchema,
    parsePrismaSchema,
    parseSqlSchema,
    relationshipKey,
    splitSqlTypeAndRemainder,
  },
};
