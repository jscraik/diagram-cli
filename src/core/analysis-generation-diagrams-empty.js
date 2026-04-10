/**
 * Create a Mermaid Note node string containing the given message.
 * @param {string} message - The text to include inside the note node.
 * @returns {string} The Mermaid fragment in the form `  Note["<message>"]`.
 */
function noteNode(message) {
  return `  Note["${safeMessage(message)}"]`;
}

/**
 * Create a Mermaid `graph` fragment containing a single note node.
 * @param {string} message - Text to place inside the note node.
 * @param {string} [direction='TD'] - Graph layout direction (for example `'TD'` for top-down or `'LR'` for left-right).
 * @returns {string} A Mermaid `graph` block containing the note node with the provided message.
 */
function graphNote(message, direction = 'TD') {
  return `graph ${direction}\n${noteNode(message)}`;
}

/**
 * Construct a Mermaid flowchart snippet that contains a single note.
 *
 * @param {string} message - Text to place inside the note.
 * @param {string} [direction='TD'] - Flow direction for the chart (commonly 'TD' for top-down, 'LR' for left-right, etc.).
 * @returns {string} A Mermaid `flowchart` fragment starting with `flowchart <direction>` followed by a note node containing the provided message.
 */
function flowNote(message, direction = 'TD') {
  return `flowchart ${direction}\n${noteNode(message)}`;
}

/**
 * Build a Mermaid sequenceDiagram fragment containing a note positioned over User and App.
 * @param {string} message - Text to place inside the note.
 * @returns {string} A `sequenceDiagram` snippet with a `Note over User,App` containing the provided message.
 */
function sequenceNote(message) {
  return `sequenceDiagram\n  Note over User,App: ${safeMessage(message)}`;
}

/**
 * Create a Mermaid classDiagram fragment containing a note with the provided message.
 * @param {string} message - The note text to include inside the class diagram.
 * @returns {string} The Mermaid `classDiagram` snippet that contains the note with the provided message.
 */
function classNote(message) {
  return `classDiagram\n  note "${safeMessage(message)}"`;
}

/**
 * Create a Mermaid `architecture-beta` snippet that attaches a service note to the `server`.
 *
 * @param {string} message - The note text to place inside the service note for the `server`.
 * @returns {string} The Mermaid diagram fragment `architecture-beta\n    service note(server)[<message>]`.
 */
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
