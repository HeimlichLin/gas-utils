/**
 * Memory Price Scraper
 * 抓取 DRAMeXchange 記憶體報價並儲存至 Google Sheet
 */

// ============================================================
// 主程式
// ============================================================

/**
 * 每日排程主程式 (動態發現版本)
 */
function runDailyJob() {
  log('開始執行記憶體報價抓取');
  
  try {
    var html = fetchHtml(CONFIG.TARGET_URL);
    
    if (!html || html.length < 5000) {
      throw new Error('抓取的 HTML 內容過短 (' + (html ? html.length : 0) + ' bytes)');
    }
    
    log('抓取 HTML: ' + html.length + ' bytes');
    
    // 動態發現所有報價類型
    var discoveredTypes = discoverPriceTypes(html);
    log('發現 ' + discoveredTypes.length + ' 種報價類型');
    
    // 記錄發現的類型
    updateDiscoveredTypesSheet(discoveredTypes);
    
    // 處理各類報價
    var results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      loginRequired: 0
    };
    
    discoveredTypes.forEach(function(typeInfo) {
      if (typeInfo.isLoginRequired) {
        results.loginRequired++;
      } else {
        processDynamicPrice(typeInfo, html, results);
      }
    });
    
    log('處理完成: 新增=' + results.processed + ', 跳過=' + results.skipped + 
        ', 錯誤=' + results.errors + ', 需登入=' + results.loginRequired);
    
  } catch (e) {
    log('執行失敗: ' + e.toString(), 'ERROR');
  }
  
  log('排程執行結束');
}

// ============================================================
// 動態發現報價類型
// ============================================================

/**
 * 從 HTML 動態發現所有報價類型
 * 
 * 網站結構分析 (透過 MCP 瀏覽器工具確認):
 * - 價格區塊位於 div.left_tab 容器內
 * - 標題在 td.title_left / td.title_left2 / td.title_left3 內，包含 <a> 連結
 * - 有價格數據的區塊包含數字格式 (如 1.234)
 * - 需登入的區塊只有連結列表，沒有價格數據
 * 
 * @param {string} html - HTML 內容
 * @return {Array} 報價類型陣列
 */
function discoverPriceTypes(html) {
  var types = [];
  
  // ========================================
  // 動態識別 - 解析 div.left_tab 區塊
  // ========================================
  
  // 方法 1: 找出所有 div.left_tab 區塊
  // 使用更寬鬆的匹配，允許巢狀 div
  var leftTabPattern = /<div[^>]*class="[^"]*left_tab[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*left_tab[^"]*"|<\/body|$)/gi;
  var blockMatch;
  var blockIndex = 0;
  
  while ((blockMatch = leftTabPattern.exec(html)) !== null) {
    var blockHtml = blockMatch[1];
    
    // 在此區塊中找所有標題 (td.title_left, td.title_left2, td.title_left3)
    // 先收集所有標題及其位置
    var titlePattern = /<td[^>]*class="(title_left[23]?)"[^>]*>([\s\S]*?)<\/td>/gi;
    var titles = [];
    var titleMatch;
    
    while ((titleMatch = titlePattern.exec(blockHtml)) !== null) {
      var titleClass = titleMatch[1];
      var tdContent = titleMatch[2];
      var matchEnd = titlePattern.lastIndex;
      var matchStart = titleMatch.index;
      
      // 從 td 內容中提取 href 和標題
      var linkMatch = tdContent.match(/<a[^>]*href="([^"]*\/Price\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;
      
      var href = linkMatch[1];
      var rawTitle = linkMatch[2]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // 必須包含 Price 關鍵字
      if (!/Price/i.test(rawTitle)) continue;
      
      titles.push({
        titleClass: titleClass,
        href: href,
        rawTitle: rawTitle,
        position: matchEnd,
        startIndex: matchStart
      });
    }
    
    // 處理每個標題
    for (var i = 0; i < titles.length; i++) {
      var titleInfo = titles[i];
      var rawTitle = titleInfo.rawTitle;
      var href = titleInfo.href;
      var titleClass = titleInfo.titleClass;
      
      // 計算該標題的區段範圍（從當前位置到下一個標題位置）
      var sectionStart = titleInfo.position;
      // 使用下一個標題的起始位置作為結束，避免包含下一個標題
      var sectionEnd = (i + 1 < titles.length) ? titles[i + 1].startIndex : blockHtml.length;
      var sectionHtml = blockHtml.substring(sectionStart, sectionEnd);
      
      // 使用 CONFIG.FILTER_RULES 進行過濾
      var filterRules = CONFIG.FILTER_RULES;
      
      // 檢查排除模式
      var shouldExclude = filterRules.excludePatterns.some(function(pattern) {
        return pattern.test(rawTitle);
      });
      if (shouldExclude) continue;
      
      // 跳過太短的標題
      if (rawTitle.length < filterRules.minTitleLength) continue;
      
      // 清理標題
      var cleanTitle = rawTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
      
      // 從 href 提取 URL key
      var urlKeyMatch = href.match(/\/Price\/([^\/\?]+)/i);
      var urlKey = urlKeyMatch ? urlKeyMatch[1] : '';
      
      // 從該區段中提取 tbody id
      var tbodyIdMatch = sectionHtml.match(/<tbody[^>]*id="([^"]+)"/i);
      var tbodyId = tbodyIdMatch ? tbodyIdMatch[1] : null;
      
      // 如果區段內沒有 tbody id，嘗試從整個區塊找（但只在這是第一個標題時）
      if (!tbodyId && i === 0) {
        var blockTbodyMatch = blockHtml.match(/<tbody[^>]*id="([^"]+)"/i);
        tbodyId = blockTbodyMatch ? blockTbodyMatch[1] : null;
      }
      
      // 檢查該區段是否有價格數字
      var hasPriceNumbers = CONFIG.HTML_PATTERNS.priceNumberPattern.test(sectionHtml);
      var altPriceCheck = />\s*\d+\.\d+\s*</.test(sectionHtml);
      
      // **修正**: 始終檢查整個區塊是否有價格
      // 因為某些報價的價格表格可能在區段計算範圍之外
      var blockPriceCheck = />\s*\d+\.\d+\s*</.test(blockHtml);
      
      // 對於單標題區塊，區塊價格即為該標題的價格
      // 對於多標題區塊，需要更精確判斷（但如果區段本身有價格就用區段）
      var useBlockPrice = false;
      if (titles.length === 1) {
        // 單標題區塊：區塊有價格就算有資料
        useBlockPrice = blockPriceCheck;
      } else {
        // 多標題區塊：只有區段沒價格且區塊有價格時才進一步檢查
        // 檢查從這個標題到區塊末尾是否有價格（更寬鬆的區段）
        if (!altPriceCheck && blockPriceCheck) {
          var extendedSection = blockHtml.substring(titleInfo.position);
          useBlockPrice = />\s*\d+\.\d+\s*</.test(extendedSection);
        }
      }
      
      var priceMatch = sectionHtml.match(/>\s*(\d+\.\d+)\s*</);
      if (!priceMatch && useBlockPrice) {
        priceMatch = blockHtml.match(/>\s*(\d+\.\d+)\s*</);
      }
      
      // 決定是否需要登入 (使用 OR 邏輯，任一檢測到價格即算有資料)
      var isLoginRequired = !hasPriceNumbers && !altPriceCheck && !useBlockPrice;
      
      // 檢查是否有動態資料來源配置
      var dynamicSource = CONFIG.DYNAMIC_DATA_SOURCES[urlKey];
      if (dynamicSource) {
        isLoginRequired = false;
      }
      
      // 決定表格類型
      var tableType = determineTableTypeFromTitle(cleanTitle, titleClass);
      
      // 智慧解析 sheet 名稱
      var sheetName = resolveSheetName(cleanTitle, urlKey);
      
      // 提取 Last Update（從區段或區塊）
      var lastUpdate = extractLastUpdateFromBlock(sectionHtml, cleanTitle) ||
                       extractLastUpdateFromBlock(blockHtml, cleanTitle);
      
      var effectiveBlockHtml = (!altPriceCheck && useBlockPrice) ? blockHtml : sectionHtml;
      
      types.push({
        title: cleanTitle,
        rawTitle: rawTitle,
        sheetName: sheetName,
        tableType: tableType,
        urlKey: urlKey,
        href: href,
        titleClass: titleClass,
        tbodyId: tbodyId,
        lastUpdate: lastUpdate,
        isLoginRequired: isLoginRequired,
        hasDataTable: hasPriceNumbers || altPriceCheck || useBlockPrice,
        blockIndex: blockIndex,
        blockHtml: effectiveBlockHtml  // 使用有效的區塊 HTML
      });
      
      var status = isLoginRequired ? '(需登入)' : '(有資料)';
      log('發現: ' + cleanTitle + ' ' + status);
    }
    
    blockIndex++;
  }
  
  // ========================================
  // 備用方案：如果上面的方法找不到，嘗試更寬鬆的匹配
  // ========================================
  if (types.length === 0) {
    types = discoverPriceTypesFallback(html);
  }
  
  // 去重複 (根據 urlKey 或 title)
  var seen = {};
  types = types.filter(function(type) {
    var key = type.urlKey || type.title;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
  
  return types;
}

/**
 * 備用的報價類型發現方法
 * @param {string} html - HTML 內容
 * @return {Array} 報價類型陣列
 */
function discoverPriceTypesFallback(html) {
  var types = [];
  
  // 直接找所有包含 /Price/ 的連結
  var linkPattern = /<a[^>]*href="([^"]*\/Price\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  var match;
  var seen = {};
  
  while ((match = linkPattern.exec(html)) !== null) {
    var href = match[1];
    var title = match[2].trim()
      .replace(/&nbsp;/gi, ' ')   // 移除 HTML non-breaking space
      .replace(/\s+/g, ' ')       // 合併多餘空白
      .trim();                     // 再次 trim
    
    // 使用 CONFIG.FILTER_RULES 進行過濾
    var filterRules = CONFIG.FILTER_RULES;
    
    // 必須包含必要關鍵字
    if (!filterRules.requiredKeyword.test(title)) continue;
    
    // 跳過太短的標題
    if (title.length < filterRules.minTitleLength) continue;
    
    // 檢查排除模式
    var shouldExclude = filterRules.excludePatterns.some(function(pattern) {
      return pattern.test(title);
    });
    if (shouldExclude) continue;
    
    var urlKeyMatch = href.match(/\/Price\/([^\/\?]+)/i);
    var urlKey = urlKeyMatch ? urlKeyMatch[1] : '';
    
    if (seen[urlKey]) continue;
    seen[urlKey] = true;
    
    var cleanTitle = title.replace(/\s*\([^)]*\)\s*$/, '').trim();
    
    types.push({
      title: cleanTitle,
      rawTitle: title,
      sheetName: resolveSheetName(cleanTitle, urlKey),
      tableType: determineTableTypeFromTitle(cleanTitle, ''),
      urlKey: urlKey,
      href: href,
      isLoginRequired: false,
      hasDataTable: true
    });
  }
  
  return types;
}

