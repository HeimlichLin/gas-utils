/**
 * Spreadsheet event triggers
 * These functions respond to spreadsheet events
 */

/**
 * On open trigger - runs when the spreadsheet is opened
 * @param {Object} e - The event object
 */
function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Custom Menu')
    .addItem('Run Function 1', 'customFunction1')
    .addItem('Run Function 2', 'customFunction2')
    .addSeparator()
    .addSubMenu(ui.createMenu('Utilities')
      .addItem('Export to PDF', 'exportToPDF')
      .addItem('Send Email', 'sendEmailReport'))
    .addToUi();
  
  logWithTimestamp('Spreadsheet opened', 'INFO');
}

/**
 * On edit trigger - runs when a cell is edited
 * @param {Object} e - The event object
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  
  logWithTimestamp(`Cell edited: ${sheet.getName()}!${range.getA1Notation()}`, 'INFO');
  
  // Example: Add timestamp when a specific column is edited
  if (range.getColumn() === 2) { // Column B
    const timestampColumn = 3; // Column C
    sheet.getRange(range.getRow(), timestampColumn).setValue(new Date());
  }
}

/**
 * On form submit trigger - runs when a form is submitted
 * @param {Object} e - The event object
 */
function onFormSubmit(e) {
  const responses = e.values;
  logWithTimestamp(`Form submitted with ${responses.length} responses`, 'INFO');
  
  // Example: Send notification email
  // const email = responses[1]; // Assuming email is in second column
  // sendEmailNotification(email, 'Form Submitted', 'Thank you for your submission!');
}

/**
 * On change trigger - runs when the spreadsheet structure changes
 * @param {Object} e - The event object
 */
function onChange(e) {
  logWithTimestamp('Spreadsheet structure changed', 'INFO');
  
  // Example: Handle sheet additions or deletions
  if (e.changeType === 'INSERT_GRID') {
    logWithTimestamp('New sheet added', 'INFO');
  } else if (e.changeType === 'REMOVE_GRID') {
    logWithTimestamp('Sheet removed', 'INFO');
  }
}

/**
 * Creates spreadsheet event triggers programmatically
 * Run this function once to set up spreadsheet triggers
 */
function createSpreadsheetTriggers() {
  const ss = SpreadsheetApp.getActive();
  
  // Create on edit trigger
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  
  // Create on change trigger
  ScriptApp.newTrigger('onChange')
    .forSpreadsheet(ss)
    .onChange()
    .create();
  
  logWithTimestamp('Spreadsheet triggers created', 'INFO');
}

// Example custom functions

function customFunction1() {
  SpreadsheetApp.getUi().alert('Custom Function 1 executed!');
}

function customFunction2() {
  SpreadsheetApp.getUi().alert('Custom Function 2 executed!');
}

function exportToPDF() {
  SpreadsheetApp.getUi().alert('Export to PDF functionality');
  // Implement PDF export logic here
}

function sendEmailReport() {
  SpreadsheetApp.getUi().alert('Send email report functionality');
  // Implement email report logic here
}
