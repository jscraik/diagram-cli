const { generateArchitecture } = require('./analysis-generation-diagrams-core-architecture');
const { generateSequence } = require('./analysis-generation-diagrams-core-sequence');
const { generateDependency } = require('./analysis-generation-diagrams-core-dependency');
const { generateClass, generateFlow } = require('./analysis-generation-diagrams-core-shapes');

module.exports = {
  generateArchitecture,
  generateSequence,
  generateDependency,
  generateClass,
  generateFlow,
};