/**
 * 根據標題判斷表格類型 (簡化版，主要用於記錄)
 * 注意：實際解析已改為完全動態，此函數僅用於分類標記
 * @param {string} title - 報價標題
 * @param {string} titleClass - CSS 類別 (可選)
 * @return {string} 表格類型標記
 */
function determineTableTypeFromTitle(title, titleClass) {
  // 簡單分類，僅用於記錄和顯示，不影響解析邏輯
  if (/contract/i.test(title)) return 'contract';
  if (/spot/i.test(title)) return 'spot';
  if (/street/i.test(title)) return 'street';
  return 'generic';
}

/**
 * 生成 Sheet 名稱 (完全動態，從標題生成)
 * @param {string} title - 報價標題
 * @param {string} urlKey - URL key (備用)
 * @return {string} Sheet 名稱
 */
function generateSheetName(title, urlKey) {
  // 優先從標題生成（最直觀）
  if (title) {
    return title
      .replace(/\s+Price.*$/i, '')        // 移除 " Price" 及後續內容
      .replace(/\s+in\s+.*$/i, '')        // 移除 " in ..." 後綴
      .replace(/\s+/g, '_')               // 空格轉底線
      .replace(/[^a-zA-Z0-9_]/g, '')      // 移除特殊字元
      .replace(/_+/g, '_')                // 清理多餘底線
      .replace(/^_|_$/g, '');             // 移除首尾底線
  }
  
  // 備用：從 urlKey 生成
  if (urlKey) {
    return urlKey
      .replace(/[^a-zA-Z0-9_]/g, '_')     // 特殊字元轉底線
      .replace(/_+/g, '_')                // 清理多餘底線
      .replace(/^_|_$/g, '');             // 移除首尾底線
  }
  
  return 'Unknown';
}

/**
 * 取得或建立 Sheet (避免重複建立)
 * @param {string} sheetName - Sheet 名稱
 * @param {Array} headers - 表頭陣列 (可選，若 Sheet 不存在時使用)
 * @return {Sheet} Google Sheet 物件
 */
function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (sheet) {
    return sheet;
  }
  
  // Sheet 不存在，建立新的
  sheet = ss.insertSheet(sheetName);
  log('建立新 Sheet: ' + sheetName);
  
  // 如果有提供表頭，設定表頭
  if (headers && headers.length > 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    
    // 設定表頭樣式
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a86e8');
    headerRange.setFontColor('white');
  }
  
  return sheet;
}

/**
 * 檢查 Sheet 是否已存在
 * @param {string} sheetName - Sheet 名稱
 * @return {boolean} 是否存在
 */
function sheetExists(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(sheetName) !== null;
}

/**
 * 尋找相似名稱的現有 Sheet (模糊匹配)
 * @param {string} targetName - 目標名稱
 * @return {string|null} 匹配的 Sheet 名稱，或 null
 */
function findSimilarSheet(targetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  
  // 標準化目標名稱 (轉小寫，移除底線)
  var normalizedTarget = targetName.toLowerCase().replace(/_/g, '');
  
  for (var i = 0; i < sheets.length; i++) {
    var existingName = sheets[i].getName();
    var normalizedExisting = existingName.toLowerCase().replace(/_/g, '');
    
    // 完全匹配 (忽略大小寫和底線)
    if (normalizedTarget === normalizedExisting) {
      return existingName;
    }
    
    // 部分匹配 (目標名稱包含在現有名稱中，或反之)
    if (normalizedTarget.indexOf(normalizedExisting) !== -1 ||
        normalizedExisting.indexOf(normalizedTarget) !== -1) {
      // 確保匹配程度夠高 (至少 80% 相似)
      var similarity = Math.min(normalizedTarget.length, normalizedExisting.length) /
                       Math.max(normalizedTarget.length, normalizedExisting.length);
      if (similarity >= 0.8) {
        return existingName;
      }
    }
  }
  
  return null;
}

