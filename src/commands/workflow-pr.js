const { registerWorkflowCommands } = require('../workflow/pr-command');
const {
  applyDiagramRcDefaults,
  resolveRootPathOrExit,
  splitList,
  validateOutputPath,
} = require('./shared');

function registerWorkflowPrCommand(program) {
  registerWorkflowCommands(program, {
    resolveRootPathOrExit,
    validateOutputPath,
    applyDiagramRcDefaults,
    getDiagramRc: () => program._diagramRc || {},
    splitList,
  });
}

module.exports = {
  registerWorkflowPrCommand,
};
