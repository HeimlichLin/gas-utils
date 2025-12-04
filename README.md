# gas-utils

個人的 Google Apps Script 開發工具與實驗性程式碼片段備份

Personal Google Apps Script development tools and experimental code snippets backup.

## 📋 概述 (Overview)

這是一個用於備份和管理個人 Google Apps Script 開發工具的存儲庫。包含常用的工具函數、觸發器管理、以及實驗性的程式碼片段。

This repository contains a collection of personal Google Apps Script utilities, trigger handlers, and experimental code snippets for development and backup purposes.

## 🚀 快速開始 (Quick Start)

### 使用 clasp (推薦)

```bash
# 安裝 clasp
npm install -g @google/clasp

# 登入 Google 帳號
clasp login

# 複製此存儲庫
git clone https://github.com/HeimlichLin/gas-utils.git
cd gas-utils

# 建立新專案或連結現有專案
clasp create --title "My GAS Utils" --type standalone

# 推送程式碼到 Apps Script
clasp push

# 在瀏覽器中開啟
clasp open
```

### 手動設定

1. 前往 [Google Apps Script](https://script.google.com)
2. 建立新專案
3. 複製 `.gs` 檔案內容到專案中
4. 儲存並執行

詳細設定說明請參考 [SETUP.md](docs/SETUP.md)

## 📁 目錄結構 (Directory Structure)

```
gas-utils/
├── src/                          # 主要工具程式
│   ├── utils/                    # 工具函數
│   │   ├── CommonUtils.gs        # 常用工具函數
│   │   ├── DateUtils.gs          # 日期時間工具
│   │   └── StringUtils.gs        # 字串處理工具
│   └── triggers/                 # 觸發器處理
│       ├── TimeTriggers.gs       # 時間觸發器
│       └── SpreadsheetTriggers.gs # 試算表觸發器
├── experimental/                 # 實驗性功能
│   ├── AdvancedSheetOps.gs       # 進階試算表操作
│   ├── APIIntegration.gs         # API 整合工具
│   └── DataProcessing.gs         # 資料處理工具
└── docs/                         # 文件
    ├── API.md                    # API 文件
    └── SETUP.md                  # 設定指南
```

## 🛠️ 主要功能 (Features)

### 工具函數 (Utilities)

- **CommonUtils** - 常用功能（日誌記錄、電子郵件通知、試算表操作、備份）
- **DateUtils** - 日期時間處理（格式化、解析、日期範圍計算）
- **StringUtils** - 字串操作（格式轉換、驗證、隨機生成）

### 觸發器 (Triggers)

- **TimeTriggers** - 時間基礎觸發器（每日、每小時、每週、每月）
- **SpreadsheetTriggers** - 試算表事件觸發器（開啟、編輯、表單提交）

### 實驗性功能 (Experimental)

⚠️ 實驗性功能仍在開發中，使用時請謹慎

- **AdvancedSheetOps** - 進階試算表操作（條件格式、樞紐分析表、批次操作）
- **APIIntegration** - 外部 API 整合（HTTP 請求、分頁資料、Webhook）
- **DataProcessing** - 資料處理（CSV/JSON 轉換、過濾、分組、去重）

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

## 📖 文件 (Documentation)

- [API 文件](docs/API.md) - 完整的 API 說明和使用範例
- [設定指南](docs/SETUP.md) - 詳細的安裝和設定步驟

## 🔒 安全注意事項 (Security)

- 不要將敏感資訊（API 金鑰、試算表 ID）提交到版本控制
- 使用 Properties Service 儲存機密設定
- 定期檢查並更新權限設定

## 📝 授權 (License)

MIT License - 詳見 [LICENSE](LICENSE) 檔案

## 🤝 貢獻 (Contributing)

這是個人專案的備份存儲庫，但歡迎 Fork 並根據您的需求進行調整。

## 🔗 相關資源 (Resources)

- [Google Apps Script 官方文件](https://developers.google.com/apps-script)
- [Apps Script API 參考](https://developers.google.com/apps-script/reference)
- [clasp - 命令列工具](https://github.com/google/clasp)
- [Apps Script 最佳實踐](https://developers.google.com/apps-script/guides/support/best-practices)

## ⚡ 快速連結 (Quick Links)

- [開始使用](docs/SETUP.md)
- [API 文件](docs/API.md)
- [問題回報](https://github.com/HeimlichLin/gas-utils/issues)

---

**注意**: 實驗性功能可能包含未完成或不穩定的程式碼，請在生產環境中謹慎使用。

**Note**: Experimental features may contain incomplete or unstable code. Use with caution in production environments.