/**
 * 智慧取得 Sheet 名稱 (優先使用現有的相似 Sheet)
 * @param {string} title - 報價標題
 * @param {string} urlKey - URL key
 * @return {string} 最終使用的 Sheet 名稱
 */
function resolveSheetName(title, urlKey) {
  // 先生成建議的 Sheet 名稱
  var suggestedName = generateSheetName(title, urlKey);
  
  // 檢查是否已存在完全相同的 Sheet
  if (sheetExists(suggestedName)) {
    return suggestedName;
  }
  
  // 嘗試找相似的現有 Sheet
  var similarSheet = findSimilarSheet(suggestedName);
  if (similarSheet) {
    return similarSheet;
  }
  
  // 沒有找到，使用建議名稱
  return suggestedName;
}

/**
 * 從區塊 HTML 中提取 Last Update
 * @param {string} blockHtml - 區塊 HTML
 * @param {string} title - 報價標題
 * @return {string|null} Last Update 字串
 */
function extractLastUpdateFromBlock(blockHtml, title) {
  if (!blockHtml) return null;
  
  // 多種 Last Update 格式的匹配模式
  var patterns = [
    // 標準格式: Last Update: Dec.4 2025 11:00
    /Last\s*Update[:\s]*([A-Z][a-z]{2,3}\.?\s*\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2})/i,
    // 帶有多餘空格: LastUpdate:Nov.28 2025 10:30
    /Last\s*Update[:\s]*([A-Z][a-z]{2,3}\.?\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2})/i,
    // 帶有時區說明: Last Update: Dec.4 2025 11:00 (GMT+8)
    /Last\s*Update[:\s]*([A-Z][a-z]{2,3}\.?\s*\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2})\s*\(/i
  ];
  
  for (var i = 0; i < patterns.length; i++) {
    var match = blockHtml.match(patterns[i]);
    if (match) {
      // 標準化日期格式（移除多餘空白）
      var dateStr = match[1].replace(/\s+/g, ' ').trim();
      return 'Last Update: ' + dateStr;
    }
  }
  
  return null;
}

/**
 * 根據標題從 HTML 中提取 Last Update
 * @param {string} html - HTML 內容
 * @param {string} title - 報價標題
 * @return {string|null} Last Update 字串
 */
function extractLastUpdateByTitle(html, title) {
  if (!title || !html) return null;
  
  // 清理標題中的特殊字元以用於正則表達式
  var cleanTitle = title
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  var escapedTitle = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // 尋找標題附近的 Last Update
  // 先找到標題位置
  var titlePattern = new RegExp(escapedTitle, 'i');
  var titleMatch = html.match(titlePattern);
  
  if (!titleMatch) {
    return null;
  }
  
  var titlePos = html.indexOf(titleMatch[0]);
  if (titlePos === -1) return null;
  
  // 在標題後 3000 字元內尋找 Last Update
  var searchEnd = Math.min(titlePos + 3000, html.length);
  var searchSection = html.substring(titlePos, searchEnd);
  
  // 使用 CONFIG 中的模式
  var pattern = CONFIG.HTML_PATTERNS.lastUpdatePattern;
  var match = searchSection.match(pattern);
  
  if (match) {
    return 'Last Update: ' + match[1].trim();
  }
  
  return null;
}

/**
 * 驗證是否為有效的報價類型名稱
 * @param {string} title - 標題
 * @return {boolean} 是否有效
 */
function isValidPriceType(title) {
  if (!title) return false;
  
  // 必須以大寫字母開頭（正常的報價標題）
  if (!/^[A-Z]/.test(title)) return false;
  
  // 必須包含空格（正常的標題應該有空格分隔單詞）
  if (title.indexOf(' ') === -1) return false;
  
  // 長度檢查 (合理的標題長度)
  if (title.length < 12 || title.length > 50) return false;
  
  // 過濾規則 - 排除明顯不是報價標題的內容
  var invalidPatterns = [
    /^[\-\s]/,                          // 以 - 或空白開頭
    /^var\s/i,                          // JavaScript 變數宣告
    /^function\s/i,                     // JavaScript 函式宣告
    /and\s+provides/i,                  // 描述文字
    /will\s+no\s+longer/i,              // 描述文字
    /gradually\s+being/i,               // 描述文字
    /historical/i,                      // 歷史資料描述
    /included\s+in/i,                   // 描述文字
    /phased\s+out/i,                    // 描述文字
    /5-year/i,                          // 歷史資料
    /\+/,                               // 包含 + 號
    /\"/,                               // 包含引號
    /\'/,                               // 包含單引號
    /item\./i,                          // JavaScript 物件屬性
    /show_day/i,                        // JavaScript 變數
    /MonthArray/i,                      // JavaScript 變數
    /getMonth|getDate|getFullYear/i,    // JavaScript 方法
    /\(/,                               // 包含括號 (可能是函式呼叫)
    /\)/                                // 包含括號
  ];
  
  for (var i = 0; i < invalidPatterns.length; i++) {
    if (invalidPatterns[i].test(title)) {
      return false;
    }
  }
  
  // 必須以 "Price" 結尾
  if (!/Price\s*$/i.test(title)) return false;
  
  // 必須包含 Spot, Contract, Street 或 Wafer 關鍵字
  if (!/Spot|Contract|Street|Wafer/i.test(title)) return false;
  
  return true;
}

/**
 * 檢查是否有對應的資料表格
 * @param {string} title - 報價類型標題
 * @param {string} html - HTML 內容
 * @return {boolean} 是否有對應表格
 */
function hasCorrespondingTable(title, html) {
  // 在標題後方 5000 字元內尋找 <table> 標籤
  var escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var searchPattern = new RegExp(escapedTitle + '[\\s\\S]{0,5000}?<table[^>]*>', 'i');
  
  return searchPattern.test(html);
}

/**
 * 判斷表格類型
 */
function determineTableType(title, html) {
  var rules = CONFIG.TABLE_TYPE_RULES;
  
  // 依優先順序檢查規則
  // 1. SSD OEM (最特殊)
  if (matchesRule(title, html, rules.ssd_oem)) {
    return 'ssd_oem';
  }
  
  // 2. SSD Street
  if (matchesRule(title, html, rules.ssd_street)) {
    return 'ssd_street';
  }
  
  // 3. Contract (排除 SSD)
  if (matchesRule(title, html, rules.contract)) {
    if (!title.match(/SSD/i)) {
      return 'contract';
    }
  }
  
  // 4. Spot (預設)
  if (matchesRule(title, html, rules.spot)) {
    return 'spot';
  }
  
  // 無法判斷，使用通用解析
  return 'generic';
}

/**
 * 檢查是否符合規則
 */
