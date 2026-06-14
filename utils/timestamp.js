/**
 * Format a Unix timestamp as a Discord timestamp markdown
 * @param {number} unixTime - Unix timestamp in seconds
 * @returns {string} Discord timestamp markdown
 */
export function formatDiscordTimestamp(unixTime) {
  // Discord timestamp format styles:
  // t = short time (5:30 PM)
  // T = long time (5:30:45 PM)
  // d = short date (09/06/2026)
  // D = long date (September 6, 2026)
  // f = short date time (September 6, 2026 5:30 PM) - default
  // F = long date time (Sunday, September 6, 2026 5:30 PM)
  // R = relative (2 hours from now)
  
  // Default format: f (short date time)
  return `<t:${unixTime}:f>`;
}

/**
 * Get all available Discord timestamp formats
 * @returns {Object} Object with format codes and descriptions
 */
export function getTimestampFormats() {
  return {
    't': 'Short time (5:30 PM)',
    'T': 'Long time (5:30:45 PM)',
    'd': 'Short date (09/06/2026)',
    'D': 'Long date (September 6, 2026)',
    'f': 'Short date time (September 6, 2026 5:30 PM)',
    'F': 'Long date time (Sunday, September 6, 2026 5:30 PM)',
    'R': 'Relative (2 hours from now)',
  };
}

/**
 * Format timestamp with a specific style
 * @param {number} unixTime - Unix timestamp in seconds
 * @param {string} style - Format style (t, T, d, D, f, F, R)
 * @returns {string} Discord timestamp markdown
 */
export function formatTimestampWithStyle(unixTime, style = 'f') {
  const validStyles = ['t', 'T', 'd', 'D', 'f', 'F', 'R'];
  if (!validStyles.includes(style)) {
    style = 'f';
  }
  return `<t:${unixTime}:${style}>`;
}
