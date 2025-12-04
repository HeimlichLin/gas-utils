# Google Apps Script Utils - Documentation

## Overview

This repository contains a collection of Google Apps Script utilities and experimental code snippets for personal development and backup purposes.

## Table of Contents

- [Getting Started](#getting-started)
- [Directory Structure](#directory-structure)
- [Available Utilities](#available-utilities)
- [Experimental Features](#experimental-features)
- [Usage Examples](#usage-examples)
- [Contributing](#contributing)

## Getting Started

### Prerequisites

- Google Account
- Access to Google Apps Script Editor
- (Optional) [clasp](https://github.com/google/clasp) CLI for local development

### Installation

#### Option 1: Using clasp (Recommended for Development)

1. Install clasp globally:
```bash
npm install -g @google/clasp
```

2. Login to your Google account:
```bash
clasp login
```

3. Clone this repository:
```bash
git clone https://github.com/HeimlichLin/gas-utils.git
cd gas-utils
```

4. Create a new Apps Script project or link to an existing one:
```bash
clasp create --title "My GAS Utils" --type standalone
# or
clasp clone <SCRIPT_ID>
```

5. Push the code to your Apps Script project:
```bash
clasp push
```

#### Option 2: Manual Copy-Paste

1. Open [Google Apps Script Editor](https://script.google.com)
2. Create a new project
3. Copy the contents of the `.gs` files from this repository
4. Paste them into separate script files in your project

## Directory Structure

```
gas-utils/
├── src/                    # Main utilities
│   ├── utils/              # Utility functions
│   │   ├── CommonUtils.gs  # Common utility functions
│   │   ├── DateUtils.gs    # Date/time utilities
│   │   └── StringUtils.gs  # String manipulation utilities
│   └── triggers/           # Trigger handlers
│       ├── TimeTriggers.gs # Time-based triggers
│       └── SpreadsheetTriggers.gs # Spreadsheet event triggers
├── experimental/           # Experimental code snippets
│   ├── AdvancedSheetOps.gs # Advanced sheet operations
│   ├── APIIntegration.gs   # API integration utilities
│   └── DataProcessing.gs   # Data processing utilities
└── docs/                   # Documentation
    └── API.md              # API documentation (this file)
```

## Available Utilities

### CommonUtils.gs

Basic utility functions for common tasks:

- `logWithTimestamp(message, level)` - Logs messages with timestamps
- `sendEmailNotification(recipient, subject, body)` - Sends email notifications
- `getSheetData(spreadsheetId, sheetName)` - Retrieves data from a sheet
- `writeSheetData(spreadsheetId, sheetName, data, startCell)` - Writes data to a sheet
- `backupSpreadsheet(sourceSpreadsheetId, backupFolderId)` - Creates backups

### DateUtils.gs

Date and time manipulation functions:

- `formatDate(date, format)` - Formats dates
- `parseDate(dateString)` - Parses date strings
- `getCurrentWeekRange()` - Gets current week date range
- `dateDiffInDays(date1, date2)` - Calculates difference between dates
- `isWeekend(date)` - Checks if a date is a weekend

### StringUtils.gs

String manipulation utilities:

- `toTitleCase(str)` - Converts to title case
- `truncateString(str, maxLength, suffix)` - Truncates strings
- `stripHtmlTags(html)` - Removes HTML tags
- `isValidEmail(email)` - Validates email addresses
- `generateRandomString(length)` - Generates random strings
- `slugify(str)` - Converts to URL-friendly slugs

### TimeTriggers.gs

Time-based trigger management:

- `dailyTrigger()` - Daily execution handler
- `hourlyTrigger()` - Hourly execution handler
- `weeklyTrigger()` - Weekly execution handler
- `monthlyTrigger()` - Monthly execution handler
- `createTimeTriggers()` - Sets up all time triggers
- `deleteAllTriggers()` - Removes all triggers
- `listAllTriggers()` - Lists active triggers

### SpreadsheetTriggers.gs

Spreadsheet event handlers:

- `onOpen(e)` - Runs when spreadsheet opens
- `onEdit(e)` - Runs when a cell is edited
- `onFormSubmit(e)` - Runs when a form is submitted
- `onChange(e)` - Runs when structure changes
- `createSpreadsheetTriggers()` - Sets up spreadsheet triggers

## Experimental Features

⚠️ **Warning**: Experimental features are under development and may have bugs or incomplete functionality. Use with caution in production environments.

### AdvancedSheetOps.gs

- Conditional formatting
- Pivot table creation
- Batch sheet operations
- Column data analysis

### APIIntegration.gs

- Generic HTTP requests
- Paginated data fetching
- Webhook handlers
- Rate-limited API clients

### DataProcessing.gs

- CSV/JSON conversion
- Data filtering
- Data grouping and aggregation
- Data deduplication

## Usage Examples

### Example 1: Daily Backup

```javascript
function dailyBackup() {
  const sourceSpreadsheetId = 'YOUR_SPREADSHEET_ID';
  const backupFolderId = 'YOUR_BACKUP_FOLDER_ID';
  
  try {
    const backupId = backupSpreadsheet(sourceSpreadsheetId, backupFolderId);
    logWithTimestamp(`Backup created: ${backupId}`, 'INFO');
    
    // Send notification
    sendEmailNotification(
      'your.email@example.com',
      'Daily Backup Completed',
      `Backup successfully created at ${new Date()}`
    );
  } catch (error) {
    logWithTimestamp(`Backup failed: ${error.message}`, 'ERROR');
  }
}

// Set up as a daily trigger
ScriptApp.newTrigger('dailyBackup')
  .timeBased()
  .atHour(2)  // Run at 2 AM
  .everyDays(1)
  .create();
```

### Example 2: Data Processing

```javascript
function processSheetData() {
  const spreadsheetId = 'YOUR_SPREADSHEET_ID';
  const sheetName = 'Data';
  
  // Get data
  const data = getSheetData(spreadsheetId, sheetName);
  
  // Convert to JSON (skip header row)
  const headers = data[0];
  const jsonData = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  
  // Filter data
  const filtered = filterData(jsonData, {
    status: 'active',
    age: { operator: '>=', value: 18 }
  });
  
  // Group by category
  const grouped = groupBy(filtered, 'category');
  
  logWithTimestamp(`Processed ${filtered.length} records`, 'INFO');
}
```

### Example 3: API Integration

```javascript
function fetchExternalData() {
  const apiUrl = 'https://api.example.com/data';
  
  // Make API request
  const response = makeHttpRequest(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  });
  
  if (response.success) {
    logWithTimestamp(`Fetched ${response.data.length} items`, 'INFO');
    
    // Process and save to sheet
    const spreadsheetId = 'YOUR_SPREADSHEET_ID';
    const sheetName = 'API Data';
    
    // Convert to 2D array
    const dataArray = response.data.map(item => [
      item.id,
      item.name,
      item.value
    ]);
    
    writeSheetData(spreadsheetId, sheetName, dataArray);
  } else {
    logWithTimestamp(`API request failed: ${response.error}`, 'ERROR');
  }
}
```

## Contributing

This is a personal repository, but feel free to fork and adapt for your own use. If you find bugs or have suggestions, please open an issue.

## License

MIT License - See [LICENSE](../LICENSE) file for details.

## Additional Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Apps Script Reference](https://developers.google.com/apps-script/reference)
- [clasp - Command Line Apps Script Projects](https://github.com/google/clasp)
- [Google Apps Script Best Practices](https://developers.google.com/apps-script/guides/support/best-practices)
