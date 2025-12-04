/**
 * Experimental: API integration utilities
 * This file contains experimental functions for integrating with external APIs
 * Use with caution - these are under development
 */

/**
 * EXPERIMENTAL: Makes a generic HTTP request
 * @param {string} url - The URL to request
 * @param {Object} options - Request options (method, headers, payload, etc.)
 * @return {Object} Response object
 */
function makeHttpRequest(url, options = {}) {
  try {
    const defaultOptions = {
      method: 'GET',
      contentType: 'application/json',
      muteHttpExceptions: true
    };
    
    const requestOptions = Object.assign({}, defaultOptions, options);
    
    if (requestOptions.payload && typeof requestOptions.payload === 'object') {
      requestOptions.payload = JSON.stringify(requestOptions.payload);
    }
    
    const response = UrlFetchApp.fetch(url, requestOptions);
    const statusCode = response.getResponseCode();
    const content = response.getContentText();
    
    return {
      statusCode: statusCode,
      success: statusCode >= 200 && statusCode < 300,
      data: content ? JSON.parse(content) : null,
      headers: response.getHeaders()
    };
  } catch (error) {
    Logger.log(`HTTP request error: ${error.message}`);
    return {
      statusCode: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * EXPERIMENTAL: Fetches data from a REST API with pagination
 * @param {string} baseUrl - The base URL of the API
 * @param {Object} params - Query parameters
 * @param {number} maxPages - Maximum number of pages to fetch
 * @return {Array} Combined data from all pages
 */
function fetchPaginatedData(baseUrl, params = {}, maxPages = 10) {
  const allData = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore && page <= maxPages) {
    const pageParams = Object.assign({}, params, { page: page });
    const queryString = Object.keys(pageParams)
      .map(key => `${key}=${encodeURIComponent(pageParams[key])}`)
      .join('&');
    
    const url = `${baseUrl}?${queryString}`;
    const response = makeHttpRequest(url);
    
    if (!response.success) {
      Logger.log(`Failed to fetch page ${page}`);
      break;
    }
    
    const pageData = response.data;
    
    if (Array.isArray(pageData) && pageData.length > 0) {
      allData.push(...pageData);
      page++;
    } else {
      hasMore = false;
    }
    
    // Rate limiting
    Utilities.sleep(1000);
  }
  
  Logger.log(`Fetched ${allData.length} items across ${page - 1} pages`);
  return allData;
}

/**
 * EXPERIMENTAL: Webhook handler for external services
 * @param {Object} e - The event object from doPost
 * @return {Object} Response object
 */
function handleWebhook(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    Logger.log('Webhook received:', JSON.stringify(payload));
    
    // Process webhook data
    // Example: Update a spreadsheet based on webhook data
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`Webhook error: ${error.message}`);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * EXPERIMENTAL: Rate-limited API client
 * @param {string} url - The URL to request
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} retryDelay - Delay between retries in milliseconds
 * @return {Object} Response object
 */
function rateLimitedRequest(url, maxRetries = 3, retryDelay = 2000) {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      const response = makeHttpRequest(url);
      
      if (response.success) {
        return response;
      }
      
      if (response.statusCode === 429) {
        Logger.log(`Rate limited, retrying in ${retryDelay}ms...`);
        Utilities.sleep(retryDelay);
        attempts++;
        retryDelay *= 2; // Exponential backoff
      } else {
        return response;
      }
    } catch (error) {
      Logger.log(`Request attempt ${attempts + 1} failed: ${error.message}`);
      attempts++;
      
      if (attempts < maxRetries) {
        Utilities.sleep(retryDelay);
      }
    }
  }
  
  return {
    success: false,
    error: 'Max retries exceeded'
  };
}
