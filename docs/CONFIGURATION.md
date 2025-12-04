# Configuration Template

This file shows example configurations for the gas-utils project.

## Environment Configuration

Create a `.clasp.json` file in your local environment (not committed to git):

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "./src"
}
```

## Script Properties

Use Apps Script Properties Service to store sensitive configuration:

```javascript
function setupProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // Set your configurations
  scriptProperties.setProperties({
    'SPREADSHEET_ID': 'your-spreadsheet-id',
    'BACKUP_FOLDER_ID': 'your-backup-folder-id',
    'NOTIFICATION_EMAIL': 'your-email@example.com',
    'API_KEY': 'your-api-key-if-needed',
    'TIMEZONE': 'Asia/Taipei'
  });
  
  Logger.log('Properties configured successfully');
}

function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}
```

## Usage in Scripts

```javascript
function exampleUsage() {
  const spreadsheetId = getProperty('SPREADSHEET_ID');
  const email = getProperty('NOTIFICATION_EMAIL');
  
  // Use the properties in your scripts
  const data = getSheetData(spreadsheetId, 'Sheet1');
  sendEmailNotification(email, 'Report', 'Data processed');
}
```

## Time Zone Configuration

The default timezone is set to `Asia/Taipei` in `appsscript.json`. 

To change it:

1. Open `appsscript.json`
2. Modify the `timeZone` field
3. Common values:
   - `America/New_York`
   - `America/Los_Angeles`
   - `Europe/London`
   - `Asia/Tokyo`
   - `Asia/Shanghai`

## OAuth Scopes

The project requires the following scopes (configured in `appsscript.json`):

- `spreadsheets` - Read and modify Google Sheets
- `drive` - Access Google Drive files
- `script.external_request` - Make external HTTP requests
- `mail.google.com` - Send emails
- `script.scriptapp` - Manage triggers

## Trigger Configuration

### Time-based Triggers

Configure in the script or Apps Script Editor:

```javascript
// Daily at 9 AM
ScriptApp.newTrigger('dailyTrigger')
  .timeBased()
  .atHour(9)
  .everyDays(1)
  .create();

// Hourly
ScriptApp.newTrigger('hourlyTrigger')
  .timeBased()
  .everyHours(1)
  .create();

// Weekly on Monday
ScriptApp.newTrigger('weeklyTrigger')
  .timeBased()
  .onWeekDay(ScriptApp.WeekDay.MONDAY)
  .atHour(9)
  .create();
```

### Spreadsheet Triggers

```javascript
function setupSpreadsheetTriggers() {
  const ss = SpreadsheetApp.getActive();
  
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
}
```

## Customization Examples

### Custom Email Templates

```javascript
function customEmailTemplate(recipient, data) {
  const template = `
    <html>
      <body>
        <h2>Report Summary</h2>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <p>Total Records: ${data.count}</p>
        <p>Status: ${data.status}</p>
      </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: recipient,
    subject: 'Custom Report',
    htmlBody: template
  });
}
```

### Custom Logging Format

```javascript
function customLog(message, level = 'INFO', category = 'GENERAL') {
  const timestamp = Utilities.formatDate(
    new Date(), 
    Session.getScriptTimeZone(), 
    'yyyy-MM-dd HH:mm:ss'
  );
  
  const logMessage = `[${timestamp}] [${level}] [${category}] ${message}`;
  Logger.log(logMessage);
  
  // Optional: Write to a log sheet
  const logSheet = SpreadsheetApp.openById('LOG_SHEET_ID').getSheetByName('Logs');
  logSheet.appendRow([timestamp, level, category, message]);
}
```

## Best Practices

1. **Never hardcode sensitive information** in scripts
2. **Use Properties Service** for configuration
3. **Set up error notifications** for critical triggers
4. **Test with sample data** before production use
5. **Monitor quota usage** regularly
6. **Keep backups** of your scripts and data
7. **Document custom modifications** in code comments

## Advanced Configuration

### Rate Limiting

```javascript
const RATE_LIMIT_CONFIG = {
  maxRequestsPerSecond: 10,
  retryAttempts: 3,
  retryDelay: 2000
};
```

### Batch Processing

```javascript
const BATCH_CONFIG = {
  batchSize: 100,
  processingDelay: 1000,
  maxBatches: 50
};
```

### Logging Levels

```javascript
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4
};

const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;
```

## Troubleshooting Configuration

### Check Current Configuration

```javascript
function checkConfiguration() {
  const props = PropertiesService.getScriptProperties().getProperties();
  
  Logger.log('Current Configuration:');
  for (const key in props) {
    // Don't log sensitive values in full
    if (key.includes('KEY') || key.includes('PASSWORD')) {
      Logger.log(`${key}: ***`);
    } else {
      Logger.log(`${key}: ${props[key]}`);
    }
  }
}
```

### Reset Configuration

```javascript
function resetConfiguration() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log('All properties deleted. Please run setupProperties()');
}
```
