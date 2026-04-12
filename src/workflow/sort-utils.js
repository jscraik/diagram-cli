function compareStringsDeterministically(leftValue, rightValue) {
  const left = String(leftValue || '');
  const right = String(rightValue || '');
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortStringsDeterministically(values) {
  return [...(values || [])].sort(compareStringsDeterministically);
}

module.exports = {
  compareStringsDeterministically,
  sortStringsDeterministically,
};
