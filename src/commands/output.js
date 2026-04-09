/**
 * Recursively sort keys of any plain object found within a value.
 *
 * Processes arrays element-wise, transforms plain objects by returning a new object
 * whose keys are in lexicographic order (with each value processed recursively),
 * and leaves non-object, non-array values unchanged.
 *
 * @param {*} value - The input to transform: plain objects will have their keys sorted recursively; arrays will be processed element-wise; primitives and other non-object values are returned as-is.
 * @returns {*} The transformed value with object keys sorted lexicographically.
 */
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

/**
 * Construct a standardized machine-readable envelope containing schema, command, status, metadata, payload and errors.
 *
 * The envelope includes `schemaVersion`, `command`, `status`, a `meta` object with `rootPath` (and `generatedAt` unless `deterministic` is true), `data`, and `errors`. If `agentSummary` is provided it is added to the top-level envelope. When `deterministic` is true the envelope is returned with keys sorted and without `meta.generatedAt`.
 *
 * @param {string} schemaVersion - Version identifier for the envelope schema.
 * @param {string} command - Name of the command or operation the envelope describes.
 * @param {string} rootPath - Root filesystem path to include in the envelope metadata.
 * @param {string} [status='success'] - Status label for the operation.
 * @param {Object} [data={}] - Payload data to include under `data`.
 * @param {Array} [errors=[]] - Array of error descriptors to include under `errors`.
 * @param {Object|null} [agentSummary=null] - Optional summary object about the agent to include when present.
 * @param {boolean} [deterministic=false] - If true, omit `meta.generatedAt` and return a key-sorted representation of the envelope.
 * @returns {Object} The constructed envelope object.
 */
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
    return module.exports.sortObjectDeep(envelope);
  }
  return envelope;
}

module.exports = {
  buildMachineEnvelope,
  sortObjectDeep,
};
