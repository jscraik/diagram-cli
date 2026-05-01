const REQUIRED_GATES = [
  'dual_command_identity_available',
  'compatibility_path_regression_passed',
  'machine_command_coverage_manifest_valid',
  'machine_envelope_conformance_passed',
  'migration_evidence_hash_valid',
  'append_only_ledger_valid',
  'rollback_drill_passed',
];

function validateFinalizationPolicy(policy) {
  const errors = [];
  if (policy?.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (policy?.migrationState !== 'compatibility') errors.push('migrationState must be compatibility');
  if (policy?.effectiveFromState !== 'compatibility') errors.push('effectiveFromState must be compatibility');
  if (policy?.targetState !== 'finalized') errors.push('targetState must be finalized');
  if (policy?.minimumWindow?.releaseCandidates !== 2) errors.push('minimumWindow.releaseCandidates must equal 2');
  if (policy?.minimumWindow?.days !== 30) errors.push('minimumWindow.days must equal 30');
  if (policy?.minimumWindow?.clock !== 'UTC') errors.push('minimumWindow.clock must be UTC');
  const gates = Array.isArray(policy?.gatingCriteria) ? policy.gatingCriteria : [];
  for (const gate of REQUIRED_GATES) {
    if (!gates.includes(gate)) {
      errors.push(`missing required gate: ${gate}`);
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  REQUIRED_GATES,
  validateFinalizationPolicy,
};
