const { escapeMermaid, mapSafeNames } = require('./analysis-generation-utils');
const { limitItems } = require('./analysis-generation-diagrams-limit');
const { classNote } = require('./analysis-generation-diagrams-empty');

/**
 * Build a Mermaid `classDiagram` string from the provided data.
 *
 * Filters `data.components` to entries whose `type` is `'class'` or `'component'`, limits the list to 20 items,
 * emits a class block for each selected component containing its `filePath`, and adds dependency edges for up to
 * the first 3 dependencies per component only when the dependency name is present among the selected classes.
 *
 * @param {Object} data - Input container expected to have a `components` array of component objects.
 *   Each component should include at least `name`, `type` and `filePath`, and may include `dependencies` (array of names).
 * @returns {string} A Mermaid `classDiagram` text. If `data` is missing or invalid returns the result of `classNote('No data available')`.
 *   If no classes are selected the diagram contains a `note "No classes found"`.
 */
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

/**
 * Build a Mermaid flowchart that chains components sequentially from Start to End.
 *
 * If `data` is missing or `data.components` is not an array, a minimal Start → End flow is returned.
 * The component list is limited to 8 items; if the resulting list is empty the diagram connects Start directly to End.
 * Each included component becomes a node labelled with its `originalName` and is connected in order, ending with an edge to End.
 *
 * @param {Object} data - Object containing a `components` array of component descriptors.
 * @returns {string} A Mermaid `flowchart TD` diagram as a string.
 */
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
