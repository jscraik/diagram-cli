const { analyze } = require('../core/analysis-generation');

const defaultAnalyzer = {
  name: 'default',
  version: '1.0.0',
  analyze(rootPath, options) {
    return analyze(rootPath, options);
  },
};

module.exports = { defaultAnalyzer };
