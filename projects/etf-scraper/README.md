# ETF Scraper

抓取 ETF 持倉資料並儲存至 Google Sheet 的 Google Apps Script 專案。

## 功能

- 從 ezmoney.com.tw 抓取 ETF（00981A）持倉資料
- 處理 HTTP 302 重定向和 Cookie
- 支援重試機制（最多 3 次）
- 每日快照儲存到試算表

## 設定步驟

### 1. 設定 clasp

```bash
cd projects/etf-scraper

# 建立 .clasp.json（替換為您的 Script ID）
echo '{"scriptId":"YOUR_SCRIPT_ID","rootDir":"."}' > .clasp.json

# 推送程式碼
clasp push
```

### 2. 綁定 Google Sheet

在 Google Sheet 中開啟 Apps Script 編輯器，或在專案設定中關聯試算表。

### 3. 建立觸發器

在 Apps Script 編輯器中設定每日觸發器執行 `runDailyJob()`。

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `EtfScraper.gs` | 主程式（抓取、解析、儲存） |
| `appsscript.json` | GAS 專案設定 |
