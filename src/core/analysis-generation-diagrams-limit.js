const chalk = require('chalk');

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
