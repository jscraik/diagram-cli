const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { canonicalEntityName, normalizeErdModel } = require('./erd-model');

const DEFAULT_IGNORE = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'];
const SOURCE_PRECEDENCE = Object.freeze(['prisma']);
const PRISMA_SCALAR_TYPES = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes']);

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

  const entities = [];
  const relationships = [];
  const parseErrors = [];

  for (const filePath of prismaFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parsePrismaSchema(content);
      entities.push(...parsed.entities);
      relationships.push(...parsed.relationships);
      result.sourceFiles.push(path.relative(rootPath, filePath));
    } catch (error) {
      parseErrors.push({
        source: 'prisma',
        file: path.relative(rootPath, filePath),
        message: error.message,
      });
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
    result.diagnostics.push('no supported schema sources found (expected schema.prisma files)');
  } else if (model.entities.length === 0) {
    result.terminalClass = 'failed_parse';
    if (parseErrors.length > 0) {
      result.diagnostics.push(
        ...parseErrors.map((error) => `${error.source}:${error.file}: ${error.message}`)
      );
    } else {
      result.diagnostics.push(
        'schema sources found but no ERD entities extracted (check supported model shapes)'
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
