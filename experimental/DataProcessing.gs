/**
 * Experimental: Data processing utilities
 * This file contains experimental functions for data processing and transformation
 * Use with caution - these are under development
 */

/**
 * EXPERIMENTAL: Transforms CSV data to JSON
 * @param {string} csvData - CSV string data
 * @return {Array} Array of objects
 */
function csvToJson(csvData) {
  try {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const obj = {};
      
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      
      result.push(obj);
    }
    
    return result;
  } catch (error) {
    Logger.log(`CSV to JSON conversion error: ${error.message}`);
    return [];
  }
}

/**
 * EXPERIMENTAL: Transforms JSON to CSV
 * @param {Array} jsonData - Array of objects
 * @return {string} CSV string
 */
function jsonToCsv(jsonData) {
  try {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return '';
    }
    
    const headers = Object.keys(jsonData[0]);
    const csvLines = [headers.join(',')];
    
    jsonData.forEach(obj => {
      const values = headers.map(header => {
        const value = obj[header] || '';
        return typeof value === 'string' && value.includes(',') ? 
          `"${value}"` : value;
      });
      csvLines.push(values.join(','));
    });
    
    return csvLines.join('\n');
  } catch (error) {
    Logger.log(`JSON to CSV conversion error: ${error.message}`);
    return '';
  }
}

/**
 * EXPERIMENTAL: Filters data based on conditions
 * @param {Array} data - Array of objects to filter
 * @param {Object} conditions - Filter conditions
 * @return {Array} Filtered data
 */
function filterData(data, conditions) {
  return data.filter(item => {
    return Object.keys(conditions).every(key => {
      const condition = conditions[key];
      const value = item[key];
      
      if (typeof condition === 'function') {
        return condition(value);
      } else if (typeof condition === 'object' && condition.operator) {
        switch (condition.operator) {
          case '>': return value > condition.value;
          case '<': return value < condition.value;
          case '>=': return value >= condition.value;
          case '<=': return value <= condition.value;
          case '!=': return value !== condition.value;
          case 'contains': return String(value).includes(condition.value);
          default: return value === condition.value;
        }
      } else {
        return value === condition;
      }
    });
  });
}

/**
 * EXPERIMENTAL: Groups data by a specific key
 * @param {Array} data - Array of objects
 * @param {string} key - Key to group by
 * @return {Object} Grouped data
 */
function groupBy(data, key) {
  return data.reduce((acc, item) => {
    const groupKey = item[key];
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {});
}

/**
 * EXPERIMENTAL: Aggregates data with custom functions
 * @param {Array} data - Array of objects
 * @param {string} groupKey - Key to group by
 * @param {Object} aggregations - Aggregation functions
 * @return {Array} Aggregated data
 */
function aggregateData(data, groupKey, aggregations) {
  const grouped = groupBy(data, groupKey);
  const result = [];
  
  Object.keys(grouped).forEach(key => {
    const group = grouped[key];
    const aggregated = { [groupKey]: key };
    
    Object.keys(aggregations).forEach(aggKey => {
      const aggFunc = aggregations[aggKey];
      const values = group.map(item => item[aggKey]).filter(v => v !== undefined);
      
      if (typeof aggFunc === 'string') {
        switch (aggFunc.toLowerCase()) {
          case 'sum':
            aggregated[aggKey] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            aggregated[aggKey] = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'count':
            aggregated[aggKey] = values.length;
            break;
          case 'min':
            aggregated[aggKey] = Math.min(...values);
            break;
          case 'max':
            aggregated[aggKey] = Math.max(...values);
            break;
        }
      } else if (typeof aggFunc === 'function') {
        aggregated[aggKey] = aggFunc(values);
      }
    });
    
    result.push(aggregated);
  });
  
  return result;
}

/**
 * EXPERIMENTAL: Deduplicates data based on a key
 * @param {Array} data - Array of objects
 * @param {string} key - Key to deduplicate by
 * @return {Array} Deduplicated data
 */
function deduplicateData(data, key) {
  const seen = new Set();
  return data.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}
