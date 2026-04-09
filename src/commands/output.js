function sortObjectDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectDeep);
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortObjectDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function buildMachineEnvelope({
  schemaVersion,
  command,
  rootPath,
  status = 'success',
  data = {},
  errors = [],
  agentSummary = null,
  deterministic = false,
}) {
  const envelope = {
    schemaVersion,
    command,
    status,
    meta: {
      rootPath,
      generatedAt: deterministic ? undefined : new Date().toISOString(),
    },
    data,
    errors,
  };

  if (agentSummary) {
    envelope.agentSummary = agentSummary;
  }

  if (deterministic) {
    delete envelope.meta.generatedAt;
    return sortObjectDeep(envelope);
  }
  return envelope;
}

module.exports = {
  buildMachineEnvelope,
  sortObjectDeep,
};