function matchesRule(title, html, rule) {
  if (!rule) return false;
  
  // 檢查排除關鍵字
  if (rule.excludeKeywords) {
    for (var i = 0; i < rule.excludeKeywords.length; i++) {
      if (title.indexOf(rule.excludeKeywords[i]) !== -1) {
        return false;
      }
    }
  }
  
  // 檢查標題關鍵字
  if (rule.keywords) {
    for (var i = 0; i < rule.keywords.length; i++) {
      if (title.indexOf(rule.keywords[i]) !== -1) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 找到下一個區段的標題
 */
function findNextSection(currentTitle, html, allTitles) {
  var currentPos = html.indexOf(currentTitle);
  if (currentPos === -1) return null;
  
  var nextPos = html.length;
  var nextTitle = null;
  
  // allTitles 現在是字串陣列
  for (var i = 0; i < allTitles.length; i++) {
    var title = allTitles[i];
    if (typeof title !== 'string') continue;
    
    var normalized = title.trim();
    if (normalized === currentTitle) continue;
    
    var pos = html.indexOf(normalized, currentPos + currentTitle.length);
    if (pos !== -1 && pos < nextPos) {
      nextPos = pos;
      nextTitle = normalized;
    }
  }
  
  return nextTitle;
}

/**
 * 更新發現的報價類型記錄
 */
function updateDiscoveredTypesSheet(types) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.DISCOVERED_TYPES_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.DISCOVERED_TYPES_SHEET);
    sheet.appendRow(['標題', 'Sheet名稱', '表格類型', '需登入', '首次發現', '最後確認']);
    sheet.setFrozenRows(1);
  }
  
  var now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm');
  var lastRow = sheet.getLastRow();
  var existingTitles = {};
  
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    data.forEach(function(row, idx) {
      existingTitles[row[0]] = { rowIndex: idx + 2, data: row };
    });
  }
  
  var newRows = [];
  
  types.forEach(function(type) {
    if (existingTitles[type.title]) {
      // 更新最後確認時間
      var existing = existingTitles[type.title];
      sheet.getRange(existing.rowIndex, 6).setValue(now);
    } else {
      // 新發現的類型
      newRows.push([
        type.title,
        type.sheetName,
        type.tableType,
        type.isLoginRequired ? 'Y' : 'N',
        now,
        now
      ]);
      log('發現新報價類型: ' + type.title, 'WARN');
    }
  });
  
  if (newRows.length > 0) {
    sheet.getRange(lastRow + 1, 1, newRows.length, 6).setValues(newRows);
  }
}

/**
 * 處理動態發現的報價類型
 */
function processDynamicPrice(typeInfo, html, results) {
  var startTime = new Date().getTime();
  var TIMEOUT_MS = 30000;  // 30 秒超時
  
  try {
    var data;
    var dynamicSource = CONFIG.DYNAMIC_DATA_SOURCES[typeInfo.urlKey];
    
    if (dynamicSource) {
      data = fetchAndParseDynamicJson(dynamicSource, typeInfo);
    } else {
      data = parseGenericPrice(html, typeInfo);
    }
    
    // 超時檢查
    if (new Date().getTime() - startTime > TIMEOUT_MS) {
      log(typeInfo.title + ': 處理超時', 'ERROR');
      results.errors++;
      return;
    }
    
    if (!data || !data.lastUpdate) {
      log(typeInfo.title + ': 無法解析 Last Update', 'WARN');
      results.errors++;
      return;
    }
    
    var normalizedUpdate = normalizeLastUpdate(data.lastUpdate);
    
    if (!normalizedUpdate) {
      // 記錄更詳細的錯誤資訊（截斷過長的原始值）
      var rawValue = data.lastUpdate;
      if (rawValue && rawValue.length > 50) {
        rawValue = rawValue.substring(0, 50) + '...';
      }
      log(typeInfo.title + ': Last Update 格式無效: ' + rawValue, 'WARN');
      results.errors++;
      return;
    }
    
    if (isLastUpdateExists(typeInfo.sheetName, normalizedUpdate)) {
      results.skipped++;
      return;
    }
    
    // 新增記錄
    if (data.rows && data.rows.length > 0) {
      var saveResult = saveToSheetDynamic(typeInfo, data, normalizedUpdate);
      
      if (saveResult.schemaChanged) {
        logSchemaChange(typeInfo.sheetName, saveResult.oldHeaders, saveResult.newHeaders);
      }
      
      log(typeInfo.title + ': 新增 ' + data.rows.length + ' 筆記錄 (' + normalizedUpdate + ')');
      results.processed++;
    } else {
      log(typeInfo.title + ': 無資料列', 'WARN');
      results.errors++;
    }
    
  } catch (e) {
    log(typeInfo.title + ' 處理失敗: ' + e.toString(), 'ERROR');
    results.errors++;
  }
}

// ============================================================
// Last Update 處理函式
// ============================================================

/**
 * 正規化 Last Update 字串
 * 處理各種格式差異，統一輸出為 "yyyy-MM-dd HH:mm"
 * 
 * 輸入範例：
 * - "Last Update: Dec.4 2025 11:00 (GMT+8)"
 * - "LastUpdate:Nov.24 2025 14:40 (GMT+8)"
 * - "LastUpdate:Jul.24 2025, 10:00 (GMT+8)"
 * - "Last Update: Dec.4 2025    11:00 (GMT+8)"  (多空格)
 * 
 * @param {string} rawText - 原始 Last Update 文字
 * @return {string|null} 正規化後的時間字串，格式無效則回傳 null
 */
function normalizeLastUpdate(rawText) {
  if (!rawText) return null;
  
  // 檢查是否為 JavaScript 程式碼（無效格式）
  // 注意：先檢查特徵性的 JS 程式碼模式，而非單純的 + 符號（因為 GMT+8 也有 +）
  if (rawText.indexOf('item.') !== -1 || 
      rawText.indexOf('show_day') !== -1 ||
      rawText.indexOf('" +') !== -1 ||      // JS 字串連接
      rawText.indexOf('+ "') !== -1 ||      // JS 字串連接
      rawText.indexOf('"+') !== -1) {       // JS 字串連接
    return null;  // 這是 JavaScript 程式碼，不是有效日期
  }
  
  // 移除 "Last Update:" 或 "LastUpdate:" 前綴（不區分空格）
  var text = rawText.replace(/Last\s*Update\s*:\s*/i, '').trim();
  
  // 移除 (GMT+8) 後綴
  text = text.replace(/\s*\(GMT\+8\)\s*/i, '').trim();
  
  // 移除多餘逗號
  text = text.replace(/,/g, '').trim();
  
  // 將多個空格壓縮為單一空格
  text = text.replace(/\s+/g, ' ').trim();
  
  // 解析月份
  var monthMap = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  // 嘗試匹配格式: "Dec.4 2025 11:00" 或 "Nov.24 2025 14:40"
  var match = text.match(/^([A-Za-z]{3})\.?(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})$/);
  
  if (match) {
    var monthStr = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    var month = monthMap[monthStr];
    
    if (!month) return null;
    
    var day = match[2].padStart(2, '0');
    var year = match[3];
    var hour = match[4].padStart(2, '0');
    var minute = match[5];
    
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  }
  
  // 支援 yyyy-MM-dd HH:mm 格式 (動態資料來源使用)
  var isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (isoMatch) {
    return text; // 已經是標準格式，直接回傳
  }
  
  return null;
}

