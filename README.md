# gas-utils

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8-blue)](https://developers.google.com/apps-script)

一組 **Google Apps Script (GAS)** 的共用工具與範例爬蟲專案，使用 **clasp** 進行本機開發與部署。這個 repo 主要用途是：整理可重用的 GAS utilities、觸發器工具，以及一些實驗性程式片段與可運作的專案樣板。

## Technology Stack

- **Language**: JavaScript（GAS / V8 runtime，支援 ES6+）
- **Runtime**: Google Apps Script（建議 `appsscript.json` 使用 `runtimeVersion: "V8"`，並可設定 `timeZone: "Asia/Taipei"`）
- **CLI / Tooling**:
  - `@google/clasp`（本機開發與部署）
  - `@types/google-apps-script`（型別定義，提升 IDE 提示）

相關設定與範例：
- [docs/SETUP.md](docs/SETUP.md)
- [docs/CONFIGURATION.md](docs/CONFIGURATION.md)

## Project Architecture

此 repo 以「專案（projects） + 共用模組（shared） + 實驗（experimental）」的方式組織：

- **projects/**：獨立 GAS 專案（每個專案都有自己的 `appsscript.json`，並以各自的 `.clasp.json` 連結到 Script ID）
- **shared/**：可複用的 utils 與 triggers（設計用來複製到各專案中使用）
- **experimental/**：實驗性功能與範例（建議先在測試環境驗證再導入正式腳本）

抓取型專案通常遵循這些模式：
- 以 `runDailyJob()` 作為排程入口點
- `UrlFetchApp.fetch()` 使用 `muteHttpExceptions: true` 並自行處理 301/302 與 Cookie
- 失敗重試採「指數退避」：`Math.pow(2, attempt) * 1000`
- 重要設定與敏感資訊使用 `PropertiesService.getScriptProperties()` 保存

## Getting Started

### Prerequisites

- Node.js + npm
- Google 帳號（可使用 Apps Script）
- `clasp`（可全域安裝或用 `npx`）

### 安裝（本機）

```bash
git clone https://github.com/HeimlichLin/gas-utils.git
cd gas-utils
npm install

# 登入 Google（只需一次）
npx clasp login
```

### 選擇使用方式

- **方式 A：使用 clasp（推薦）**：適合版本控管、本機開發、部署到 Apps Script。
- **方式 B：手動複製貼上**：適合快速試用。

更完整步驟請見：
- [docs/SETUP.md](docs/SETUP.md)

### 部署某個專案（以 etf-scraper 為例）

1. 進入專案資料夾
2. 建立 `.clasp.json`（本機檔案，不建議 commit）
3. 推送程式碼

```bash
cd projects/etf-scraper

# 建立 .clasp.json（替換成你的 Script ID）
echo '{"scriptId":"YOUR_SCRIPT_ID","rootDir":"."}' > .clasp.json

# 推送
npx clasp push

# 可選：開啟 Apps Script 網頁編輯器
npx clasp open
```

> 注意：`shared/` 的檔案設計為「複製到專案中使用」。若你的專案需要共用 utils/triggers，請將 [shared/utils](shared/utils) 與 [shared/triggers](shared/triggers) 內的 `.gs` 複製到該專案目錄後再 `clasp push`。

## Project Structure

```text
.
├── projects/                 # 獨立 GAS 專案（各自部署）
│   ├── memory-price-scraper/  # DRAMeXchange 報價爬蟲
│   └── etf-scraper/           # ETF 持倉追蹤 + LINE 通知
├── shared/                   # 共用工具（複製到專案中使用）
│   ├── utils/                # CommonUtils / DateUtils / StringUtils
│   └── triggers/             # TimeTriggers / SpreadsheetTriggers
├── experimental/             # 實驗性功能（謹慎使用）
└── docs/                     # 使用/設定文件
```

## Key Features

- **共用工具（shared/utils）**
  - Logging、Email、Sheet 讀寫、備份
  - Date/Time 工具（格式化、週期、差值、週末判斷）
  - 字串工具（title case、truncate、email 驗證、slugify…）
- **觸發器工具（shared/triggers）**
  - Time-based triggers：建立/列出/刪除
  - Spreadsheet triggers：`onOpen` / `onEdit` / `onFormSubmit` / `onChange`
- **專案範例（projects）**
  - [projects/memory-price-scraper](projects/memory-price-scraper)：抓取 DRAMeXchange 報價到 Google Sheet
  - [projects/etf-scraper](projects/etf-scraper)：抓取 ETF 持倉、比對前一交易日變動並推送 LINE 訊息
- **實驗性模組（experimental）**
  - 進階試算表操作、資料處理（CSV/JSON）、API 整合、分頁抓取與 rate limit

可直接查常用 API 與範例：
- [docs/API.md](docs/API.md)
- [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)

## Development Workflow

- **本機開發 → 部署**
  - 在專案目錄執行 `npx clasp push`（或使用 `clasp push`）
  - 查看日誌：`npx clasp logs`
- **排程入口**
  - 爬蟲型專案多以 `runDailyJob()` 作為排程入口點（搭配時間觸發器）
- **設定與敏感資訊**
  - 使用 `PropertiesService.getScriptProperties()` 儲存 `SPREADSHEET_ID`、API keys、通知 token 等
  - scope 請求維持最小化（依 `appsscript.json` 需要）

## Coding Standards

（彙整自 repo 內的開發指引與貢獻規範）

- **命名**：函數/變數使用 camelCase
- **Runtime**：以 V8 為主，使用 ES6+（`const/let`、template literals…）
- **效能**：盡量用批次讀寫（`getValues()` / `setValues()`），避免逐格操作
- **錯誤處理**：以 `try/catch` 包住外部 I/O（HTTP、Sheet、Drive），並記錄可追蹤的錯誤訊息
- **HTTP**：抓取網頁時使用 `muteHttpExceptions: true`，必要時自行處理 302 與 Cookie
- **安全**：避免把敏感資訊硬編碼進程式；改用 Script Properties

## Testing

此 repo 沒有建立獨立的自動化測試框架；主要採 **在 Apps Script 編輯器中手動執行測試函式**（例如 `testRun()`、`testSetup()` 等）來驗證行為。

如果你新增/修改功能，建議：
- 在 Apps Script Editor 直接執行相關函式
- 覆蓋常見錯誤路徑（HTTP 失敗、資料格式不符、權限不足等）

## Contributing

- 請先閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)
- 建議的貢獻流程：Fork → feature branch → PR
- 若你正在新增新的 scraper/工具：
  - 參考 [projects/memory-price-scraper](projects/memory-price-scraper) 與 [projects/etf-scraper](projects/etf-scraper)
  - 保持單一 PR 聚焦單一變更
  - 更新對應文件（例如 [docs/API.md](docs/API.md) 或專案 README）

## License

MIT License，詳見 [LICENSE](LICENSE)。
