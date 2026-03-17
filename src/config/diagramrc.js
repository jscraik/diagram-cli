const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const DIAGRAMRC_FILENAME = '.diagramrc';

/**
 * Zod schema for .diagramrc config file.
 * All fields are optional — the file does not need to exist.
 */
const DiagramRcSchema = z.object({
  /** Glob patterns or directory names to ignore during analysis */
  ignore: z.array(z.string()).optional(),
  /** Comma-separated file glob patterns (same as --patterns CLI flag) */
  patterns: z.string().optional(),
  /** Maximum files to analyze (1–10000, same as --max-files CLI flag) */
  maxFiles: z.number().int().positive().max(10000).optional(),
  /** Default theme for diagram output */
  theme: z.enum(['default', 'dark', 'forest', 'neutral', 'light']).optional(),
}).strict();

/**
 * Load and validate .diagramrc from the project root.
 *
 * Returns the parsed config object if found and valid, or an empty object
 * if the file doesn't exist. Exits the process with code 2 if the file
 * exists but is invalid JSON or fails schema validation.
 *
 * @param {string} rootPath - Project root directory
 * @param {{ quiet?: boolean }} opts
 * @returns {z.infer<typeof DiagramRcSchema>}
 */
function loadDiagramRc(rootPath, opts = {}) {
  const rcPath = path.join(rootPath, DIAGRAMRC_FILENAME);

  if (!fs.existsSync(rcPath)) {
    return {};
  }

  let raw;
  try {
    raw = fs.readFileSync(rcPath, 'utf8');
  } catch (err) {
    console.error(`\u274c Failed to read ${DIAGRAMRC_FILENAME}: ${err.message}`);
    process.exit(2);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`\u274c ${DIAGRAMRC_FILENAME} is not valid JSON: ${err.message}`);
    process.exit(2);
  }

  const result = DiagramRcSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')||'(root)'}: ${issue.message}`)
      .join('\n');
    console.error(`\u274c Invalid ${DIAGRAMRC_FILENAME}:\n${issues}`);
    process.exit(2);
  }

  if (!opts.quiet) {
    // Only log the load notice in DEBUG mode — don't clutter normal output
    if (process.env.DEBUG) {
      console.log(`\u2139\ufe0f  Loaded ${DIAGRAMRC_FILENAME} from ${rcPath}`);
    }
  }

  return result.data;
}

module.exports = {
  loadDiagramRc,
};