/**
 * 檢查指定 Sheet 是否已有此 Last Update 時間
 * @param {string} sheetName - Sheet 名稱
 * @param {string} normalizedUpdate - 正規化後的時間字串
 * @return {boolean} 是否已存在
 */
function isLastUpdateExists(sheetName, normalizedUpdate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return false; // Sheet 不存在，表示尚未有任何記錄
  }
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return false; // 只有表頭
  }
  
  // 讀取 LastUpdate 欄位 (第 1 欄)
  var updates = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  
  for (var i = 0; i < updates.length; i++) {
    var cellValue = updates[i][0];
    if (!cellValue) continue;
    
    // 處理可能是 Date 物件的情況
    var cellStr = (cellValue instanceof Date)
      ? Utilities.formatDate(cellValue, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
      : String(cellValue).trim();
    
    if (cellStr === normalizedUpdate) {
      return true;
    }
  }
  
  return false;
}

// ============================================================
// 報價解析函式 (支援動態 Schema)
// ============================================================

/**
 * 從動態來源 (JSON) 抓取並解析報價
 * @param {Object} dynamicSource - 動態來源配置
 * @param {Object} typeInfo - 報價類型資訊
 * @return {Object} 解析後的資料 { lastUpdate, rows, headers }
 */
function fetchAndParseDynamicJson(dynamicSource, typeInfo) {
  try {
    var response = UrlFetchApp.fetch(dynamicSource.url, {
      'muteHttpExceptions': true,
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.dramexchange.com/'
      }
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error('HTTP Error: ' + response.getResponseCode());
    }
    
    var jsonText = response.getContentText();
    var jsonData = JSON.parse(jsonText);
    
    if (!Array.isArray(jsonData)) {
      throw new Error('JSON 格式錯誤: 預期為陣列');
    }
    
    // 提取 Last Update
    // 優先使用 typeInfo 中的 lastUpdate (從 HTML 標題旁提取的)
    // 如果沒有，嘗試從 JSON 第一筆資料中提取 show_day 或 show_crdate
    var lastUpdate = typeInfo.lastUpdate;
    if (!lastUpdate && jsonData.length > 0) {
      var firstItem = jsonData[0];
      // 嘗試解析 show_day (e.g. "2025-07-24T10:00:00")
      var dateStr = firstItem.show_day || firstItem.show_crdate;
      if (dateStr) {
        // 簡單轉換為 yyyy-MM-dd HH:mm
        lastUpdate = dateStr.replace('T', ' ').substring(0, 16);
      }
    }
    
    var rows = [];
    var headers = dynamicSource.headers || ['Item', 'High', 'Low', 'Average', 'Change'];
    var fieldMap = dynamicSource.fieldMap || {};
    
    // 如果沒有 fieldMap，嘗試使用舊的配置方式 (相容性)
    if (Object.keys(fieldMap).length === 0 && dynamicSource.nameField) {
      fieldMap['Item'] = dynamicSource.nameField;
      if (dynamicSource.priceFields) {
        var pFields = dynamicSource.priceFields;
        if (pFields.length > 0) fieldMap['High'] = pFields[0];
        if (pFields.length > 1) fieldMap['Low'] = pFields[1];
        if (pFields.length > 2) fieldMap['Average'] = pFields[2];
      }
      fieldMap['Change'] = 'show_avg_change';
    }
    
    jsonData.forEach(function(item) {
      // 檢查是否有項目名稱 (作為有效資料的判斷依據)
      var nameKey = fieldMap['Item'];
      if (!nameKey || !item[nameKey]) return;
      
      var row = {};
      
      // 根據 headers 和 fieldMap 動態組裝 row
      headers.forEach(function(header) {
        var fieldKey = fieldMap[header];
        
        // 轉換為內部屬性鍵值 (與 parseDataRowDynamic 保持一致: 小寫無空格)
        // 這樣 saveToSheetDynamic 中的 findValueByHeader 才能透過 headerMap 正確找到
        var internalKey = header.toLowerCase().replace(/\s+/g, '');
        
        if (!fieldKey) {
          row[internalKey] = '-';
          return;
        }
        
        var val = item[fieldKey];
        
        if (typeof val === 'number') {
          // 針對 Change 欄位加上 %
          if (header === 'Change') {
            row[internalKey] = val.toFixed(2) + '%';
          } else {
            row[internalKey] = val.toFixed(2);
          }
        } else {
          row[internalKey] = val || '-';
        }
      });
      
      rows.push(row);
    });
    
    return {
      lastUpdate: lastUpdate,
      headers: headers,
      rows: rows
    };
    
  } catch (e) {
    log('動態抓取失敗 (' + dynamicSource.url + '): ' + e.toString(), 'ERROR');
    return null;
  }
}

/**
 * 通用報價解析函式 (根據 tbody id 定位表格)
 * @param {string} html - HTML 內容
 * @param {Object} typeConfig - 報價類型設定
 * @return {Object} { lastUpdate: string, headers: Array, rows: Array }
 */
function parseGenericPrice(html, typeConfig) {
  var title = typeConfig.title;
  var tbodyId = typeConfig.tbodyId;
  var tableType = typeConfig.tableType;
  var blockHtml = typeConfig.blockHtml;  // 優先使用已保存的區塊 HTML
  
  // 1. 提取 Last Update (優先使用已提取的)
  var lastUpdate = typeConfig.lastUpdate || extractLastUpdateFromBlock(blockHtml || html, title);
  
  // 2. 根據 tbody id 提取表格內容
  var tableHtml = '';
  
  // 優先從已保存的區塊 HTML 中提取
  if (blockHtml && tbodyId) {
    var tbodyPattern = new RegExp('<tbody[^>]*id="' + tbodyId + '"[^>]*>([\\s\\S]*?)</tbody>', 'i');
    var tbodyMatch = blockHtml.match(tbodyPattern);
    if (tbodyMatch) {
      tableHtml = tbodyMatch[1];
    }
  }
  
  // 如果區塊 HTML 沒有找到，從完整 HTML 中尋找
  if (!tableHtml && tbodyId && !typeConfig.specialParsing) {
    // 標準方式：根據 tbody id 提取
    var tbodyPattern = new RegExp('<tbody[^>]*id="' + tbodyId + '"[^>]*>([\\s\\S]*?)</tbody>', 'i');
    var tbodyMatch = html.match(tbodyPattern);
    
    if (tbodyMatch) {
      tableHtml = tbodyMatch[1];
    }
  } else if (typeConfig.specialParsing === 'gddr') {
    // GDDR 特殊處理：在 GDDR Spot Price 標題後找表格
    tableHtml = extractSpecialTable(html, 'GDDR Spot Price', 'GDDR');
  } else if (typeConfig.specialParsing === 'wafer') {
    // Wafer 特殊處理
    tableHtml = extractSpecialTable(html, 'Wafer Spot Price', 'TLC');
  }
  
  // **備用方案：如果 tbodyId 找不到資料，嘗試從區塊中找任何包含價格數字的 tbody**
  if (!tableHtml && blockHtml) {
    var anyTbodyPattern = /<tbody[^>]*>([\s\S]*?)<\/tbody>/gi;
    var tbodyCandidate;
    // 使用更寬鬆的價格模式
    var loosePricePattern = />\s*\d+\.\d+\s*</;
    
    while ((tbodyCandidate = anyTbodyPattern.exec(blockHtml)) !== null) {
      // 檢查這個 tbody 是否包含價格數字
      if (loosePricePattern.test(tbodyCandidate[1])) {
        tableHtml = tbodyCandidate[1];
        log(title + ': 使用備用 tbody (無 id，包含價格)', 'DEBUG');
        break;
      }
    }
  }
  
  // **第二備用方案：如果連無 id 的 tbody 都沒找到，嘗試直接從區塊 HTML 找 table**
  if (!tableHtml && blockHtml) {
    var tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    var tableCandidate;
    var loosePricePattern2 = />\s*\d+\.\d+\s*</;
    
    while ((tableCandidate = tablePattern.exec(blockHtml)) !== null) {
      if (loosePricePattern2.test(tableCandidate[1])) {
        tableHtml = tableCandidate[1];
        log(title + ': 使用備用 table (包含價格)', 'DEBUG');
        break;
      }
    }
  }
  
  if (!tableHtml) {
    return { lastUpdate: lastUpdate, headers: null, rows: [] };
  }
  
  // 3. 解析表格
  var parseResult = parseTableByType(tableHtml, tableType);
  
  return {
    lastUpdate: lastUpdate,
    headers: parseResult.headers,
    rows: parseResult.rows
  };
}

