const chalk = require('chalk');

/**
 * Limit an input list to the first `limit` elements, optionally emitting a formatted warning when items were truncated.
 *
 * @param {*} items - The value to be treated as an array; if not an array it is treated as an empty list.
 * @param {number} limit - Maximum number of items to keep.
 * @param {string|null} [warningTemplate=null] - Optional template for a warning message; if a string and the original array length exceeds `limit` the function logs this template with `{limit}` replaced by the limit.
 * @returns {Array} The original items truncated to at most `limit` elements (or an empty array if `items` was not an array).
 */
function limitItems(items, limit, warningTemplate = null) {
  const list = Array.isArray(items) ? items : [];
  const parsedLimit = Number(limit);
  const safeLimit = Number.isFinite(parsedLimit) ? Math.max(0, Math.trunc(parsedLimit)) : list.length;
  const capped = list.slice(0, safeLimit);

  if (typeof warningTemplate === 'string' && list.length > safeLimit) {
    const warning = warningTemplate.replace('{limit}', String(safeLimit));
    console.warn(chalk.yellow(`⚠️  ${warning}`));
  }

  return capped;
}

module.exports = {
  limitItems,
};
