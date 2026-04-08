function sanitizeToken(value) {
  return String(value || '')
    .trim()
    .replace(/[`"'\\]/g, '')
    .replace(/[^A-Za-z0-9_]/g, '_');
}

function canonicalEntityName(value) {
  const token = sanitizeToken(value);
  return token ? token.toUpperCase() : '';
}

function canonicalAttributeName(value) {
  return sanitizeToken(value);
}

function canonicalType(value) {
  const token = sanitizeToken(value);
  return token || 'unknown';
}

function toKeyFlags(flags) {
  const order = ['PK', 'FK', 'UK'];
  const seen = new Set((Array.isArray(flags) ? flags : []).map((flag) => String(flag).toUpperCase()));
  return order.filter((flag) => seen.has(flag));
}

function mergeAttributes(existingAttributes, incomingAttributes) {
  const byName = new Map();

  for (const attribute of [...existingAttributes, ...incomingAttributes]) {
    const name = canonicalAttributeName(attribute?.name);
    if (!name) continue;
    const prev = byName.get(name);
    const next = {
      name,
      type: canonicalType(attribute?.type),
      nullable: Boolean(attribute?.nullable),
      keyFlags: toKeyFlags(attribute?.keyFlags),
    };

    if (!prev) {
      byName.set(name, next);
      continue;
    }

    const mergedFlags = toKeyFlags([...(prev.keyFlags || []), ...(next.keyFlags || [])]);
    byName.set(name, {
      name,
      type: prev.type !== 'unknown' ? prev.type : next.type,
      nullable: prev.nullable || next.nullable,
      keyFlags: mergedFlags,
    });
  }

  const keyPriority = ['PK', 'FK', 'UK'];
  const score = (attribute) => {
    if ((attribute.keyFlags || []).length === 0) return keyPriority.length;
    const positions = attribute.keyFlags
      .map((flag) => keyPriority.indexOf(flag))
      .filter((index) => index >= 0);
    return positions.length > 0 ? Math.min(...positions) : keyPriority.length;
  };

  return [...byName.values()].sort((a, b) => {
    const scoreDiff = score(a) - score(b);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });
}

function normalizeErdModel(input) {
  const entitiesInput = Array.isArray(input?.entities) ? input.entities : [];
  const relationshipsInput = Array.isArray(input?.relationships) ? input.relationships : [];
  const diagnostics = Array.isArray(input?.diagnostics) ? input.diagnostics : [];
  const sourceFiles = Array.isArray(input?.sourceFiles) ? input.sourceFiles : [];
  const sourcePrecedence = Array.isArray(input?.sourcePrecedence) ? input.sourcePrecedence : [];

  const entitiesByName = new Map();
  for (const entity of entitiesInput) {
    const name = canonicalEntityName(entity?.name);
    if (!name) continue;
    const source = entity?.source === 'inferred' ? 'inferred' : 'explicit';
    const existing = entitiesByName.get(name);
    const attributes = mergeAttributes(existing?.attributes || [], entity?.attributes || []);
    const merged = {
      name,
      source: existing?.source === 'explicit' || source === 'explicit' ? 'explicit' : 'inferred',
      attributes,
    };
    entitiesByName.set(name, merged);
  }

  const entities = [...entitiesByName.values()].sort((a, b) => a.name.localeCompare(b.name));
  const entitySet = new Set(entities.map((entity) => entity.name));
  const relationshipMap = new Map();

  for (const relationship of relationshipsInput) {
    const fromEntity = canonicalEntityName(relationship?.fromEntity);
    const toEntity = canonicalEntityName(relationship?.toEntity);
    if (!fromEntity || !toEntity) continue;
    if (!entitySet.has(fromEntity) || !entitySet.has(toEntity)) continue;

    const provenance = relationship?.provenance === 'inferred' ? 'inferred' : 'explicit';
    const cardinality = String(relationship?.cardinality || '||--o{');
    const relationshipKey = `${fromEntity}|${toEntity}|${cardinality}`;
    const existing = relationshipMap.get(relationshipKey);
    if (!existing || existing.provenance === 'inferred') {
      relationshipMap.set(relationshipKey, {
        fromEntity,
        toEntity,
        cardinality,
        provenance,
      });
    }
  }

  const relationships = [...relationshipMap.values()].sort((a, b) => {
    if (a.fromEntity !== b.fromEntity) return a.fromEntity.localeCompare(b.fromEntity);
    if (a.toEntity !== b.toEntity) return a.toEntity.localeCompare(b.toEntity);
    if (a.provenance !== b.provenance) return a.provenance.localeCompare(b.provenance);
    return a.cardinality.localeCompare(b.cardinality);
  });

  return {
    entities,
    relationships,
    diagnostics,
    sourceFiles: [...new Set(sourceFiles)].sort(),
    sourcePrecedence: [...new Set(sourcePrecedence)],
  };
}

function renderErdMermaid(model, options = {}) {
  const entities = Array.isArray(model?.entities) ? model.entities : [];
  const relationships = Array.isArray(model?.relationships) ? model.relationships : [];
  const lines = ['erDiagram'];

  if (options.lowConfidenceMarker) {
    const percent = typeof options.inferenceShare === 'number'
      ? Math.round(options.inferenceShare * 100)
      : null;
    const marker = percent === null
      ? 'low-confidence: inferred relationships are above preferred threshold'
      : `low-confidence: inferred relationships are ${percent}% of all relationships`;
    lines.push(`  %% ${marker}`);
  }

  for (const entity of entities) {
    lines.push(`  ${entity.name} {`);
    for (const attribute of entity.attributes || []) {
      const flags = (attribute.keyFlags || []).join(' ');
      const suffix = flags ? ` ${flags}` : '';
      lines.push(`    ${canonicalType(attribute.type)} ${canonicalAttributeName(attribute.name)}${suffix}`);
    }
    lines.push('  }');
  }

  if (relationships.length > 0) {
    lines.push('');
  }

  for (const relationship of relationships) {
    lines.push(
      `  ${relationship.fromEntity} ${relationship.cardinality} ${relationship.toEntity} : ${relationship.provenance}`
    );
  }

  return lines.join('\n');
}

module.exports = {
  canonicalEntityName,
  normalizeErdModel,
  renderErdMermaid,
};
