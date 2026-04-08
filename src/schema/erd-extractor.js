const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { canonicalEntityName, normalizeErdModel } = require('./erd-model');

const DEFAULT_IGNORE = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'];
const SOURCE_PRECEDENCE = Object.freeze(['prisma', 'sql']);
const SQL_IDENTIFIER_SOURCE = '(?:["`][^"`]+["`]|[A-Za-z_][A-Za-z0-9_]*)';
const SQL_QUALIFIED_IDENTIFIER_SOURCE = `${SQL_IDENTIFIER_SOURCE}(?:\\s*\\.\\s*${SQL_IDENTIFIER_SOURCE})?`;
const PRISMA_SCALAR_TYPES = new Set([
  'String',
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'Boolean',
  'DateTime',
  'Json',
  'Bytes',
]);

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
      // Emit the owning side only (`@relation(fields: [...])`) to avoid
      // duplicate reciprocal edges when both sides of the same relation exist.
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
  const normalized = String(token || '')
    .trim()
    .replace(/\s*\.\s*/g, '.');
  if (!normalized) return '';
  const base = normalized.split('.').pop() || normalized;
  return base.replace(/^["`]/, '').replace(/["`]$/, '');
}

function pushUniqueFlag(keyFlags, flag) {
  if (!keyFlags.includes(flag)) keyFlags.push(flag);
}

function markAttributeFlag(attributesByName, pendingFlags, fieldName, flag) {
  const attribute = attributesByName.get(fieldName);
  if (attribute) {
    pushUniqueFlag(attribute.keyFlags, flag);
    return;
  }

  const pending = pendingFlags.get(fieldName) || new Set();
  pending.add(flag);
  pendingFlags.set(fieldName, pending);
}

function parseSqlSchema(fileContent) {
  const entities = [];
  const relationships = [];
  const createTableRe = new RegExp(
    `\\bcreate\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(${SQL_QUALIFIED_IDENTIFIER_SOURCE})\\s*\\(([\\s\\S]*?)\\)\\s*(?:;|(?=\\s*(?:create\\s+table\\b|$)))`,
    'gi'
  );
  const foreignKeyConstraintRe = new RegExp(
    `\\bforeign\\s+key\\s*\\(([^)]+)\\)\\s*references\\s+(${SQL_QUALIFIED_IDENTIFIER_SOURCE})`,
    'i'
  );
  const inlineReferencesRe = new RegExp(
    `\\breferences\\s+(${SQL_QUALIFIED_IDENTIFIER_SOURCE})`,
    'i'
  );
  let tableMatch;

  while ((tableMatch = createTableRe.exec(fileContent)) !== null) {
    const tableName = tableNameFromSql(tableMatch[1]);
    const body = tableMatch[2];
    const definitions = splitSqlDefinitions(body);
    const attributes = [];
    const attributesByName = new Map();
    const pendingFlags = new Map();

    for (const definition of definitions) {
      const line = definition.trim();
      if (!line) continue;
      const lower = line.toLowerCase();

      if (
        lower.startsWith('constraint')
        || lower.startsWith('foreign key')
        || lower.startsWith('primary key')
        || lower.startsWith('unique')
      ) {
        const pkMatch = line.match(/\bprimary\s+key\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const fields = pkMatch[1]
            .split(',')
            .map((token) => tableNameFromSql(token.trim()))
            .filter(Boolean);
          for (const fieldName of fields) {
            markAttributeFlag(attributesByName, pendingFlags, fieldName, 'PK');
          }
        }

        const uniqueMatch = line.match(/\bunique\s*\(([^)]+)\)/i);
        if (uniqueMatch) {
          const fields = uniqueMatch[1]
            .split(',')
            .map((token) => tableNameFromSql(token.trim()))
            .filter(Boolean);
          for (const fieldName of fields) {
            markAttributeFlag(attributesByName, pendingFlags, fieldName, 'UK');
          }
        }

        const fkMatch = line.match(foreignKeyConstraintRe);
        if (fkMatch) {
          const localFields = fkMatch[1]
            .split(',')
            .map((token) => tableNameFromSql(token.trim()))
            .filter(Boolean);
          const referencedTable = tableNameFromSql(fkMatch[2]);
          for (const localField of localFields) {
            markAttributeFlag(attributesByName, pendingFlags, localField, 'FK');
          }
          relationships.push({
            fromEntity: tableName,
            toEntity: referencedTable,
            cardinality: '}o--||',
            provenance: 'explicit',
          });
        }
        continue;
      }

      const columnMatch = line.match(/^([`"]?[A-Za-z_][A-Za-z0-9_]*[`"]?)\s+([A-Za-z0-9_()]+)([\s\S]*)$/);
      if (!columnMatch) continue;
      const columnName = tableNameFromSql(columnMatch[1]);
      const columnType = columnMatch[2];
      const remainder = columnMatch[3] || '';
      const remainderLower = remainder.toLowerCase();
      const keyFlags = [];

      if (/\bprimary\s+key\b/i.test(remainder)) keyFlags.push('PK');
      if (/\bunique\b/i.test(remainder)) keyFlags.push('UK');

      const referencesMatch = remainder.match(inlineReferencesRe);
      if (referencesMatch) {
        pushUniqueFlag(keyFlags, 'FK');
        relationships.push({
          fromEntity: tableName,
          toEntity: tableNameFromSql(referencesMatch[1]),
          cardinality: '}o--||',
          provenance: 'explicit',
        });
      }
      const pending = pendingFlags.get(columnName);
      if (pending) {
        for (const flag of pending) {
          pushUniqueFlag(keyFlags, flag);
        }
        pendingFlags.delete(columnName);
      }

      attributes.push({
        name: columnName,
        type: columnType.toLowerCase(),
        nullable: !/\bnot\s+null\b/.test(remainderLower),
        keyFlags,
      });
      attributesByName.set(columnName, attributes[attributes.length - 1]);
    }

    entities.push({
      name: tableName,
      source: 'explicit',
      attributes,
    });
  }

  return { entities, relationships };
}