/**
 * 提取特殊表格（用於 GDDR、Wafer 等共用 tbody id 的情況）
 * Wafer 和 GDDR 的資料實際上都在 tb_ModuleSpotPrice 裡面
 */
function extractSpecialTable(html, sectionTitle, keyword) {
  // 找到區段起始位置 (用 ">title<" 模式更精確)
  var titlePattern = '>' + sectionTitle;
  var startPos = html.indexOf(titlePattern);
  if (startPos === -1) {
    // 嘗試其他模式
    startPos = html.indexOf(sectionTitle);
  }
  if (startPos === -1) {
    return '';
  }
  
  // 從該位置開始找 tb_ModuleSpotPrice tbody
  var endLimit = Math.min(startPos + 8000, html.length);
  var searchHtml = html.substring(startPos, endLimit);
  
  // 直接找 tb_ModuleSpotPrice tbody
  var tbodyPattern = /<tbody[^>]*id="tb_ModuleSpotPrice"[^>]*>([\s\S]*?)<\/tbody>/i;
  var tbodyMatch = searchHtml.match(tbodyPattern);
  
  if (tbodyMatch && tbodyMatch[1].indexOf(keyword) !== -1) {
    return tbodyMatch[1];
  }
  
  // 如果沒找到，嘗試找其他包含關鍵字的 tbody
  var anyTbodyPattern = /<tbody[^>]*>([\s\S]*?)<\/tbody>/gi;
  var match;
  var maxIterations = 10;
  var iterations = 0;
  
  while ((match = anyTbodyPattern.exec(searchHtml)) !== null && iterations < maxIterations) {
    iterations++;
    if (match[1].indexOf(keyword) !== -1) {
      return match[1];
    }
  }
  
  return '';
}

/**
 * 根據表格類型解析表格
 */
function parseTableByType(tableHtml, tableType) {
  var result = { headers: null, rows: [] };
  
  // 解析所有行
  var rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  var rowMatch;
  var isFirstRow = true;
  var maxRows = 200;  // 防止無限迴圈
  var rowCount = 0;
  
  while ((rowMatch = rowPattern.exec(tableHtml)) !== null && rowCount < maxRows) {
    rowCount++;
    var cells = extractCells(rowMatch[1]);
    if (cells.length === 0) continue;
    
    // 動態判斷表頭：第一行且不包含價格數字
    if (isFirstRow && isHeaderRowDynamic(cells)) {
      result.headers = cells.map(function(c) { return normalizeHeaderName(c); });
      isFirstRow = false;
      continue;
    }
    isFirstRow = false;
    
    // 資料行
    var rowData = parseDataRowDynamic(cells, result.headers);
    if (rowData) {
      result.rows.push(rowData);
    }
  }
  
  // 如果沒有找到表頭，使用通用表頭 (根據欄位數)
  if (!result.headers && result.rows.length > 0) {
    var colCount = result.rows[0].length;
    result.headers = generateGenericHeaders(colCount);
  }
  
  return result;
}

// ============================================================
// 表格解析輔助函式 (支援動態表頭)
// ============================================================

/**
 * 從區段動態解析表格 (含表頭)
 * @param {string} section - HTML 區段
 * @param {string} tableType - 表格類型：spot, contract, ssd_street, ssd_oem
 * @return {Object} { headers: Array, rows: Array }
 */
function parseTableDynamic(section, tableType) {
  var result = { headers: null, rows: [] };
  
  var tableMatches = section.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
  if (!tableMatches) return result;
  
  var dataTable = null;
  var headerRow = null;
  
  // 依據表格類型找到正確的資料表格
  if (tableType === 'spot') {
    if (tableMatches.length >= 2) {
      dataTable = tableMatches[1];
    }
  } else if (tableType === 'contract') {
    for (var i = 0; i < tableMatches.length && i < 10; i++) {
      if (tableMatches[i].indexOf('Average') !== -1 && tableMatches[i].indexOf('Change') !== -1) {
        dataTable = tableMatches[i];
        break;
      }
    }
  } else if (tableType === 'ssd_street') {
    for (var i = 0; i < tableMatches.length && i < 10; i++) {
      if (tableMatches[i].indexOf('Brand') !== -1 && tableMatches[i].indexOf('Interface') !== -1) {
        dataTable = tableMatches[i];
        break;
      }
    }
  } else if (tableType === 'ssd_oem') {
    for (var i = 0; i < tableMatches.length && i < 10; i++) {
      if (tableMatches[i].indexOf('Average') !== -1) {
        dataTable = tableMatches[i];
        break;
      }
    }
  }
  
  if (!dataTable) return result;
  
  // 解析所有行
  var rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  var rowMatch;
  var isFirstDataRow = true;
  var maxRows = 200;  // 防止無限迴圈
  var rowCount = 0;
  
  while ((rowMatch = rowPattern.exec(dataTable)) !== null && rowCount < maxRows) {
    rowCount++;
    var cells = extractCells(rowMatch[1]);
    if (cells.length === 0) continue;
    
    // 判斷是否為表頭行
    if (isHeaderRow(cells, tableType)) {
      result.headers = cells.map(function(c) { return normalizeHeaderName(c); });
      continue;
    }
    
    // 資料行
    var rowData = parseDataRow(cells, tableType, result.headers);
    if (rowData) {
      result.rows.push(rowData);
    }
  }
  
  return result;
}

/**
 * 判斷是否為表頭行
 */
function isHeaderRow(cells, tableType) {
  // 向後相容，委託給動態版本
  return isHeaderRowDynamic(cells);
}

/**
 * 動態判斷是否為表頭行
 * 規則：
 * 1. 不包含價格數字 (X.XX 或 X.XXX)
 * 2. 包含常見表頭關鍵字 (Item, High, Low, Avg 等)
 * 3. 或者全部是文字 (無數字)
 */
