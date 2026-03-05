const { defaultAnalyzer } = require('./default-analyzer');

const ANALYZERS = new Map([
  [defaultAnalyzer.name, defaultAnalyzer],
]);

function listAnalyzers() {
  return [...ANALYZERS.values()].map((analyzer) => ({
    name: analyzer.name,
    version: analyzer.version,
  }));
}

async function runAnalyzer(name, rootPath, options) {
  const analyzerName = name || 'default';
  const analyzer = ANALYZERS.get(analyzerName);
  if (!analyzer) {
    throw new Error(`Unknown analyzer plugin: ${analyzerName}`);
  }

  const analysis = await analyzer.analyze(rootPath, options);
  return {
    analyzer: {
      name: analyzer.name,
      version: analyzer.version,
    },
    analysis,
  };
}

module.exports = {
  runAnalyzer,
  listAnalyzers,
};
