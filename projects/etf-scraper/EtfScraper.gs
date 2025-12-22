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
  MAX_RETRIES: 3,
  // LINE Messaging API 設定 (請至 https://developers.line.biz/console/ 建立 Channel)
  // 支援三種發送模式任意組合: GROUP (群組) + USER (個人) + BROADCAST (廣播)
  // 可同時啟用多種模式，例如: 同時發送給群組和廣播給所有好友
  LINE_CHANNEL_ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '',
  LINE_GROUP_ID: PropertiesService.getScriptProperties().getProperty('LINE_GROUP_ID') || '',  // 群組推送（選填）
  LINE_USER_ID: PropertiesService.getScriptProperties().getProperty('LINE_USER_ID') || '',    // 個人推送（選填）
  USE_BROADCAST_MODE: PropertiesService.getScriptProperties().getProperty('USE_BROADCAST_MODE') === 'true' || false  // 廣播給所有好友（選填）
};

function runDailyJob() {
  log('開始執行每日排程');
  
  try {
    var result = fetchHoldingsData();
    
    if (result && result.holdings && result.holdings.length > 0) {
      var currentDate = result.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      
      // 檢查該日期是否已存在（用於判斷是否為重複資料）
      var isExistingDate = isDateExists(currentDate);
      
      // 儲存今日資料（即使日期已存在也要更新，避免前次資料有異常）
      saveDailySnapshot(result.holdings, currentDate);
      log('成功儲存 ' + result.holdings.length + ' 筆持倉資料 (日期: ' + currentDate + ')');
      
      // 如果是重複的日期，跳過比較與推播
      if (isExistingDate) {
        log('資料日期 ' + currentDate + ' 為重複資料，跳過比較與推播', 'INFO');
        log('排程執行結束（重複日期，僅更新資料）');
        return;
      }
      
      // 比對前一次的資料並發送 LINE 通知
      var previousDate = getLatestDateBeforeDate(currentDate);
      
      if (previousDate) {
        var previousData = getHoldingsByDate(previousDate);
        
        if (previousData.length > 0) {
          log('正在比對 ' + previousDate + ' 與 ' + currentDate + ' 的資料差異');
          var changes = compareHoldings(previousData, result.holdings);
          
          if (hasSignificantChanges(changes)) {
            var message = formatChangeMessage(CONFIG.ETF_CODE, previousDate, currentDate, changes);
            sendLineMessage(message);
            log('已發送變動通知到 LINE');
          } else {
            log('無顯著變動，不發送通知');
          }
        } else {
          log('找到前一次日期 (' + previousDate + ') 但無資料，跳過比對', 'WARN');
        }
      } else {
        log('這是第一筆資料或無歷史資料，跳過比對', 'INFO');
      }
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

/** 檢查指定日期的資料是否已存在於 Sheet（用於判斷是否為重複資料）*/
function isDateExists(dateStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) return false;
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;
  
  var normalizedTarget = dateStr.replace(/\//g, '-');
  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  
  for (var i = 0; i < data.length; i++) {
    var cellDate = data[i][0];
    if (!cellDate) continue;
    
    var rowDateStr = (cellDate instanceof Date)
      ? Utilities.formatDate(cellDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(cellDate).replace(/\//g, '-');
    
    if (rowDateStr === normalizedTarget) {
      return true;
    }
  }
  
  return false;
}

/** 從 Sheet 取得指定日期之前最近的一筆資料日期 */
function getLatestDateBeforeDate(dateStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) return '';
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return '';
  
  var normalizedTarget = dateStr.replace(/\//g, '-');
  var targetTime = new Date(normalizedTarget).getTime();
  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  
  var dates = [];
  data.forEach(function(row) {
    var cellDate = row[0];
    if (!cellDate) return;
    
    var rowDateStr = (cellDate instanceof Date)
      ? Utilities.formatDate(cellDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(cellDate).replace(/\//g, '-');
    
    var rowTime = new Date(rowDateStr).getTime();
    if (rowTime < targetTime) {
      dates.push(rowDateStr);
    }
  });
  
  if (dates.length === 0) {
    log('未找到 ' + dateStr + ' 之前的歷史資料', 'INFO');
    return '';
  }
  
  // 去重並排序
  dates = dates.filter(function(value, index, self) {
    return self.indexOf(value) === index;
  }).sort().reverse();
  
  var latestDate = dates[0];
  log('找到前一次資料日期: ' + latestDate);
  return latestDate;
}

/** 從 Sheet 讀取指定日期的持倉資料 */
function getHoldingsByDate(dateStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  var normalizedTarget = dateStr.replace(/\//g, '-');
  var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  var holdings = [];
  
  data.forEach(function(row) {
    var cellDate = row[0];
    var rowDateStr = (cellDate instanceof Date)
      ? Utilities.formatDate(cellDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(cellDate).replace(/\//g, '-');
    
    if (rowDateStr === normalizedTarget && row[1]) {
      holdings.push({
        stockCode: row[1],
        stockName: row[2],
        shares: parseInt(row[3]) || 0,
        weight: parseFloat(row[4]) || 0
      });
    }
  });
  
  return holdings;
}

/** 比對兩天的持倉資料，找出新增、剔除、加碼、減碼 */
function compareHoldings(previousHoldings, currentHoldings) {
  var prevMap = {};
  var currMap = {};
  
  previousHoldings.forEach(function(h) {
    prevMap[h.stockCode] = h;
  });
  
  currentHoldings.forEach(function(h) {
    currMap[h.stockCode] = h;
  });
  
  var added = [];     // 新增成分股
  var removed = [];   // 剔除成分股
  var increased = []; // 加碼
  var decreased = []; // 減碼
  
  // 找新增和加碼/減碼
  currentHoldings.forEach(function(curr) {
    var code = curr.stockCode;
    if (!prevMap[code]) {
      // 新增成分股
      added.push(curr);
    } else {
      var diff = curr.shares - prevMap[code].shares;
      if (diff > 0) {
        increased.push({
          stockCode: code,
          stockName: curr.stockName,
          diff: diff,
          from: prevMap[code].shares,
          to: curr.shares
        });
      } else if (diff < 0) {
        decreased.push({
          stockCode: code,
          stockName: curr.stockName,
          diff: Math.abs(diff),
          from: prevMap[code].shares,
          to: curr.shares
        });
      }
    }
  });
  
  // 找剔除
  previousHoldings.forEach(function(prev) {
    if (!currMap[prev.stockCode]) {
      removed.push(prev);
    }
  });
  
  return {
    added: added,
    removed: removed,
    increased: increased,
    decreased: decreased
  };
}

/** 判斷是否有顯著變動 */
function hasSignificantChanges(changes) {
  return changes.added.length > 0 ||
         changes.removed.length > 0 ||
         changes.increased.length > 0 ||
         changes.decreased.length > 0;
}

/** 格式化變動訊息（LINE Notify 格式）*/
function formatChangeMessage(etfCode, prevDate, currDate, changes) {
  var lines = [];
  
  lines.push('📌 ETF代號: ' + etfCode);
  lines.push('');
  lines.push('📅 比對區間: ' + prevDate + ' ➡ ' + currDate);
  lines.push('');
  
  if (changes.added.length > 0) {
    lines.push('🆕 新增成分股');
    changes.added.forEach(function(item) {
      lines.push('   • ' + item.stockName + '(' + item.stockCode + '): ' + formatNumber(item.shares) + ' 股');
    });
    lines.push('');
  }
  
  if (changes.removed.length > 0) {
    lines.push('❌ 剔除成分股');
    changes.removed.forEach(function(item) {
      lines.push('   • ' + item.stockName + '(' + item.stockCode + '): ' + formatNumber(item.shares) + ' 股');
    });
    lines.push('');
  }
  
  if (changes.increased.length > 0) {
    lines.push('📈 加碼');
    changes.increased.forEach(function(item) {
      lines.push('   • ' + item.stockName + '(' + item.stockCode + '): +' + formatNumber(item.diff) + ' 股');
    });
    lines.push('');
  }
  
  if (changes.decreased.length > 0) {
    lines.push('📉 減碼');
    changes.decreased.forEach(function(item) {
      lines.push('   • ' + item.stockName + '(' + item.stockCode + '): -' + formatNumber(item.diff) + ' 股');
    });
    lines.push('');
  }
  
  return lines.join('\n').trim();
}

/** 數字格式化（千分位） */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 發送 LINE Messaging API 訊息 (支援 GROUP + USER + BROADCAST 任意組合) */
function sendLineMessage(message) {
  var accessToken = CONFIG.LINE_CHANNEL_ACCESS_TOKEN;
  var groupId = CONFIG.LINE_GROUP_ID;
  var userId = CONFIG.LINE_USER_ID;
  var useBroadcast = CONFIG.USE_BROADCAST_MODE;
  
  if (!accessToken) {
    log('LINE Channel Access Token 未設定，無法發送通知', 'WARN');
    return;
  }
  
  // 檢查是否至少啟用一種發送模式
  if (!groupId && !userId && !useBroadcast) {
    log('未設定任何發送目標，無法發送通知', 'WARN');
    log('請至少設定以下其中一項: LINE_GROUP_ID、LINE_USER_ID 或 USE_BROADCAST_MODE=true', 'WARN');
    return;
  }
  
  var url = 'https://api.line.me/v2/bot/message/push';
  var successCount = 0;
  var failCount = 0;
  var enabledModes = [];
  
  // 收集啟用的模式
  if (groupId) enabledModes.push('GROUP');
  if (userId) enabledModes.push('USER');
  if (useBroadcast) enabledModes.push('BROADCAST');
  
  log('啟用的發送模式: ' + enabledModes.join(' + '));
  
  // 模式 1: 發送到群組
  if (groupId) {
    log('[GROUP] 準備發送訊息到 LINE 群組 (' + groupId.substring(0, 8) + '...)');
    if (sendToRecipient(url, accessToken, groupId, message)) {
      successCount++;
      log('[GROUP] ✓ 群組訊息發送成功');
    } else {
      failCount++;
    }
  }
  
  // 模式 2: 發送到個人
  if (userId) {
    log('[USER] 準備發送訊息到 LINE 個人 (' + userId.substring(0, 8) + '...)');
    if (sendToRecipient(url, accessToken, userId, message)) {
      successCount++;
      log('[USER] ✓ 個人訊息發送成功');
    } else {
      failCount++;
    }
  }
  
  // 模式 3: 廣播給所有好友
  if (useBroadcast) {
    log('[BROADCAST] 準備使用 Broadcast API 廣播訊息給所有好友');
    if (sendBroadcastMessage(message)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  log('LINE 訊息發送完成: 成功 ' + successCount + ' / ' + enabledModes.length + ' 個目標，失敗 ' + failCount + ' 個');
}

/** 發送訊息到指定接收者 */
function sendToRecipient(url, accessToken, recipientId, message) {
  var payload = {
    to: recipientId,
    messages: [
      {
        type: 'text',
        text: message
      }
    ]
  };
  
  var options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    
    if (code === 200) {
      return true;
    } else {
      log('發送失敗: HTTP ' + code + ', ' + response.getContentText(), 'ERROR');
      return false;
    }
  } catch (e) {
    log('發送異常: ' + e.toString(), 'ERROR');
    return false;
  }
}

/** 使用 Broadcast API 廣播訊息給所有加入好友的用戶 */
function sendBroadcastMessage(message) {
  var accessToken = CONFIG.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!accessToken) {
    log('LINE Channel Access Token 未設定，無法發送廣播訊息', 'WARN');
    return false;
  }
  
  log('準備使用 Broadcast API 廣播訊息給所有好友');
  
  var url = 'https://api.line.me/v2/bot/message/broadcast';
  var payload = {
    messages: [
      {
        type: 'text',
        text: message
      }
    ]
  };
  
  var options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    
    if (code === 200) {
      log('✓ Broadcast 訊息發送成功');
      return true;
    } else {
      log('Broadcast 發送失敗: HTTP ' + code + ', ' + response.getContentText(), 'ERROR');
      return false;
    }
  } catch (e) {
    log('Broadcast 發送異常: ' + e.toString(), 'ERROR');
    return false;
  }
}
