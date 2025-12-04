/**
 * ETF Holdings Tracker - Google Apps Script 版本
 * 限制: GAS UrlFetchApp 無法執行 JavaScript，僅支援 SSR 內容
 */

const CONFIG = {
  SHEET_NAME: 'Holdings',
  LOG_SHEET_NAME: 'Logs',
  TARGET_URL: 'https://www.ezmoney.com.tw/ETF/Fund/Info?FundCode=49YTW',
  RETENTION_DAYS: 90,
  ETF_CODE: '00981A',
  MAX_RETRIES: 3
};

function runDailyJob() {
  log('開始執行每日排程');
  
  try {
    var result = fetchHoldingsData();
    
    if (result && result.holdings && result.holdings.length > 0) {
      saveDailySnapshot(result.holdings, result.date);
      log('成功儲存 ' + result.holdings.length + ' 筆持倉資料 (日期: ' + (result.date || 'Today') + ')');
    } else {
      log('錯誤: 未抓取到任何持倉資料', 'ERROR');
    }
  } catch (e) {
    log('執行失敗: ' + e.toString(), 'ERROR');
  }
  
  log('排程執行結束');
}

/** 從 ezmoney.com.tw 抓取持倉資料 */
function fetchHoldingsData() {
  log('正在抓取 URL: ' + CONFIG.TARGET_URL);
  
  var html = fetchHtml(CONFIG.TARGET_URL);
  
  if (!html || html.length < 1000) {
    throw new Error('抓取的 HTML 內容過短 (' + (html ? html.length : 0) + ' bytes)');
  }
  
  log('成功抓取 HTML，長度: ' + html.length + ' bytes');
  return parseHoldings(html);
}

/** 抓取 HTML (處理 302 重定向與 Cookie) */
function fetchHtml(url) {
  var lastError = null;
  
  for (var attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      log('嘗試第 ' + attempt + ' 次請求...');
      
      var options = {
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1'
        }
      };
      
      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();
      
      log('HTTP 回應碼: ' + code);
      
      if (code === 301 || code === 302) {
        var headers = response.getAllHeaders();
        var cookies = extractCookies(headers);
        
        log('收到重定向，Cookies: ' + cookies);
        
        var location = headers['Location'] || url;
        log('重定向到: ' + location);
        
        options.headers['Cookie'] = cookies;
        options.followRedirects = true;
        
        response = UrlFetchApp.fetch(location, options);
        code = response.getResponseCode();
        
        log('第二次請求 HTTP 回應碼: ' + code);
      }
      
      if (code === 200) {
        var content = response.getContentText();
        log('成功取得內容，長度: ' + content.length + ' bytes');
        return content;
      }
      
      lastError = new Error('HTTP ' + code);
      log('請求失敗: HTTP ' + code, 'WARN');
      
    } catch (e) {
      lastError = e;
      log('請求異常: ' + e.message, 'WARN');
    }
    
    if (attempt < CONFIG.MAX_RETRIES) {
      var delay = Math.pow(2, attempt) * 1000;
      log('等待 ' + delay + 'ms 後重試...');
      Utilities.sleep(delay);
    }
  }
  
  throw new Error('抓取失敗，已重試 ' + CONFIG.MAX_RETRIES + ' 次: ' + (lastError ? lastError.message : 'Unknown error'));
}

/** 從 response headers 提取 Cookie 字串 */
function extractCookies(headers) {
  var setCookie = headers['Set-Cookie'];
  if (!setCookie) return '';
  
  var cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  var cookieParts = [];
  
  cookies.forEach(function(cookie) {
    var match = cookie.match(/^([^;]+)/);
    if (match) {
      cookieParts.push(match[1].trim());
    }
  });
  
  return cookieParts.join('; ');
}

/** 解析 HTML 取得持倉快照 */
function parseHoldings(html) {
  var result = extractHoldingsFromJson(html);
  var holdings = result.holdings;
  var dateStr = result.date;
  
  if (holdings.length === 0) {
    log('JSON 提取失敗，嘗試從表格提取...');
    holdings = extractHoldingsFromTable(html);
  }
  
  if (!dateStr) {
    dateStr = extractDate(html);
  }
  
  log('解析完成: 日期=' + (dateStr || '今日') + ', 成分股數量=' + holdings.length);
  
  return {
    date: dateStr,
    holdings: holdings
  };
}

/** 從 HTML 中的 JavaScript 變數提取持倉資料和日期 */
function extractHoldingsFromJson(html) {
  var holdings = [];
  var dateStr = null;
  var jsonStr = null;
  
  // 策略 1: var assetDB = [...];
  var varPattern = /var\s+assetDB\s*=\s*(\[[\s\S]*?\]);/;
  var match = html.match(varPattern);
  
  if (match && match[1]) {
    jsonStr = match[1];
    log('從 var assetDB 提取到 JSON');
  }
  
  if (!jsonStr) {
    var dataAssetPattern = /id="DataAsset"\s+data-content="([^"]*)"/;
    match = html.match(dataAssetPattern);
    
    if (match && match[1]) {
      jsonStr = match[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      log('從 DataAsset data-content 提取到 JSON');
    }
  }
  
  if (!jsonStr) {
    log('未找到 JSON 資料來源', 'WARN');
    return { holdings: holdings, date: null };
  }
  
  try {
    var assetDB = JSON.parse(jsonStr);
    
    if (Array.isArray(assetDB)) {
      assetDB.forEach(function(asset) {
        if (asset.AssetCode === 'ST' && asset.Details && Array.isArray(asset.Details)) {
          if (!dateStr && asset.EditDate) {
            dateStr = formatDateString(asset.EditDate);
            log('從 assetDB.EditDate 提取日期: ' + dateStr);
          }
          
          asset.Details.forEach(function(item) {
            if (!dateStr && item.TranDate) {
              dateStr = formatDateString(item.TranDate);
              log('從 assetDB.Details.TranDate 提取日期: ' + dateStr);
            }
            
            holdings.push({
              stockCode: item.DetailCode || '',
              stockName: item.DetailName || '',
              shares: parseInt(item.Share || 0, 10),
              weight: parseFloat(item.NavRate || 0)
            });
          });
        }
      });
    }
    
    if (holdings.length > 0) {
      log('成功從 JSON 提取 ' + holdings.length + ' 筆持倉資料');
    }
    
  } catch (e) {
    log('JSON 解析失敗: ' + e.message, 'WARN');
  }
  
  return { holdings: holdings, date: dateStr };
}

