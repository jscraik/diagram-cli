const { registerWorkflowCommands } = require('../workflow/pr-command');
const {
  applyDiagramRcDefaults,
  getDiagramRcFromProgram,
  resolveRootPathOrExit,
  splitList,
  validateOutputPath,
} = require('./shared');

/**
 * Register PR workflow commands on the provided CLI `program`.
 * @param {object} program - CLI program instance to attach the workflow PR commands to.
 */
function registerWorkflowPrCommand(program) {
  registerWorkflowCommands(program, {
    resolveRootPathOrExit,
    validateOutputPath,
    applyDiagramRcDefaults,
    getDiagramRc: () => getDiagramRcFromProgram(program),
    splitList,
  });
}

module.exports = {
  registerWorkflowPrCommand,
};
