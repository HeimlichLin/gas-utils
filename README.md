# gas-utils

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8-blue)](https://developers.google.com/apps-script)
[![clasp](https://img.shields.io/badge/clasp-v2.4.2-green)](https://github.com/google/clasp)

個人的 Google Apps Script 開發工具與實驗性程式碼片段備份

Personal Google Apps Script development tools and experimental code snippets backup.

## 📋 概述 (Overview)

這是一個用於備份和管理個人 Google Apps Script 開發工具的存儲庫，包含：

- **獨立 GAS 專案** - 如記憶體報價爬蟲、ETF 持倉追蹤
- **共用工具函數** - 日期、字串、通用工具
- **觸發器管理** - 時間觸發器、試算表事件觸發器
- **實驗性功能** - 進階試算表操作、API 整合等

## 🛠️ 技術堆疊 (Technology Stack)

| 技術 | 版本 | 用途 |
|------|------|------|
| Google Apps Script | V8 Runtime | 主要開發語言 |
| clasp | ^2.4.2 | 本地開發與部署 |
| Node.js | - | clasp 運行環境 |
| @types/google-apps-script | ^1.0.83 | TypeScript 類型定義 |

## 🏗️ 專案架構 (Architecture)

```
gas-utils/
├── projects/                    # 獨立 GAS 專案 (各有 appsscript.json + .clasp.json)
│   ├── memory-price-scraper/    # DRAMeXchange 記憶體報價爬蟲
│   │   ├── Config.gs            # 設定檔
│   │   ├── MemoryScraper.gs     # 主程式
│   │   └── appsscript.json      # GAS 專案設定
│   └── etf-scraper/             # ETF 持倉追蹤
│       ├── EtfScraper.gs        # 主程式
│       └── appsscript.json      # GAS 專案設定
├── shared/                      # 共用工具 (複製到專案中使用)
│   ├── utils/                   # 工具函數
│   │   ├── CommonUtils.gs       # 常用工具 (日誌、郵件、Sheet 操作)
│   │   ├── DateUtils.gs         # 日期時間工具
│   │   └── StringUtils.gs       # 字串處理工具
│   └── triggers/                # 觸發器處理
│       ├── TimeTriggers.gs      # 時間觸發器 (每日/每小時/每週/每月)
│       └── SpreadsheetTriggers.gs # 試算表事件觸發器
├── experimental/                # 實驗性功能 (謹慎使用)
│   ├── AdvancedSheetOps.gs      # 進階試算表操作
│   ├── APIIntegration.gs        # API 整合工具
│   └── DataProcessing.gs        # 資料處理工具
└── docs/                        # 文件
    ├── API.md                   # API 文件
    ├── CONFIGURATION.md         # 設定範本
    ├── SETUP.md                 # 設定指南
    └── QUICK_REFERENCE.md       # 快速參考
```

## 🚀 快速開始 (Quick Start)

### 前置需求

- Google 帳號
- Node.js 和 npm
- [clasp](https://github.com/google/clasp) CLI

### 使用 clasp 部署

```bash
# 安裝 clasp
npm install -g @google/clasp

# 登入 Google 帳號
clasp login

# 複製此存儲庫
git clone https://github.com/HeimlichLin/gas-utils.git
cd gas-utils

# 部署專案到 Apps Script
cd projects/memory-price-scraper
clasp push

# 查看執行日誌
clasp logs
```

### 手動設定

1. 前往 [Google Apps Script](https://script.google.com)
2. 建立新專案
3. 複製 `.gs` 檔案內容到專案中
4. 儲存並執行

📖 詳細設定說明請參考 [SETUP.md](docs/SETUP.md)

## ✨ 主要功能 (Key Features)

### 獨立專案

| 專案 | 說明 | 排程 |
|------|------|------|
| **memory-price-scraper** | 抓取 DRAMeXchange 10 種記憶體報價 | 每日 08:00、12:00、16:00 |
| **etf-scraper** | 抓取 ETF 持倉資料 | 每日執行 |

### 共用工具函數

#### CommonUtils.gs
```javascript
logWithTimestamp('訊息', 'INFO');                    // 日誌記錄
sendEmailNotification(email, subject, body);         // 郵件通知
getSheetData(spreadsheetId, sheetName);              // 讀取試算表
writeSheetData(spreadsheetId, sheetName, data);      // 寫入試算表
backupSpreadsheet(sourceId, folderId);               // 備份試算表
```

#### DateUtils.gs
```javascript
formatDate(new Date(), 'yyyy-MM-dd');    // 格式化日期
getCurrentWeekRange();                    // 取得本週範圍
dateDiffInDays(date1, date2);            // 計算日期差
isWeekend(new Date());                    // 檢查是否為週末
```

#### StringUtils.gs
```javascript
toTitleCase('hello world');              // "Hello World"
truncateString('long text...', 10);      // 截斷字串
isValidEmail('test@example.com');        // 驗證 Email
generateRandomString(8);                  // 產生隨機字串
slugify('Hello World!');                 // "hello-world"
```

### 觸發器管理

- **TimeTriggers** - 時間基礎觸發器（每日、每小時、每週、每月）
- **SpreadsheetTriggers** - 試算表事件觸發器（開啟、編輯、表單提交）

### 實驗性功能

⚠️ 實驗性功能仍在開發中，使用時請謹慎

- **AdvancedSheetOps** - 進階試算表操作（條件格式、樞紐分析表、批次操作）
- **APIIntegration** - 外部 API 整合（HTTP 請求、分頁資料、Webhook）
- **DataProcessing** - 資料處理（CSV/JSON 轉換、過濾、分組、去重）

## 📝 開發工作流程 (Development Workflow)

### 專案結構

每個獨立專案包含：
- `appsscript.json` - GAS 專案設定（時區、權限等）
- `.clasp.json` - clasp 部署設定（不提交至 Git）

### 部署流程

```bash
# 進入專案目錄
cd projects/memory-price-scraper

# 推送變更到 Apps Script
clasp push

# 查看即時日誌
clasp logs --watch
```

### 常用 npm 指令

```bash
npm run push    # clasp push
npm run pull    # clasp pull
npm run open    # clasp open
npm run deploy  # clasp deploy
npm run logs    # clasp logs
```

## 📐 程式碼規範 (Coding Standards)

### 命名規範
- 使用 **camelCase** 命名函數和變數
- 使用 **JSDoc** 註解說明函數

### 爬蟲模式 (Scraper Pattern)

```javascript
// 標準 HTTP fetch 模式
function fetchHtml(url) {
  var options = {
    muteHttpExceptions: true,
    followRedirects: false,
    headers: { 'User-Agent': '...' }
  };
  // 處理 301/302 重定向與 Cookie...
}

// 重試邏輯：指數退避
for (var attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
  Utilities.sleep(Math.pow(2, attempt) * 1000);
}
```

### 日誌模式

```javascript
// 使用 log(message, level) 函數，日誌寫入獨立的 Logs Sheet
log('執行開始');
log('錯誤訊息', 'ERROR');
```

### GAS 效能最佳實踐

- **批次讀寫**: 使用 `range.getValues()` / `range.setValues()` 而非逐格操作
- **避免 flush()**: 除非必須立即更新 UI
- **6 分鐘限制**: 長任務需分批處理

## 📚 使用範例 (Usage Examples)

### 自動化每日報告

```javascript
function dailyReport() {
  const spreadsheetId = 'YOUR_SPREADSHEET_ID';
  const data = getSheetData(spreadsheetId, 'Data');
  
  // 處理資料並發送報告
  sendEmailNotification(
    'recipient@example.com',
    '每日報告',
    `今日處理了 ${data.length} 筆資料`
  );
}
```

### 試算表備份

```javascript
function backupSheet() {
  const sourceId = 'YOUR_SPREADSHEET_ID';
  const backupFolderId = 'YOUR_FOLDER_ID';
  
  const backupId = backupSpreadsheet(sourceId, backupFolderId);
  logWithTimestamp(`備份已建立: ${backupId}`, 'INFO');
}
```

更多範例請參考 [API 文件](docs/API.md)

## 🧪 測試 (Testing)

在提交前請確保：

1. 在 Apps Script 編輯器中測試程式碼
2. 確保沒有破壞現有功能
3. 測試邊界情況和錯誤處理

```javascript
function testSetup() {
  logWithTimestamp('Test successful!', 'INFO');
  Logger.log('Setup is working correctly');
}
```

## 🔒 安全注意事項 (Security)

- 敏感資料存於 `PropertiesService.getScriptProperties()`
- `appsscript.json` 僅請求必要的 scopes
- 不要在程式碼中硬編碼敏感資訊

```javascript
function setupProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties({
    'SPREADSHEET_ID': 'your-spreadsheet-id',
    'API_KEY': 'your-api-key'
  });
}
```

## 🤝 貢獻 (Contributing)

歡迎貢獻！請參考 [CONTRIBUTING.md](CONTRIBUTING.md) 了解貢獻指南。

1. Fork 此存儲庫
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📖 文件 (Documentation)

| 文件 | 說明 |
|------|------|
| [API.md](docs/API.md) | API 文件與使用範例 |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | 設定範本與最佳實踐 |
| [SETUP.md](docs/SETUP.md) | 詳細設定指南 |
| [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) | 快速參考卡 |

## 🔗 相關資源 (Resources)

- [Google Apps Script 官方文件](https://developers.google.com/apps-script)
- [Apps Script API 參考](https://developers.google.com/apps-script/reference)
- [clasp - 命令列工具](https://github.com/google/clasp)
- [Apps Script 最佳實踐](https://developers.google.com/apps-script/guides/support/best-practices)

## 📜 授權 (License)

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案。

---

⭐ 如果這個專案對您有幫助，歡迎給個 Star！

**注意**: 實驗性功能可能包含未完成或不穩定的程式碼，請在生產環境中謹慎使用。

**Note**: Experimental features may contain incomplete or unstable code. Use with caution in production environments.
