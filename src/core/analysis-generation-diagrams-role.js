const {
  generateDatabase,
  generateUserInteractions,
  generateEvents,
} = require('./analysis-generation-diagrams-role-data');
const {
  generateAuth,
  generateSecurity,
} = require('./analysis-generation-diagrams-role-security');
const {
  generateAgent,
  generateC4Context,
  generateRag,
} = require('./analysis-generation-diagrams-role-ai');

module.exports = {
  generateDatabase,
  generateUserInteractions,
  generateEvents,
  generateAuth,
  generateSecurity,
  generateAgent,
  generateC4Context,
  generateRag,
};
