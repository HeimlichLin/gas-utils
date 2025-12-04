/**
 * Utility functions for Google Apps Script
 * Collection of commonly used helper functions
 */

/**
 * Logs a message with timestamp
 * @param {string} message - The message to log
 * @param {string} level - Log level (INFO, WARNING, ERROR)
 */
function logWithTimestamp(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  Logger.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * Sends an email notification
 * @param {string} recipient - Email address of the recipient
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 */
function sendEmailNotification(recipient, subject, body) {
  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: body
    });
    logWithTimestamp(`Email sent to ${recipient}`, 'INFO');
  } catch (error) {
    logWithTimestamp(`Failed to send email: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Gets data from a specific Google Sheet
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} sheetName - The name of the sheet
 * @return {Array} The data from the sheet
 */
function getSheetData(spreadsheetId, sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    const data = sheet.getDataRange().getValues();
    logWithTimestamp(`Retrieved ${data.length} rows from ${sheetName}`, 'INFO');
    return data;
  } catch (error) {
    logWithTimestamp(`Failed to get sheet data: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Writes data to a specific Google Sheet
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} sheetName - The name of the sheet
 * @param {Array} data - The data to write
 * @param {string} startCell - The starting cell (e.g., 'A1')
 */
function writeSheetData(spreadsheetId, sheetName, data, startCell = 'A1') {
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    if (!data || data.length === 0 || !data[0] || data[0].length === 0) {
      throw new Error('Data is empty or invalid');
    }
    
    const range = sheet.getRange(startCell);
    range.offset(0, 0, data.length, data[0].length).setValues(data);
    logWithTimestamp(`Wrote ${data.length} rows to ${sheetName}`, 'INFO');
  } catch (error) {
    logWithTimestamp(`Failed to write sheet data: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Creates a backup of a Google Sheet
 * @param {string} sourceSpreadsheetId - The ID of the source spreadsheet
 * @param {string} backupFolderId - The ID of the backup folder in Google Drive
 * @return {string} The ID of the backup spreadsheet
 */
function backupSpreadsheet(sourceSpreadsheetId, backupFolderId) {
  try {
    const sourceFile = DriveApp.getFileById(sourceSpreadsheetId);
    const backupFolder = DriveApp.getFolderById(backupFolderId);
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    const backupName = `${sourceFile.getName()}_backup_${timestamp}`;
    
    const backup = sourceFile.makeCopy(backupName, backupFolder);
    logWithTimestamp(`Created backup: ${backupName}`, 'INFO');
    return backup.getId();
  } catch (error) {
    logWithTimestamp(`Failed to create backup: ${error.message}`, 'ERROR');
    throw error;
  }
}
