# Quick Reference Guide

快速參考指南 / Quick Reference Guide

## 常用函數 (Common Functions)

### 日誌記錄 (Logging)

```javascript
logWithTimestamp('訊息內容', 'INFO');    // INFO, WARNING, ERROR
```

### 電子郵件 (Email)

```javascript
sendEmailNotification(
  'recipient@example.com',
  '郵件主旨',
  '郵件內容'
);
```

### 試算表操作 (Sheet Operations)

```javascript
// 讀取資料
const data = getSheetData('SPREADSHEET_ID', 'Sheet1');

// 寫入資料
writeSheetData('SPREADSHEET_ID', 'Sheet1', data, 'A1');

// 備份試算表
const backupId = backupSpreadsheet('SOURCE_ID', 'FOLDER_ID');
```

### 日期時間 (Date/Time)

```javascript
// 格式化日期
const formatted = formatDate(new Date(), 'yyyy-MM-dd');

// 取得本週範圍
const week = getCurrentWeekRange();

// 計算日期差
const diff = dateDiffInDays(date1, date2);

// 檢查是否為週末
const weekend = isWeekend(new Date());
```

### 字串處理 (String Operations)

```javascript
// 標題化
const title = toTitleCase('hello world');  // "Hello World"

// 截斷字串
const truncated = truncateString('long text...', 10);

// 驗證電子郵件
const valid = isValidEmail('test@example.com');

// 產生隨機字串
const random = generateRandomString(8);

// URL slug
const slug = slugify('Hello World!');  // "hello-world"
```

## 觸發器設定 (Trigger Setup)

### 時間觸發器 (Time Triggers)

```javascript
// 建立每日觸發器 (每天 9 點)
ScriptApp.newTrigger('dailyTrigger')
  .timeBased()
  .atHour(9)
  .everyDays(1)
  .create();

// 建立每小時觸發器
ScriptApp.newTrigger('hourlyTrigger')
  .timeBased()
  .everyHours(1)
  .create();

// 建立每週觸發器 (週一 9 點)
ScriptApp.newTrigger('weeklyTrigger')
  .timeBased()
  .onWeekDay(ScriptApp.WeekDay.MONDAY)
  .atHour(9)
  .create();

// 一次建立所有觸發器
createTimeTriggers();

// 刪除所有觸發器
deleteAllTriggers();
```

### 試算表觸發器 (Spreadsheet Triggers)

```javascript
// 程式化建立
createSpreadsheetTriggers();

// 手動在編輯器中設定:
// 1. 點擊時鐘圖示 (觸發器)
// 2. 新增觸發器
// 3. 選擇函數和事件類型
```

## 實驗性功能 (Experimental Features)

### 資料處理 (Data Processing)

```javascript
// CSV 轉 JSON
const json = csvToJson(csvString);

// JSON 轉 CSV
const csv = jsonToCsv(jsonArray);

// 過濾資料
const filtered = filterData(data, {
  status: 'active',
  age: { operator: '>=', value: 18 }
});

// 分組
const grouped = groupBy(data, 'category');

// 去重
const unique = deduplicateData(data, 'id');
```

### API 整合 (API Integration)

```javascript
// HTTP 請求
const response = makeHttpRequest('https://api.example.com/data', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer TOKEN' }
});

// 分頁資料
const allData = fetchPaginatedData('https://api.example.com/items', {
  limit: 100
}, 10);

// 速率限制請求
const result = rateLimitedRequest('https://api.example.com/data');
```

### 進階試算表操作 (Advanced Sheet Operations)

```javascript
// 條件格式
applyConditionalFormatting('SHEET_ID', 'Sheet1', 'A1:C10', 100);

// 建立樞紐分析表
createPivotTable('SHEET_ID', 'Source', 'Pivot');

// 資料統計分析
const stats = analyzeColumnData('SHEET_ID', 'Sheet1', 2);
// 返回: { count, sum, mean, median, min, max, stdDev }
```

## 配置管理 (Configuration)

### 使用 Properties Service

