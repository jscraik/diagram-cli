const chalk = require('chalk');

function limitItems(items, limit, warningTemplate = null) {
  const list = Array.isArray(items) ? items : [];
  const capped = list.slice(0, limit);

  if (typeof warningTemplate === 'string' && list.length > limit) {
    const warning = warningTemplate.replace('{limit}', String(limit));
    console.warn(chalk.yellow(`⚠️  ${warning}`));
  }

  return capped;
}

module.exports = {
  limitItems,
};
