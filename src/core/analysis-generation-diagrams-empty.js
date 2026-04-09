function noteNode(message) {
  return `  Note["${message}"]`;
}

function graphNote(message, direction = 'TD') {
  return `graph ${direction}\n${noteNode(message)}`;
}

function flowNote(message, direction = 'TD') {
  return `flowchart ${direction}\n${noteNode(message)}`;
}

function sequenceNote(message) {
  return `sequenceDiagram\n  Note over User,App: ${message}`;
}

function classNote(message) {
  return `classDiagram\n  note "${message}"`;
}

function architectureNote(message) {
  return `architecture-beta\n    service note(server)[${message}]`;
}

module.exports = {
  noteNode,
  graphNote,
  flowNote,
  sequenceNote,
  classNote,
  architectureNote,
};
