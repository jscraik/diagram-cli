const { escapeMermaid } = require('./analysis-generation-utils');

function safeMessage(message) {
  return escapeMermaid(String(message ?? '')).replace(/\r?\n/g, ' ');
}

function noteNode(message) {
  return `  Note["${safeMessage(message)}"]`;
}

function graphNote(message, direction = 'TD') {
  return `graph ${direction}\n${noteNode(message)}`;
}

function flowNote(message, direction = 'TD') {
  return `flowchart ${direction}\n${noteNode(message)}`;
}

function sequenceNote(message) {
  return `sequenceDiagram\n  Note over User,App: ${safeMessage(message)}`;
}

function classNote(message) {
  return `classDiagram\n  note "${safeMessage(message)}"`;
}

function architectureNote(message) {
  return `architecture-beta\n    service note(server)[${safeMessage(message)}]`;
}

module.exports = {
  noteNode,
  graphNote,
  flowNote,
  sequenceNote,
  classNote,
  architectureNote,
};
