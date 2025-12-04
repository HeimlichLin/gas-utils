# Setup Guide

This guide will help you set up and use the Google Apps Script utilities in this repository.

## Quick Start

### 1. Choose Your Setup Method

There are two ways to use these utilities:

#### A. Using clasp (Recommended for developers)

Best for: Version control, local development, multiple projects

**Prerequisites:**
- Node.js and npm installed
- Google Account

**Steps:**

```bash
# Install clasp globally
npm install -g @google/clasp

# Login to Google
clasp login

# Clone this repository
git clone https://github.com/HeimlichLin/gas-utils.git
cd gas-utils

# Create a new Apps Script project
clasp create --title "My GAS Utils" --type standalone

# Push code to Apps Script
clasp push

# Open in browser
clasp open
```

#### B. Manual Setup (Simpler but less flexible)

Best for: Quick testing, one-time use, no local development needed

**Steps:**

1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Copy files from this repository:
   - For each `.gs` file, create a new script file in your project
   - Copy and paste the content
   - Name the files accordingly (without the `.gs` extension)
4. Save the project

### 2. Configure Your First Script

After setting up, you'll need to configure the scripts for your use case:

#### For Spreadsheet Operations

1. Find your spreadsheet ID:
   - Open your Google Sheet
   - The ID is in the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

2. Update the script with your spreadsheet ID:
```javascript
const SPREADSHEET_ID = 'your-spreadsheet-id-here';
```

#### For Email Notifications

1. Make sure your Google Account has Gmail access
2. Update the recipient email in the script:
```javascript
const NOTIFICATION_EMAIL = 'your-email@example.com';
```

### 3. Set Up Triggers

Triggers allow your scripts to run automatically.

#### Using the Script Editor (Manual)

1. In the Apps Script Editor, click on the clock icon (Triggers)
2. Click "Add Trigger"
3. Choose:
   - Function to run (e.g., `dailyTrigger`)
   - Event source (Time-driven or Spreadsheet-driven)
   - Time/event type
4. Save

#### Using Code (Programmatic)

Run the setup functions once to create all triggers:

```javascript
// For time-based triggers
createTimeTriggers();

// For spreadsheet triggers
createSpreadsheetTriggers();
```

### 4. Test Your Setup

Run a simple test function to make sure everything works:

```javascript
function testSetup() {
  logWithTimestamp('Test successful!', 'INFO');
  Logger.log('Setup is working correctly');
}
```

In the Apps Script Editor:
1. Select `testSetup` from the function dropdown
2. Click the Run button (▶️)
3. Grant permissions when prompted
4. Check the logs (View > Logs)

## Common Use Cases

### Use Case 1: Automated Daily Reports

```javascript
function generateDailyReport() {
  const spreadsheetId = 'YOUR_SPREADSHEET_ID';
  const sheetName = 'Daily Data';
  
  // Get yesterday's data
  const data = getSheetData(spreadsheetId, sheetName);
  
  // Process and send report
  const summary = analyzeColumnData(spreadsheetId, sheetName, 2);
  
  const emailBody = `
    Daily Report Summary:
    - Total entries: ${summary.count}
    - Average: ${summary.mean.toFixed(2)}
    - Min: ${summary.min}
    - Max: ${summary.max}
  `;
  
  sendEmailNotification(
    'manager@example.com',
    'Daily Report',
    emailBody
  );
}

// Set up daily trigger at 9 AM
ScriptApp.newTrigger('generateDailyReport')
  .timeBased()
  .atHour(9)
  .everyDays(1)
  .create();
```

### Use Case 2: Form Response Handler

```javascript
function onFormSubmit(e) {
  const responses = e.values;
  
  // responses[0] = timestamp
  // responses[1] = email
  // responses[2] = name
  // ... other form fields
  
  const email = responses[1];
  const name = responses[2];
  
  // Send confirmation email
  sendEmailNotification(
    email,
    'Form Submission Received',
    `Hi ${name},\n\nThank you for your submission!`
  );
  
  // Log the submission
  logWithTimestamp(`Form submitted by ${name} (${email})`, 'INFO');
}
```

### Use Case 3: Automated Backups

```javascript
function createWeeklyBackup() {
  const sourceSpreadsheetId = 'YOUR_SPREADSHEET_ID';
  const backupFolderId = 'YOUR_BACKUP_FOLDER_ID';
  
  try {
    const backupId = backupSpreadsheet(sourceSpreadsheetId, backupFolderId);
    
    sendEmailNotification(
      'admin@example.com',
      'Weekly Backup Complete',
      `Backup created successfully.\nBackup ID: ${backupId}`
    );
  } catch (error) {
    sendEmailNotification(
      'admin@example.com',
      'Weekly Backup FAILED',
      `Backup failed with error: ${error.message}`
    );
  }
}

// Set up weekly trigger (Sunday at 2 AM)
ScriptApp.newTrigger('createWeeklyBackup')
  .timeBased()
  .onWeekDay(ScriptApp.WeekDay.SUNDAY)
  .atHour(2)
  .create();
```

## Troubleshooting

### Permission Issues

**Problem:** Script asks for permissions repeatedly

**Solution:**
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Remove the Apps Script app
3. Run the script again and grant permissions cleanly

### Trigger Not Running

**Problem:** Time-based trigger doesn't execute

**Solution:**
1. Check the trigger is properly created (Clock icon in Script Editor)
2. Verify the trigger time zone matches your expectation
3. Check the execution log for errors (View > Executions)

### Rate Limits

**Problem:** "Service invoked too many times" error

**Solution:**
- Add delays between operations: `Utilities.sleep(1000)`
- Batch operations when possible
- Use exponential backoff for retries

### Script Timeout

**Problem:** "Exceeded maximum execution time" error

**Solution:**
- Break long operations into smaller chunks
- Use time-based triggers to process data in batches
- Store progress and resume from where you left off

## Best Practices

1. **Always test with sample data first**
2. **Use logging liberally** - `logWithTimestamp()` is your friend
3. **Set up error notifications** - Know when something fails
4. **Back up your scripts** - Use version control or clasp
5. **Document your customizations** - Add comments for future reference
6. **Be mindful of quotas** - Check [Apps Script Quotas](https://developers.google.com/apps-script/guides/services/quotas)

## Next Steps

- Explore the [API Documentation](API.md)
- Check out experimental features in the `experimental/` directory
- Customize the utilities for your specific needs
- Set up automated backups of your scripts

## Getting Help

- Check the [Apps Script Documentation](https://developers.google.com/apps-script)
- Look at [Stack Overflow](https://stackoverflow.com/questions/tagged/google-apps-script)
- Review the code examples in this repository

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit sensitive data** like API keys or spreadsheet IDs to version control
2. **Use Properties Service** for storing sensitive configuration:
   ```javascript
   PropertiesService.getScriptProperties().setProperty('API_KEY', 'your-key');
   const apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
   ```
3. **Be careful with triggers** - they run with your permissions
4. **Review permissions** regularly in your Google Account settings
