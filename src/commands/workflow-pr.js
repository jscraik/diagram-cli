const { registerWorkflowCommands } = require('../workflow/pr-command');
const {
  applyDiagramRcDefaults,
  getDiagramRcFromProgram,
  resolveRootPathOrExit,
  splitList,
  validateOutputPath,
} = require('./shared');

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
