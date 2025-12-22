# ETF Scraper

抓取 ETF 持倉資料並儲存至 Google Sheet，自動比對前一日變動並推送 LINE 通知。

## 功能

- 📊 從 ezmoney.com.tw 抓取 ETF（00981A）持倉資料
- 🔄 處理 HTTP 302 重定向和 Cookie
- 🔁 支援重試機制（最多 3 次）
- 💾 每日快照儲存到試算表
- 🔍 自動比對前一交易日持倉變動
- 📱 LINE Notify 即時推送變動通知（新增、剔除、加碼、減碼）

## 設定步驟

### 1. 建立 LINE Messaging API Channel

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 登入並建立 Provider（如果沒有的話）
3. 點選「Create a new channel」→ 選擇「Messaging API」
4. 填寫必要資訊：
   - Channel name: 例如「ETF 通知機器人」
   - Channel description: 簡短描述
   - Category & Subcategory: 選擇適當分類
5. 建立完成後，進入 Channel 設定頁面

### 2. 取得必要憑證

#### 取得 Channel Access Token
1. 在 Channel 設定頁面，點選「Messaging API」分頁
2. 往下捲動至「Channel access token」區塊
3. 點選「Issue」產生 token
4. 複製產生的 token（長期有效）

#### 取得 User ID
方法一：透過 LINE Official Account
1. 在 Channel 設定中，掃描 QR Code 加入官方帳號為好友
2. 使用以下測試程式取得 User ID：

```javascript
function getLineUserId() {
  var accessToken = 'YOUR_CHANNEL_ACCESS_TOKEN';
  var url = 'https://api.line.me/v2/bot/followers/ids';
  
  var options = {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  };
  
  var response = UrlFetchApp.fetch(url, options);
  Logger.log(response.getContentText());
}
```

方法二：使用 Webhook
1. 設定 Webhook URL 並啟用
2. 傳訊息給機器人，從 Webhook 事件中取得 User ID

### 3. 設定 Script Properties

在 Apps Script 編輯器中：
1. 點選左側「專案設定」（齒輪圖示）
2. 往下捲動至「指令碼屬性」
3. 新增以下屬性：
   - 屬性：`LINE_CHANNEL_ACCESS_TOKEN`
   - 值：貼上 Channel Access Token
   - 屬性：`LINE_USER_ID`
   - 值：貼上您的 User ID（或使用 `LINE_GROUP_ID` 發送到群組）

### 4. 設定 clasp

```bash
cd projects/etf-scraper

# 建立 .clasp.json（替換為您的 Script ID）
echo '{"scriptId":"YOUR_SCRIPT_ID","rootDir":"."}' > .clasp.json

# 推送程式碼
clasp push
```

### 5. 綁定 Google Sheet

在 Google Sheet 中開啟 Apps Script 編輯器，或在專案設定中關聯試算表。

### 6. 建立觸發器

在 Apps Script 編輯器中：
1. 點選左側「觸發條件」（時鐘圖示）
2. 點選「新增觸發條件」
3. 設定：
   - 選擇函數：`runDailyJob`
   - 選擇事件來源：「時間驅動」
   - 選取時間型觸發條件類型：「日計時器」
   - 選取時段：「上午 9 時至 10 時」

## LINE 通知訊息範例

```
📌 ETF代號: 00981A
📅 比對區間: 2025-12-16 ➡ 2025-12-17

🆕 新增成分股
   • 華通(2313): 1,714,000 股

❌ 剔除成分股
   • 中砂(1560): 1,000 股

📈 加碼
   • 緯創(3231): +1,000 股
   • 順達(3211): +15,000 股

📉 減碼
   • 聯亞(3081): -99,000 股
   • 京元電子(2449): -650,000 股
```

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `EtfScraper.gs` | 主程式（抓取、解析、儲存、比對、通知） |
| `LineHelper.gs` | LINE API 輔助工具（取得 User ID、測試發送） |
| `appsscript.json` | GAS 專案設定 |

## LINE 設定輔助工具

部署程式碼後，可使用以下輔助函數簡化設定：

### 1. 檢查設定狀態
```javascript
checkLineConfig()  // 顯示目前設定狀態
```

### 2. 取得 User ID
```javascript
getLineFollowerIds()  // 列出所有追蹤者的 User ID
```

### 3. 測試發送訊息
```javascript
testSendLineMessage()  // 發送測試訊息驗證設定
```

### 4. 互動式設定（推薦）
```javascript
setupLineConfig()  // 透過對話框設定所有參數
```

## 進階設定

### 調整資料保留天數

在 [EtfScraper.gs](EtfScraper.gs#L8) 中修改 `RETENTION_DAYS`：

```javascript
RETENTION_DAYS: 90,  // 保留 90 天的歷史資料
```

### 變更目標 ETF

修改 [EtfScraper.gs](EtfScraper.gs#L6-L9) 中的設定：

```javascript
TARGET_URL: 'https://www.ezmoney.com.tw/ETF/Fund/Info?FundCode=YOUR_CODE',
ETF_CODE: 'YOUR_ETF_CODE',
```
