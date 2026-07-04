const sanitize = require('sanitize-filename');

/**
 * Sanitizes a string for display/logging purposes (not for the actual
 * filesystem write, which yt-dlp handles itself based on the output template).
 */
function sanitizeForDisplay(name) {
  if (!name) return name;
  const cleaned = sanitize(name, { replacement: '_' });
  return cleaned || 'untitled';
}

module.exports = { sanitizeForDisplay };
