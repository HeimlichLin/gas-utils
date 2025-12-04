/**
 * Memory Price Scraper - 設定檔
 * 抓取 DRAMeXchange 記憶體報價
 * 
 * 設計原則：
 * - 所有報價類型從 HTML 動態發現
 * - 表頭 (headers) 從 HTML 動態解析
 * - 產品項目從網站動態取得
 * - 是否需要登入從 HTML 動態判斷（檢查是否有價格數據）
 * - Sheet 名稱從標題動態生成
 * - 僅定義基本爬蟲設定和 HTML 識別模式
 */

const CONFIG = {
  // ========================================
  // 爬蟲基本設定
  // ========================================
  TARGET_URL: 'https://www.dramexchange.com/',
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  
  // 資料保留天數
  RETENTION_DAYS: 180,
  
  // ========================================
  // 系統 Sheet 名稱
  // ========================================
  LOG_SHEET_NAME: 'Logs',
  SCHEMA_CHANGE_SHEET: 'SchemaChanges',
  DISCOVERED_TYPES_SHEET: 'DiscoveredTypes',
  
  // ========================================
  // HTML 結構識別模式 (用於動態解析)
  // ========================================
  HTML_PATTERNS: {
    // 價格區塊容器
    priceBlockSelector: 'div.left_tab',
    
    // 標題 CSS 類別 (用於識別報價類型標題)
    titleClasses: ['title_left', 'title_left2', 'title_left3'],
    
    // 價格數據特徵 (用於判斷是否有資料或需登入)
    // 匹配格式: >123.45< 或 >123.456< 或帶空格 >123.45 < 等
    // 修改: 支援整數、小數，以及價格範圍 (如 12.50-13.00 或 12.50~13.00)
    priceNumberPattern: />\s*\d+(?:\.\d+)?(?:\s*[-~]\s*\d+(?:\.\d+)?)?\s*</,
    
    // Last Update 格式
    lastUpdatePattern: /Last\s*Update[:\s]*([A-Z][a-z]{2}\.?\s*\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2})/i
  },
  
  // ========================================
  // 過濾規則 (用於排除非報價標題)
  // ========================================
  FILTER_RULES: {
    // 標題最小長度
    minTitleLength: 8,
    
    // 必須包含的關鍵字
    requiredKeyword: /Price/i,
    
    // 排除的模式 (產品規格連結)
    excludePatterns: [
      /^\w+\s*\d+\s*(Gb|GB|TB)$/i,  // 如 DDR4 4Gb, TLC 512Gb
      /^\w+\s*\d+x\d+/i              // 如 DDR4 2Gx8
    ]
  },

  // ========================================
  // 動態資料來源 (針對 AJAX 載入的區塊)
  // ========================================
  DYNAMIC_DATA_SOURCES: {
    'PCClientOEMSSD': {
      url: 'https://www.dramexchange.com/Home/HomePrice?Source=PCC',
      headers: ['Item', 'High', 'Low', 'Average', 'Change'],
      fieldMap: {
        'Item': 'Name',
        'High': 'show_hi',
        'Low': 'show_lo',
        'Average': 'show_avg',
        'Change': 'show_avg_change'
      }
    },
    'NationalContractDramDetail': {
      url: 'https://www.dramexchange.com/Home/HomePrice?Source=NationalDramContract',
      headers: ['Item', 'High', 'Low', 'Average', 'Change'],
      fieldMap: {
        'Item': 'show_name',
        'High': 'show_hi',
        'Low': 'show_lo',
        'Average': 'show_avg',
        'Change': 'show_avg_change'
      }
    },
    'NationalContractFlashDetail': {
      url: 'https://www.dramexchange.com/Home/HomePrice?Source=NationalFlashContract',
      headers: ['Item', 'High', 'Low', 'Average', 'Change'],
      fieldMap: {
        'Item': 'show_name',
        'High': 'show_hi',
        'Low': 'show_lo',
        'Average': 'show_avg',
        'Change': 'show_avg_change'
      }
    }
  }
};
