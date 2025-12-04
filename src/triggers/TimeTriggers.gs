/**
 * Time-based triggers for Google Apps Script
 * These functions can be set up as time-driven triggers in the Apps Script editor
 */

/**
 * Daily trigger example - runs once per day
 * Set this up to run at a specific time each day
 */
function dailyTrigger() {
  logWithTimestamp('Daily trigger executed', 'INFO');
  
  // Example: Send daily report
  // const data = getSheetData('YOUR_SPREADSHEET_ID', 'Sheet1');
  // processData(data);
}

/**
 * Hourly trigger example - runs once per hour
 * Set this up to run every hour
 */
function hourlyTrigger() {
  logWithTimestamp('Hourly trigger executed', 'INFO');
  
  // Example: Check for updates
  // checkForUpdates();
}

/**
 * Weekly trigger example - runs once per week
 * Set this up to run on a specific day of the week
 */
function weeklyTrigger() {
  logWithTimestamp('Weekly trigger executed', 'INFO');
  
  // Example: Generate weekly report
  // generateWeeklyReport();
}

/**
 * Monthly trigger example - runs once per month
 * Set this up to run on a specific day of the month
 */
function monthlyTrigger() {
  logWithTimestamp('Monthly trigger executed', 'INFO');
  
  // Example: Archive old data
  // archiveOldData();
}

/**
 * Creates all time-based triggers programmatically
 * Run this function once to set up all triggers
 */
function createTimeTriggers() {
  // Delete existing triggers to avoid duplicates
  deleteAllTriggers();
  
  // Create daily trigger (runs at 9 AM)
  ScriptApp.newTrigger('dailyTrigger')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
  
  // Create hourly trigger
  ScriptApp.newTrigger('hourlyTrigger')
    .timeBased()
    .everyHours(1)
    .create();
  
  // Create weekly trigger (runs on Monday at 9 AM)
  ScriptApp.newTrigger('weeklyTrigger')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();
  
  // Create monthly trigger (runs on 1st of each month at 9 AM)
  ScriptApp.newTrigger('monthlyTrigger')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();
  
  logWithTimestamp('All time-based triggers created', 'INFO');
}

/**
 * Deletes all triggers for this project
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  logWithTimestamp(`Deleted ${triggers.length} triggers`, 'INFO');
}

/**
 * Lists all active triggers
 */
function listAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  logWithTimestamp(`Found ${triggers.length} active triggers:`, 'INFO');
  
  for (let i = 0; i < triggers.length; i++) {
    const trigger = triggers[i];
    Logger.log(`- ${trigger.getHandlerFunction()} (${trigger.getEventType()})`);
  }
}
