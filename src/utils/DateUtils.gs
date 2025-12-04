/**
 * Date and time utility functions
 */

/**
 * Formats a date according to specified format
 * @param {Date} date - The date to format
 * @param {string} format - Format string (default: 'yyyy-MM-dd HH:mm:ss')
 * @return {string} Formatted date string
 */
function formatDate(date, format = 'yyyy-MM-dd HH:mm:ss') {
  const timezone = Session.getScriptTimeZone();
  return Utilities.formatDate(date, timezone, format);
}

/**
 * Parses a date string
 * @param {string} dateString - The date string to parse
 * @return {Date} Parsed date object
 */
function parseDate(dateString) {
  return new Date(dateString);
}

/**
 * Gets the date range for the current week
 * @return {Object} Object with startDate and endDate
 */
function getCurrentWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - dayOfWeek);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return {
    startDate: startDate,
    endDate: endDate
  };
}

/**
 * Calculates the difference between two dates in days
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @return {number} Difference in days
 */
function dateDiffInDays(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date2 - date1) / oneDay);
}

/**
 * Checks if a date is a weekend
 * @param {Date} date - The date to check
 * @return {boolean} True if the date is a weekend
 */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}
