const fs = require('fs');
const path = require('path');

const IR_SCHEMA_VERSION = '1.0';

function toArchitectureIR(analysisResult, metadata = {}) {
  const components = Array.isArray(analysisResult?.components)
    ? analysisResult.components.map((component) => ({
        name: component.name,
        originalName: component.originalName,
        filePath: component.filePath,
        type: component.type,
        roleTags: Array.isArray(component.roleTags) ? [...component.roleTags].sort() : [],
        dependencies: Array.isArray(component.dependencies) ? [...component.dependencies].sort() : [],
      }))
    : [];

  return {
    schemaVersion: IR_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    rootPath: analysisResult?.rootPath || metadata.rootPath || '',
    analyzer: metadata.analyzer || { name: 'default', version: 'unknown' },
    summary: {
      componentCount: components.length,
      languageCount: Object.keys(analysisResult?.languages || {}).length,
      entryPointCount: Array.isArray(analysisResult?.entryPoints) ? analysisResult.entryPoints.length : 0,
    },
    languages: analysisResult?.languages || {},
    entryPoints: analysisResult?.entryPoints || [],
    components,
  };
}

function writeArchitectureIR(rootPath, ir, explicitPath) {
  const destination = explicitPath
    ? path.resolve(explicitPath)
    : path.join(rootPath, '.diagram', 'ir', 'architecture-ir.json');

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(ir, null, 2)}\n`);
  return destination;
}

module.exports = {
  IR_SCHEMA_VERSION,
  toArchitectureIR,
  writeArchitectureIR,
};
