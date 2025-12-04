# Google Apps Script Copilot Instructions

This workspace contains GAS utilities and web scrapers using `clasp` for deployment.

## Project Architecture

```
projects/           # 獨立 GAS 專案 (各有 appsscript.json + .clasp.json)
  ├── memory-price-scraper/  # DRAMeXchange 報價爬蟲
  └── etf-scraper/           # ETF 持倉追蹤
shared/             # 共用工具 (複製到專案中使用)
  ├── utils/        # CommonUtils, DateUtils, StringUtils
  └── triggers/     # TimeTriggers, SpreadsheetTriggers
experimental/       # 實驗性功能 (謹慎使用)
```

## Developer Workflow

```bash
# 部署專案到 Apps Script
cd projects/memory-price-scraper
clasp push

# 查看執行日誌
clasp logs
```

## Code Patterns

### Scraper Pattern (參考 `MemoryScraper.gs`, `EtfScraper.gs`)
每個爬蟲專案遵循此結構：
- **Config.gs**: `const CONFIG = { TARGET_URL, MAX_RETRIES, RETENTION_DAYS, ... }`
- **主程式**: `runDailyJob()` 作為排程入口點
- **HTTP 處理**: 使用 `muteHttpExceptions: true` + 手動處理 302 重定向與 Cookie
- **重試邏輯**: 指數退避 `Math.pow(2, attempt) * 1000`

```javascript
// 標準 HTTP fetch 模式
function fetchHtml(url) {
  var options = {
    muteHttpExceptions: true,
    followRedirects: false,
    headers: { 'User-Agent': '...' }
  };
  // 處理 301/302 重定向...
}
```

### Logging Pattern
使用 `log(message, level)` 函數，日誌寫入獨立的 `Logs` Sheet：
```javascript
log('執行開始');
log('錯誤訊息', 'ERROR');
```

### Sheet Operations
- 使用 `getOrCreateSheet(sheetName, headers)` 避免重複建立
- 動態解析表頭而非硬編碼
- 設定 `RETENTION_DAYS` 自動清理舊資料

## Runtime & Syntax
- **V8 Runtime**: 使用 ES6+ (`const`, `let`, arrow functions, template literals)
- **appsscript.json**: 設定 `"runtimeVersion": "V8"`, `"timeZone": "Asia/Taipei"`

## GAS Performance Tips
- **批次讀寫**: `range.getValues()` / `range.setValues()` 而非逐格操作
- **避免 flush()**: 除非必須立即更新 UI
- **6 分鐘限制**: 長任務需分批處理

## Error Handling
```javascript
try {
  var html = fetchHtml(CONFIG.TARGET_URL);
  if (!html || html.length < 5000) {
    throw new Error('HTML 內容過短');
  }
} catch (e) {
  log('執行失敗: ' + e.toString(), 'ERROR');
}
```

## Security
- 敏感資料存於 `PropertiesService.getScriptProperties()`
- `appsscript.json` 僅請求必要的 scopes