function isHeaderRowDynamic(cells) {
  // 檢查是否包含價格數字
  var hasPriceNumber = cells.some(function(cell) {
    return /^\d+\.\d{2,3}$/.test(cell.trim());
  });
  
  if (hasPriceNumber) {
    return false;  // 包含價格數字，不是表頭
  }
  
  // 檢查是否包含常見表頭關鍵字
  var headerKeywords = /^(Item|High|Low|Avg|Average|Change|Brand|Series|Capacity|Daily|Weekly|Session|Product|Name|Type|Price)$/i;
  var keywordCount = cells.filter(function(cell) {
    return headerKeywords.test(cell.trim());
  }).length;
  
  // 至少匹配 2 個關鍵字，或者全部都是文字
  if (keywordCount >= 2) {
    return true;
  }
  
  // 檢查是否全部是文字 (無數字)
  var allText = cells.every(function(cell) {
    return !/\d/.test(cell) || /^\d+$/.test(cell.trim()) === false;
  });
  
  return allText && cells.length >= 2;
}

/**
 * 正規化表頭名稱
 */
function normalizeHeaderName(header) {
  return header
    .replace(/\s+/g, '')           // 移除空白
    .replace(/[()]/g, '')          // 移除括號
    .replace(/daily/i, 'Daily')
    .replace(/weekly/i, 'Weekly')
    .replace(/session/i, 'Session')
    .replace(/avg/i, 'Avg')
    .replace(/change/i, 'Change')
    .replace(/high/i, 'High')
    .replace(/low/i, 'Low');
}

/**
 * 生成通用表頭 (當無法從 HTML 取得時)
 */
function generateGenericHeaders(colCount) {
  var headers = ['Item'];
  for (var i = 1; i < colCount; i++) {
    headers.push('Col' + i);
  }
  return headers;
}

/**
 * 動態解析資料行 (不依賴 tableType)
 */
function parseDataRowDynamic(cells, headers) {
  if (!cells || cells.length === 0) return null;
  
  // 檢查是否為有效資料行（至少包含一個數字）
  var hasNumber = cells.some(function(c, idx) { 
    return idx > 0 && isNumeric(c); 
  });
  
  if (!hasNumber) return null;
  
  // 第一欄通常是項目名稱
  var itemName = cells[0] ? cells[0].trim() : '';
  if (!itemName) return null;
  
  // 動態組裝資料物件 (根據表頭或欄位數)
  var rowData = {};
  
  if (headers && headers.length > 0) {
    // 有表頭時，使用表頭作為 key (從 i=0 開始，包含第一欄)
    for (var i = 0; i < cells.length && i < headers.length; i++) {
      var key = headers[i].toLowerCase().replace(/\s+/g, '');
      rowData[key] = cells[i].trim();
    }
    // 為向後相容，如果沒有 'item' key 但有第一欄資料，也設定 item
    if (rowData.item === undefined && rowData.brand === undefined) {
      rowData.item = itemName;
    }
  } else {
    // 無表頭時，使用通用命名
    rowData.item = itemName;
    for (var i = 1; i < cells.length; i++) {
      rowData['col' + i] = cells[i].trim();
    }
  }
  
  return rowData;
}

/**
 * 解析資料行 (向後相容，委託給動態版本)
 */
function parseDataRow(cells, tableType, headers) {
  return parseDataRowDynamic(cells, headers);
}

/**
 * 從 tr 內容提取所有 td 文字
 */
function extractCells(rowHtml) {
  var cells = [];
  var cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  var cellMatch;
  var maxCells = 50;  // 防止無限迴圈
  var cellCount = 0;
  
  while ((cellMatch = cellPattern.exec(rowHtml)) !== null && cellCount < maxCells) {
    cellCount++;
    var text = cellMatch[1]
      .replace(/<[^>]+>/g, '') // 移除 HTML 標籤
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    cells.push(text);
  }
  
  return cells;
}

/**
 * 檢查是否為數字
 */
function isNumeric(str) {
  if (!str) return false;
  var cleaned = str.replace(/[,\s%]/g, '');
  return !isNaN(parseFloat(cleaned));
}

/**
 * 解析數字 (移除逗號)
 */
