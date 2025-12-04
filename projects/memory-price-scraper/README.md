# Memory Price Scraper

抓取 DRAMeXchange 記憶體報價並儲存至 Google Sheet 的 Google Apps Script 專案。

## 功能特色

- 📊 抓取 10 種有完整價格的報價表格
- 🔄 依 Last Update 時間判斷是否需新增記錄（避免重複）
- 📋 記錄需登入才能查看的項目清單
- ⏰ 每日 08:00、12:00、16:00 各執行一次

## 支援的報價類型

| 類型 | Sheet 名稱 | 說明 |
|------|-----------|------|
| DRAM Spot Price | DramSpot | DRAM 現貨價格 |
| Module Spot Price | ModuleSpot | 記憶體模組現貨價格 |
| Flash Spot Price | FlashSpot | Flash 現貨價格 |
| GDDR Spot Price | GddrSpot | GDDR 現貨價格 |
| Wafer Spot Price | WaferSpot | 晶圓現貨價格 |
| Memory Card Price | MemoryCard | 記憶卡價格 |
| DRAM Contract Price | DramContract | DRAM 合約價格 |
| NAND Flash Contract Price | NandContract | NAND Flash 合約價格 |
| SSD Street Price | SsdStreet | SSD 通路價格 |
| PC-Client OEM SSD Contract Price | SsdOemContract | OEM SSD 合約價格 |

### 需登入項目（LoginRequired Sheet）

以下類型因網站限制需會員登入才能查看完整價格：
- LPDDR Spot Price
- eMMC Spot Price
- Mobile DRAM Contract Price
- Server DRAM Contract Price
- NAND Flash Wafer Contract Price

## 設定步驟

### 1. 建立 Google Apps Script 專案

1. 前往 [Google Apps Script](https://script.google.com/)
2. 建立新專案
3. 記下專案的 Script ID（從 URL 或專案設定中取得）

### 2. 設定 clasp

```bash
cd projects/memory-price-scraper

# 建立 .clasp.json（替換為您的 Script ID）
echo '{"scriptId":"YOUR_SCRIPT_ID","rootDir":"."}' > .clasp.json

# 推送程式碼
clasp push
```

### 3. 綁定 Google Sheet

1. 在 Google Sheet 中開啟 Apps Script 編輯器（擴充功能 > Apps Script）
2. 或在 Apps Script 專案中設定關聯的試算表

### 4. 建立觸發器

在 Apps Script 編輯器中執行 `createTripleDailyTrigger()` 函數來建立每日三次自動執行的觸發器（08:00、12:00、16:00）。

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `Config.gs` | 設定檔（URL、報價類型、工作表名稱等） |
| `MemoryScraper.gs` | 主程式（抓取、解析、儲存、觸發器管理） |
| `appsscript.json` | GAS 專案設定 |

## 主要函式

| 函式 | 說明 |
|------|------|
| `runDailyJob()` | 每日排程主程式，抓取並處理所有報價 |
| `createTripleDailyTrigger()` | 建立每日三次觸發器 |
| `deleteTriggers()` | 刪除所有 runDailyJob 觸發器 |
| `cleanupOldData()` | 清理超過保留天數的舊資料 |
| `testRun()` | 手動測試執行 |
| `testNormalizeLastUpdate()` | 測試 Last Update 正規化函式 |

## Last Update 格式處理

程式會自動處理以下格式差異：

```
輸入格式範例：
- "Last Update: Dec.4 2025 11:00 (GMT+8)"
- "LastUpdate:Nov.24 2025 14:40 (GMT+8)"
- "LastUpdate:Jul.24 2025, 10:00 (GMT+8)"

輸出格式（正規化後）：
- "2025-12-04 11:00"
- "2025-11-24 14:40"
- "2025-07-24 10:00"
```

## 注意事項

- 目標網站 https://www.dramexchange.com/ 部分內容需要會員登入
- 程式僅抓取公開可見的報價資料
- 建議搭配 Log Sheet 監控執行狀態
- 請確認目標網站允許爬蟲抓取，並遵守其服務條款
