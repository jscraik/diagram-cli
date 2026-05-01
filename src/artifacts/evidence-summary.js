function countBy(items, selectKey) {
  const counts = new Map();
  for (const item of items || []) {
    const key = selectKey(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) =>
    left[0].localeCompare(right[0])
  );
}

function summarizeAnalysis(analysis = {}) {
  const components = Array.isArray(analysis.components) ? analysis.components : [];
  return {
    componentCount: components.length,
    entryPointCount: Array.isArray(analysis.entryPoints) ? analysis.entryPoints.length : 0,
    totalFilesFound: Number.isFinite(Number(analysis.totalFilesFound))
      ? Number(analysis.totalFilesFound)
      : components.length,
    languages: countBy(components, (component) => component.language),
    areas: countBy(components, (component) => component.type),
  };
}

module.exports = {
  countBy,
  summarizeAnalysis,
};