function parseNumber(text) {
  if (!text) return 0;
  var cleaned = text.replace(/[,\s]/g, '');
  var num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ============================================================
// Sheet 操作函式
// ============================================================

/**
 * 動態儲存資料到 Sheet (支援 Schema 變更)
 * @param {Object} typeConfig - 報價類型設定
 * @param {Object} data - 解析結果 { lastUpdate, headers, rows }
 * @param {string} lastUpdate - 正規化後的 LastUpdate
 * @return {Object} { schemaChanged, oldHeaders, newHeaders }
 */
function saveToSheetDynamic(typeConfig, data, lastUpdate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(typeConfig.sheetName);
  var result = { schemaChanged: false, oldHeaders: null, newHeaders: null };
  
  // 使用解析出的表頭，若無則使用預設
  var headers = data.headers || typeConfig.defaultHeaders;
  // 確保第一欄是 LastUpdate
  if (headers[0] !== 'LastUpdate') {
    headers = ['LastUpdate'].concat(headers);
  }
  
  // 建立 Sheet (若不存在)
  if (!sheet) {
    sheet = ss.insertSheet(typeConfig.sheetName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('@');
    log(typeConfig.sheetName + ': 建立新 Sheet，表頭: ' + headers.join(', '));
  } else {
    // 檢查現有表頭是否與新表頭一致
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (!arraysEqual(existingHeaders, headers)) {
      result.schemaChanged = true;
      result.oldHeaders = existingHeaders;
      result.newHeaders = headers;
      
      // 處理 Schema 變更：新增欄位
      var newColumns = headers.filter(function(h) {
        return existingHeaders.indexOf(h) === -1;
      });
      
      if (newColumns.length > 0) {
        // 在最後新增欄位
        newColumns.forEach(function(col) {
          var lastCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, lastCol).setValue(col);
        });
        log(typeConfig.sheetName + ': 新增欄位: ' + newColumns.join(', '), 'WARN');
      }
      
      // 重新讀取表頭
      existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    }
    headers = existingHeaders;
  }
  
  // 組裝資料列 (依據實際表頭順序)
  var rows = data.rows.map(function(row) {
    var arr = [];
    headers.forEach(function(header, idx) {
      if (header === 'LastUpdate') {
        arr.push(lastUpdate);
      } else {
        // 從 row 物件中找對應的值
        var value = findValueByHeader(row, header);
        arr.push(value !== undefined ? value : '');
      }
    });
    return arr;
  });
  
  // 寫入資料
  if (rows.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    var dataRange = sheet.getRange(startRow, 1, rows.length, rows[0].length);
    dataRange.setValues(rows);
    
    // 對百分比欄位進行格式化（加粗、正數綠色、負數紅色）
    formatPercentageColumns(sheet, headers, startRow, rows.length);
  }
  
  return result;
}

/**
 * 根據表頭名稱從資料物件中取得對應值
 * @param {Object} row - 資料列物件
 * @param {string} header - 表頭名稱
 * @return {*} 對應的值
 */
function findValueByHeader(row, header) {
  // 建立表頭到物件屬性的映射
  var headerMap = {
    'Item': 'item',
    'Brand': 'brand',
    'Interface': 'interface',
    'Series': 'series',
    'Capacity': 'capacity',
    'High': 'high',
    'Low': 'low',
    'Average': 'average',
    'Avg': 'avg',
    'Change': 'change',
    'DailyHigh': 'high',
    'DailyLow': 'low',
    'WeeklyHigh': 'high',
    'WeeklyLow': 'low',
    'SessionHigh': 'sessionHigh',
    'SessionLow': 'sessionLow',
    'SessionAvg': 'sessionAvg',
    'SessionChange': 'change',
    'AvgChange': 'avgChange',
    'LowChange': 'lowChange'
  };
  
  var propName = headerMap[header];
  if (propName && row[propName] !== undefined) {
    return row[propName];
  }
  
  // 直接嘗試用表頭作為屬性名
  var lowerHeader = header.toLowerCase().replace(/\s+/g, '');
  for (var key in row) {
    if (key.toLowerCase() === lowerHeader) {
      return row[key];
    }
  }
  
  return '';
}

/**
 * 對百分比欄位進行格式化
 * - 加粗顯示
 * - 正數顯示綠色
 * - 負數顯示紅色
 * @param {Sheet} sheet - 工作表
 * @param {Array} headers - 表頭陣列
 * @param {number} startRow - 起始行
 * @param {number} numRows - 行數
 */
function formatPercentageColumns(sheet, headers, startRow, numRows) {
  // 找出包含 Change 的欄位（這些通常是百分比欄位）
  var changeColumns = [];
  headers.forEach(function(header, idx) {
    var lowerHeader = header.toLowerCase();
    if (lowerHeader.indexOf('change') !== -1) {
      changeColumns.push(idx + 1); // 欄位索引從 1 開始
    }
  });
  
  if (changeColumns.length === 0) return;
  
  // 對每個百分比欄位進行批次格式化
  changeColumns.forEach(function(colIdx) {
    var range = sheet.getRange(startRow, colIdx, numRows, 1);
    var values = range.getValues();
    
    // 預先建立顏色和粗體陣列
    var fontColors = [];
    var fontWeights = [];
    
    for (var i = 0; i < values.length; i++) {
      var value = values[i][0];
      var color = null;  // 預設不設定
      var weight = 'normal';
      
      if (value !== '' && value !== null && value !== undefined) {
        // 解析數值（移除 % 符號和空白）
        var numValue = parseFloat(String(value).replace(/[%\s]/g, ''));
        
        if (!isNaN(numValue)) {
          weight = 'bold';
          
          // 根據正負數設定顏色
          if (numValue > 0) {
            color = '#0B8043'; // 綠色
          } else if (numValue < 0) {
            color = '#CC0000'; // 紅色
          } else {
            color = '#666666'; // 灰色 (0%)
          }
        }
      }
      
      fontColors.push([color || '#000000']);
      fontWeights.push([weight]);
    }
    
    // 批次設定格式（大幅減少 API 呼叫次數）
    range.setFontColors(fontColors);
    range.setFontWeights(fontWeights);
  });
}

/**
 * 比較兩個陣列是否相等
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (String(a[i]).trim() !== String(b[i]).trim()) return false;
  }
  return true;
}

/**
 * 記錄 Schema 變更
 */
function logSchemaChange(sheetName, oldHeaders, newHeaders) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SCHEMA_CHANGE_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SCHEMA_CHANGE_SHEET);
    sheet.appendRow(['時間', 'Sheet名稱', '變更類型', '舊表頭', '新表頭', '新增欄位', '移除欄位']);
    sheet.setFrozenRows(1);
  }
  
  var now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
  var addedCols = newHeaders.filter(function(h) { return oldHeaders.indexOf(h) === -1; });
  var removedCols = oldHeaders.filter(function(h) { return newHeaders.indexOf(h) === -1; });
  
  sheet.appendRow([
    now,
    sheetName,
    'Schema 變更',
    oldHeaders.join(', '),
    newHeaders.join(', '),
    addedCols.join(', ') || '無',
    removedCols.join(', ') || '無'
  ]);
  
  log(sheetName + ' Schema 變更已記錄', 'WARN');
}

// ============================================================
// HTTP 請求函式
// ============================================================

/**
 * 抓取 HTML (含重試機制)
 * @param {string} url - 目標 URL
 * @return {string} HTML 內容
 */
function fetchHtml(url) {
  var lastError = null;
  
  for (var attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      var options = {
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        }
      };
      
      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();
      
      if (code === 200) {
        return response.getContentText();
      }
      
      lastError = new Error('HTTP ' + code);
      log('請求失敗: HTTP ' + code, 'WARN');
      
    } catch (e) {
      lastError = e;
      log('請求異常: ' + e.message, 'WARN');
    }
    
    if (attempt < CONFIG.MAX_RETRIES) {
      Utilities.sleep(CONFIG.RETRY_DELAY_MS);
    }
  }
  
  throw new Error('抓取失敗，已重試 ' + CONFIG.MAX_RETRIES + ' 次: ' + 
                  (lastError ? lastError.message : 'Unknown error'));
}

// ============================================================
// 日誌函式
// ============================================================

/**
 * 日誌記錄
 * @param {string} message - 訊息
 * @param {string} level - 日誌等級 (INFO, WARN, ERROR)
 */
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

// ============================================================
// 觸發器管理
// ============================================================

/**
 * 建立每日三次觸發器 (08:00, 12:00, 16:00)
 */
function createTripleDailyTrigger() {
  // 刪除現有 runDailyJob 觸發器
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'runDailyJob') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 建立三個時間觸發器
  var hours = [8, 12, 16];
  
  hours.forEach(function(hour) {
    ScriptApp.newTrigger('runDailyJob')
      .timeBased()
      .atHour(hour)
      .everyDays(1)
      .create();
  });
  
  log('已建立每日三次觸發器 (08:00, 12:00, 16:00)');
}

/**
 * 刪除所有 runDailyJob 觸發器
 */
function deleteTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'runDailyJob') {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });
  
  log('已刪除 ' + count + ' 個觸發器');
}

// ============================================================
// 資料清理函式
// ============================================================

/**
 * 清理過期資料
 */
function cleanupOldData() {
  var retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - CONFIG.RETENTION_DAYS);
  var dateStr = Utilities.formatDate(retentionDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  log('資料保留檢查: 清理 ' + dateStr + ' 之前的資料');
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var totalDeleted = 0;
  
  // 遍歷所有報價 Sheet
  Object.keys(CONFIG.PRICE_TYPES).forEach(function(key) {
    var sheetName = CONFIG.PRICE_TYPES[key].sheetName;
    var sheet = ss.getSheetByName(sheetName);
    
    if (sheet) {
      var deleted = cleanupSheetByDate(sheet, dateStr);
      totalDeleted += deleted;
    }
  });
  
  log('清理完成: 共刪除 ' + totalDeleted + ' 筆過期資料');
}

/**
 * 清理單一 Sheet 的過期資料
 */
function cleanupSheetByDate(sheet, beforeDate) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  
  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var deletedCount = 0;
  
  for (var i = data.length - 1; i >= 0; i--) {
    var cellValue = data[i][0];
    if (!cellValue) continue;
    
    var cellStr = String(cellValue).substring(0, 10); // 取日期部分 yyyy-MM-dd
    
    if (cellStr < beforeDate) {
      sheet.deleteRow(i + 2);
      deletedCount++;
    }
  }
  
  return deletedCount;
}

// ============================================================
// 測試函式
// ============================================================

/**
 * 測試用 - 手動執行
 */
function testRun() {
  runDailyJob();
}
