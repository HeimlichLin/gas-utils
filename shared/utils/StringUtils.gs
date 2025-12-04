/**
 * String manipulation utility functions
 */

/**
 * Converts a string to title case
 * @param {string} str - The string to convert
 * @return {string} Title case string
 */
function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
}

/**
 * Truncates a string to a specified length
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @return {string} Truncated string
 */
function truncateString(str, maxLength, suffix = '...') {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Removes HTML tags from a string
 * @param {string} html - The HTML string
 * @return {string} Plain text string
 */
function stripHtmlTags(html) {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Validates an email address
 * @param {string} email - The email address to validate
 * @return {boolean} True if valid email
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Generates a random string
 * @param {number} length - Length of the string
 * @return {string} Random string
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Converts a string to a URL-friendly slug
 * @param {string} str - The string to convert
 * @return {string} URL slug
 */
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