```javascript
// 設定屬性
PropertiesService.getScriptProperties().setProperty('KEY', 'value');

// 讀取屬性
const value = PropertiesService.getScriptProperties().getProperty('KEY');

// 批次設定
PropertiesService.getScriptProperties().setProperties({
  'SPREADSHEET_ID': 'your-id',
  'EMAIL': 'your-email@example.com'
});
```

### 初始設定範例

```javascript
function setupConfig() {
  PropertiesService.getScriptProperties().setProperties({
    'SPREADSHEET_ID': 'YOUR_SPREADSHEET_ID',
    'BACKUP_FOLDER_ID': 'YOUR_FOLDER_ID',
    'NOTIFICATION_EMAIL': 'your@email.com',
    'TIMEZONE': 'Asia/Taipei'
  });
}
```

## 常見模式 (Common Patterns)

### 每日報告

```javascript
function dailyReport() {
  const spreadsheetId = getProperty('SPREADSHEET_ID');
  const email = getProperty('NOTIFICATION_EMAIL');
  
  const data = getSheetData(spreadsheetId, 'Data');
  const stats = analyzeColumnData(spreadsheetId, 'Data', 2);
  
  const body = `
    每日報告摘要:
    - 總筆數: ${stats.count}
    - 平均值: ${stats.mean.toFixed(2)}
    - 最小值: ${stats.min}
    - 最大值: ${stats.max}
  `;
  
  sendEmailNotification(email, '每日報告', body);
}
```

### 自動備份

```javascript
function autoBackup() {
  const sourceId = getProperty('SPREADSHEET_ID');
  const folderId = getProperty('BACKUP_FOLDER_ID');
  const email = getProperty('NOTIFICATION_EMAIL');
  
  try {
    const backupId = backupSpreadsheet(sourceId, folderId);
    sendEmailNotification(
      email,
      '備份成功',
      `備份已建立: ${backupId}`
    );
  } catch (error) {
    sendEmailNotification(
      email,
      '備份失敗',
      `錯誤: ${error.message}`
    );
  }
}
```

### 表單處理

```javascript
function onFormSubmit(e) {
  const values = e.values;
  const email = values[1];
  const name = values[2];
  
  // 發送確認郵件
  sendEmailNotification(
    email,
    '表單已收到',
    `${name} 您好，\n\n感謝您的提交！`
  );
  
  // 記錄
  logWithTimestamp(`表單由 ${name} 提交`, 'INFO');
}
```

## 故障排除 (Troubleshooting)

### 檢查觸發器

```javascript
listAllTriggers();
```

### 檢查配置

```javascript
const props = PropertiesService.getScriptProperties().getProperties();
Logger.log(props);
```

### 檢查配額

前往: [Apps Script 配額](https://script.google.com/dashboard)

### 常見錯誤

1. **權限錯誤**: 重新授權腳本
2. **配額超限**: 增加延遲或減少請求
3. **執行逾時**: 拆分成較小的任務

## 最佳實踐 (Best Practices)

1. ✅ 始終使用 try-catch 進行錯誤處理
2. ✅ 使用 logWithTimestamp 記錄重要事件
3. ✅ 將敏感資料存儲在 Properties Service
4. ✅ 為長時間運行的腳本添加延遲
5. ✅ 測試後再部署到生產環境
6. ✅ 定期備份重要資料
7. ✅ 監控執行日誌
8. ✅ 設定錯誤通知

## 有用的連結 (Useful Links)

- [Apps Script 文件](https://developers.google.com/apps-script)
- [Apps Script 參考](https://developers.google.com/apps-script/reference)
- [配額限制](https://developers.google.com/apps-script/guides/services/quotas)
- [最佳實踐](https://developers.google.com/apps-script/guides/support/best-practices)
- [clasp CLI](https://github.com/google/clasp)

## 獲取幫助 (Getting Help)

1. 檢查 [API 文件](API.md)
2. 閱讀 [設定指南](SETUP.md)
3. 查看 [Stack Overflow](https://stackoverflow.com/questions/tagged/google-apps-script)
4. 開啟 GitHub Issue

---

💡 提示: 將此頁面加入書籤以快速參考！

💡 Tip: Bookmark this page for quick reference!
