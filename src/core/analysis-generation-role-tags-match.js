/**
 * Determines whether the given text contains the specified token as a whole token-like substring.
 *
 * Matching is case-insensitive and requires the token to be bounded by the start or end of the string
 * or by one-character separators: '/', '\', '.', '_' or '-'.
 *
 * @param {string} text - The text to search within.
 * @param {string} token - The token to search for; all characters in this token are matched literally.
 * @returns {boolean} `true` if the token is present as a whole token-like substring, `false` otherwise.
 */
function textHasToken(text, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[\\\\/._-])${escaped}([\\\\/._-]|$)`, 'i');
  return re.test(text);
}

module.exports = {
  textHasToken,
};