/** 從 HTML 表格提取持倉資料 (備用方案) */
function extractHoldingsFromTable(html) {
  var holdings = [];
  
  var rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  var rowMatch;
  
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    var rowContent = rowMatch[1];
    var cells = [];
    
    var cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    var cellMatch;
    while ((cellMatch = cellPattern.exec(rowContent)) !== null) {
      var cellText = cellMatch[1].replace(/<[^>]+>/g, '').trim();
      cells.push(cellText);
    }
    
    if (cells.length >= 4) {
      var offset = cells.length >= 5 ? 1 : 0;
      
      var stockCode = cells[offset];
      var stockName = cells[offset + 1];
      var sharesText = cells[offset + 2];
      var weightText = cells[offset + 3];
      
      if (!stockCode || stockCode === '股票代號' || stockCode === '代號') {
        continue;
      }
      
      if (!/^\d{4,6}$/.test(stockCode)) {
        continue;
      }
      
      holdings.push({
        stockCode: stockCode,
        stockName: stockName,
        shares: parseShares(sharesText),
        weight: parseWeight(weightText)
      });
    }
  }
  
  if (holdings.length > 0) {
    log('從表格提取 ' + holdings.length + ' 筆持倉資料');
  }
  
  return holdings;
}

/** 從 HTML 提取資料日期 */
function extractDate(html) {
  var patterns = [
    /資料日期[^0-9]{0,50}(\d{4}[-\/]\d{2}[-\/]\d{2})/,
    /基金投資組合[\s\S]{0,200}?(\d{4}[-\/]\d{2}[-\/]\d{2})/,
    /update-date[^>]*>[\s\S]{0,100}?(\d{4}[-\/]\d{2}[-\/]\d{2})/
  ];
  
  for (var i = 0; i < patterns.length; i++) {
    var match = html.match(patterns[i]);
    if (match && match[1]) {
      return match[1].replace(/\//g, '-');
    }
  }
  
  log('無法從頁面提取日期，使用今日日期', 'WARN');
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function parseShares(text) {
  if (!text) return 0;
  var cleaned = text.replace(/[,\s]/g, '');
  var num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function parseWeight(text) {
  if (!text) return 0;
  var cleaned = text.replace(/[%\s]/g, '');
  var num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** 統一日期格式為 yyyy-MM-dd */
function formatDateString(dateStr) {
  if (!dateStr) return null;
  var datePart = String(dateStr).substring(0, 10);
  return datePart.replace(/\//g, '-');
}

function saveDailySnapshot(holdings, dateStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(['日期', '股票', '股票名稱', '股數', '權重(%)']);
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.getRange('B:B').setNumberFormat('@');
    sheet.getRange('C:C').setNumberFormat('@');
    sheet.getRange('D:D').setNumberFormat('#,##0');
    sheet.getRange('E:E').setNumberFormat('0.00');
  }
  
  var formattedDate = dateStr || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  formattedDate = formattedDate.replace(/\//g, '-');
  
  deleteRowsByDate(sheet, formattedDate);
  
  if (holdings.length > 0) {
    var rows = holdings.map(function(h) {
      return [formattedDate, h.stockCode, h.stockName, h.shares, h.weight];
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
    log('已寫入 ' + rows.length + ' 筆資料 (日期: ' + formattedDate + ')');
  } else {
    sheet.appendRow([formattedDate, '', '', 0, 0]);
    log('無持倉資料，已寫入佔位符 (日期: ' + formattedDate + ')', 'WARN');
  }
}

/** 刪除指定日期的所有資料列 */
function deleteRowsByDate(sheet, targetDate) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  var normalizedTarget = targetDate.replace(/\//g, '-');
  var dateColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var deletedCount = 0;
  
  for (var i = dateColumn.length - 1; i >= 0; i--) {
    var cellDate = dateColumn[i][0];
    if (!cellDate) continue;
    
    var dateStr = (cellDate instanceof Date)
      ? Utilities.formatDate(cellDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(cellDate).replace(/\//g, '-');
    
    if (dateStr === normalizedTarget) {
      sheet.deleteRow(i + 2);
      deletedCount++;;
    }
  }
  
  if (deletedCount > 0) {
    log('已刪除 ' + deletedCount + ' 筆舊資料 (日期: ' + normalizedTarget + ')');
  }
}

function cleanupOldData() {
  var retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - CONFIG.RETENTION_DAYS);
  var dateStr = Utilities.formatDate(retentionDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  log('資料保留檢查: 清理 ' + dateStr + ' 之前的資料');
}

function log(message, level) {
  level = level || 'INFO';
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  var logMsg = '[' + level + '] ' + message;
  
  Logger.log(logMsg);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Level', 'Message']);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([timestamp, level, message]);
  } catch (e) {
    Logger.log('寫入 Log Sheet 失敗: ' + e.message);
  }
}
