const { escapeMermaid, mapSafeNames } = require('./analysis-generation-utils');
const { limitItems } = require('./analysis-generation-diagrams-limit');
const { classNote } = require('./analysis-generation-diagrams-empty');

function generateClass(data) {
  if (!data || !Array.isArray(data.components)) {
    return classNote('No data available');
  }

  const lines = ['classDiagram'];
  const MAX_CLASSES = 20;
  const classes = limitItems(
    data.components.filter((component) => component.type === 'class' || component.type === 'component'),
    MAX_CLASSES,
    'Class diagram limited to {limit} classes'
  );
  const classNames = new Set(classes.map((component) => component.name));
  const classByName = new Map(classes.map((component) => [component.name, component]));
  const classIds = mapSafeNames(classes);

  if (classes.length === 0) {
    lines.push('  note "No classes found"');
    return lines.join('\n');
  }

  for (const component of classes) {
    const safeId = classIds.get(component);
    if (!safeId) continue;
    lines.push(`  class ${safeId} {`);
    lines.push(`    +${escapeMermaid(component.filePath)}`);
    lines.push('  }');
  }

  for (const component of classes) {
    const deps = (component.dependencies || []).slice(0, 3);
    for (const depName of deps) {
      if (classNames.has(depName)) {
        const from = classIds.get(component);
        const to = classIds.get(classByName.get(depName));
        if (!from || !to) continue;
        lines.push(`  ${from} --> ${to}`);
      }
    }
  }

  return lines.join('\n');
}

function generateFlow(data) {
  if (!data || !Array.isArray(data.components)) {
    return 'flowchart TD\n  Start(["Start"])\n  End(["End"])\n  Start --> End';
  }

  const lines = ['flowchart TD'];
  lines.push('  Start(["Start"])');
  const MAX_COMPONENTS = 8;
  const comps = limitItems(data.components, MAX_COMPONENTS, 'Flow diagram limited to {limit} components');

  if (comps.length === 0) {
    lines.push('  End(["End"])');
    lines.push('  Start --> End');
    return lines.join('\n');
  }

  let prev = 'Start';
  const nodeIds = mapSafeNames(comps);
  for (const component of comps) {
    const safeName = nodeIds.get(component);
    if (!safeName) continue;
    lines.push(`  ${safeName}["${escapeMermaid(component.originalName)}"]`);
    lines.push(`  ${prev} --> ${safeName}`);
    prev = safeName;
  }
  lines.push('  End(["End"])');
  lines.push(`  ${prev} --> End`);
  return lines.join('\n');
}

module.exports = {
  generateClass,
  generateFlow,
};