function inferRelationshipsFromForeignKeyNames(entities, explicitRelationships) {
  const byEntity = new Map(entities.map((entity) => [canonicalEntityName(entity.name), entity]));
  const explicitKeys = new Set(
    explicitRelationships.map((relationship) => {
      const from = canonicalEntityName(relationship.fromEntity);
      const to = canonicalEntityName(relationship.toEntity);
      return `${from}|${to}`;
    })
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
      const key = `${from}|${target}`;
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

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractErdModel({ rootPath }) {
  const result = {
    extractionInvoked: true,
    sourcePrecedence: [...SOURCE_PRECEDENCE],
    sourceFiles: [],
    diagnostics: [],
    terminalClass: 'completed',
    model: normalizeErdModel({ entities: [], relationships: [] }),
  };

  if (!rootPath || !fs.existsSync(rootPath)) {
    result.terminalClass = 'failed_parse';
    result.diagnostics.push('root path is missing or does not exist');
    return result;
  }

  const prismaFiles = globSync('**/schema.prisma', {
    cwd: rootPath,
    absolute: true,
    ignore: DEFAULT_IGNORE,
    nodir: true,
  }).sort();
  const sqlFiles = globSync('**/*.sql', {
    cwd: rootPath,
    absolute: true,
    ignore: DEFAULT_IGNORE,
    nodir: true,
  }).sort();

  const sourceCandidates = {
    prisma: prismaFiles,
    sql: sqlFiles,
  };
  const entities = [];
  const relationships = [];
  const parseErrors = [];

  for (const source of SOURCE_PRECEDENCE) {
    const files = sourceCandidates[source] || [];
    for (const filePath of files) {
      try {
        const content = readUtf8(filePath);
        const parsed = source === 'prisma'
          ? parsePrismaSchema(content)
          : parseSqlSchema(content);
        entities.push(...parsed.entities);
        relationships.push(...parsed.relationships);
        result.sourceFiles.push(path.relative(rootPath, filePath));
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

  if (result.sourceFiles.length === 0 && parseErrors.length === 0) {
    result.terminalClass = 'failed_no_schema';
    result.diagnostics.push('no supported schema sources found (expected schema.prisma or .sql files)');
  } else if (model.entities.length === 0) {
    result.terminalClass = 'failed_parse';
    if (parseErrors.length > 0) {
      result.diagnostics.push(
        ...parseErrors.map((error) => `${error.source}:${error.file}: ${error.message}`)
      );
    } else {
      result.diagnostics.push(
        'schema sources found but no ERD entities extracted (check supported CREATE TABLE/model shapes)'
      );
    }
  } else {
    if (parseErrors.length > 0) {
      result.diagnostics.push(
        ...parseErrors.map((error) => `${error.source}:${error.file}: ${error.message}`)
      );
    }
    result.terminalClass = 'completed';
  }

  result.model = model;
  return result;
}

module.exports = {
  SOURCE_PRECEDENCE,
  extractErdModel,
};
