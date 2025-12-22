/**
 * LINE Messaging API 輔助工具
 * 提供設定檢查、測試發送、廣播控制等功能
 * 
 * 主要函數:
 * - checkLineConfig()           檢查當前配置狀態
 * - getLineFollowerIds()        取得所有追蹤者的 User/Group ID
 * - testSendLineMessage()       測試 Push API (個人/群組)
 * - testSendBroadcastMessage()  測試 Broadcast API (廣播)
 * - enableBroadcastMode()       啟用廣播模式
 * - disableBroadcastMode()      關閉廣播模式
 */

// ==================== 配置檢查 ====================

/**
 * 檢查並顯示目前的 LINE API 配置狀態
 * 用途: 快速了解已啟用哪些發送模式
 */
function checkLineConfig() {
  var props = PropertiesService.getScriptProperties();
  var accessToken = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  var userId = props.getProperty('LINE_USER_ID');
  var groupId = props.getProperty('LINE_GROUP_ID');
  var useBroadcast = props.getProperty('USE_BROADCAST_MODE') === 'true';
  
  Logger.log('📋 LINE Messaging API 設定狀態:');
  Logger.log('');
  Logger.log('✓ Channel Access Token: ' + (accessToken ? '已設定 (' + accessToken.substring(0, 20) + '...)' : '❌ 未設定'));
  Logger.log('');
  Logger.log('📤 發送模式 (可同時啟用多種):');
  Logger.log('  • GROUP:     ' + (groupId ? '✅ 已啟用 (' + groupId.substring(0, 12) + '...)' : '❌ 未啟用'));
  Logger.log('  • USER:      ' + (userId ? '✅ 已啟用 (' + userId.substring(0, 12) + '...)' : '❌ 未啟用'));
  Logger.log('  • BROADCAST: ' + (useBroadcast ? '✅ 已啟用 (廣播給所有好友)' : '❌ 未啟用'));
  Logger.log('');
  
  if (!accessToken) {
    Logger.log('⚠️ 請完成以下設定步驟:');
    Logger.log('1. 到 LINE Developers Console 取得 Channel Access Token');
    Logger.log('2. 在「專案設定」→「指令碼屬性」中設定 LINE_CHANNEL_ACCESS_TOKEN');
    return;
  }
  
  if (!userId && !groupId && !useBroadcast) {
    Logger.log('⚠️ 請至少啟用一種發送模式:');
    Logger.log('');
    Logger.log('👥 GROUP 模式 (發送到指定群組):');
    Logger.log('  1. 將機器人加入 LINE 群組');
    Logger.log('  2. 執行 getLineFollowerIds() 取得 Group ID');
    Logger.log('  3. 設定 LINE_GROUP_ID');
    Logger.log('');
    Logger.log('👤 USER 模式 (發送到指定個人):');
    Logger.log('  1. 用 LINE 掃描 QR Code 加入機器人為好友');
    Logger.log('  2. 執行 getLineFollowerIds() 取得 User ID');
    Logger.log('  3. 設定 LINE_USER_ID');
    Logger.log('');
    Logger.log('📡 BROADCAST 模式 (廣播給所有好友):');
    Logger.log('  1. 執行 enableBroadcastMode() 啟用');
    Logger.log('  2. 或手動設定 USE_BROADCAST_MODE=true');
    Logger.log('');
    Logger.log('🔄 可同時啟用多種模式，例如: GROUP + BROADCAST');
  } else {
    var enabledModes = [];
    if (groupId) enabledModes.push('GROUP');
    if (userId) enabledModes.push('USER');
    if (useBroadcast) enabledModes.push('BROADCAST');
    
    Logger.log('✅ 設定完成！目前啟用: ' + enabledModes.join(' + '));
    Logger.log('');
    Logger.log('測試函數:');
    if (userId || groupId) Logger.log('  • testSendLineMessage() - 測試 Push API');
    if (useBroadcast) Logger.log('  • testSendBroadcastMessage() - 測試 Broadcast API');
  }
}

// ==================== User/Group ID 查詢 ====================

/**
 * 取得所有加入官方帳號的追蹤者 ID (User ID / Group ID)
 * 用途: 用於設定 LINE_USER_ID 或 LINE_GROUP_ID
 * 執行後在「執行日誌」查看結果
 */
function getLineFollowerIds() {
  var accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  
  if (!accessToken) {
    Logger.log('❌ LINE_CHANNEL_ACCESS_TOKEN 未設定');
    Logger.log('請先到「專案設定」→「指令碼屬性」中設定 LINE_CHANNEL_ACCESS_TOKEN');
    return;
  }
  
  var url = 'https://api.line.me/v2/bot/followers/ids';
  var options = {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    
    if (code === 200) {
      var result = JSON.parse(response.getContentText());
      Logger.log('✅ 成功取得追蹤者清單:');
      Logger.log(JSON.stringify(result, null, 2));
      
      if (result.userIds && result.userIds.length > 0) {
        Logger.log('');
        Logger.log('📝 請複製以下 ID 並設定到 Script Properties:');
        result.userIds.forEach(function(id, index) {
          var idType = id.startsWith('U') ? '(User ID)' : id.startsWith('C') ? '(Group ID)' : '';
          Logger.log((index + 1) + '. ' + id + ' ' + idType);
        });
      } else {
        Logger.log('');
        Logger.log('⚠️ 目前沒有任何用戶加入官方帳號');
        Logger.log('請先用 LINE 掃描 QR Code 加入機器人為好友');
      }
    } else {
      Logger.log('❌ 取得追蹤者失敗: HTTP ' + code);
      Logger.log(response.getContentText());
    }
  } catch (e) {
    Logger.log('❌ 發生錯誤: ' + e.toString());
  }
}

// ==================== Push API 測試 ====================

/**
 * 測試發送訊息 (Push API)
 * 用途: 驗證 USER_ID 或 GROUP_ID 設定是否正確
 */
function testSendLineMessage() {
  var props = PropertiesService.getScriptProperties();
  var accessToken = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  var userId = props.getProperty('LINE_USER_ID');
  var groupId = props.getProperty('LINE_GROUP_ID');
  
  if (!accessToken) {
    Logger.log('❌ LINE_CHANNEL_ACCESS_TOKEN 未設定');
    return;
  }
  
  if (!userId && !groupId) {
    Logger.log('❌ LINE_USER_ID 或 LINE_GROUP_ID 至少需設定一個');
    Logger.log('請先執行 getLineFollowerIds() 取得 ID');
    return;
  }
  
  var testMessage = '🧪 Push API 測試訊息\n\n' +
                    '這是來自 ETF Scraper 的測試訊息。\n' +
                    '如果您收到此訊息，表示 Push API 設定成功！\n\n' + 
                    '⏰ 時間: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  
  var url = 'https://api.line.me/v2/bot/message/push';
  var successCount = 0;
  var failCount = 0;
  
  // 測試發送到 User
  if (userId) {
    Logger.log('📤 測試發送到 USER: ' + userId.substring(0, 12) + '...');
    if (sendTestMessage(url, accessToken, userId, testMessage)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  // 測試發送到 Group
  if (groupId) {
    Logger.log('📤 測試發送到 GROUP: ' + groupId.substring(0, 12) + '...');
    if (sendTestMessage(url, accessToken, groupId, testMessage)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  Logger.log('');
  Logger.log('測試完成: 成功 ' + successCount + '，失敗 ' + failCount);
}

/**
 * 內部函數: 發送測試訊息到指定接收者
 */
function sendTestMessage(url, accessToken, recipientId, message) {
  var payload = {
    to: recipientId,
    messages: [{ type: 'text', text: message }]
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
      Logger.log('  ✅ 發送成功！請檢查 LINE 是否收到訊息');
      return true;
    } else {
      Logger.log('  ❌ 發送失敗: HTTP ' + code);
      Logger.log('  ' + response.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log('  ❌ 發生錯誤: ' + e.toString());
    return false;
  }
}

// ==================== Broadcast API 測試 ====================

/**
 * 顯示目前的 LINE API 設定狀態
 */
function checkLineConfig() {
  var props = PropertiesService.getScriptProperties();
  var accessToken = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  var userId = props.getProperty('LINE_USER_ID');
  var groupId = props.getProperty('LINE_GROUP_ID');
  var useBroadcast = props.getProperty('USE_BROADCAST_MODE') === 'true';
  
  Logger.log('📋 LINE Messaging API 設定狀態:');
  Logger.log('');
  Logger.log('✓ Channel Access Token: ' + (accessToken ? '已設定 (' + accessToken.substring(0, 20) + '...)' : '❌ 未設定'));
  Logger.log('');
  Logger.log('📤 發送模式 (可同時啟用多種):');
  Logger.log('  • GROUP:     ' + (groupId ? '✅ 已啟用 (' + groupId.substring(0, 12) + '...)' : '❌ 未啟用'));
  Logger.log('  • USER:      ' + (userId ? '✅ 已啟用 (' + userId.substring(0, 12) + '...)' : '❌ 未啟用'));
  Logger.log('  • BROADCAST: ' + (useBroadcast ? '✅ 已啟用 (廣播給所有好友)' : '❌ 未啟用'));
  Logger.log('');
  
  if (!accessToken) {
    Logger.log('⚠️ 請完成以下設定步驟:');
    Logger.log('1. 到 LINE Developers Console 取得 Channel Access Token');
    Logger.log('2. 在「專案設定」→「指令碼屬性」中設定 LINE_CHANNEL_ACCESS_TOKEN');
    return;
  }
  
  if (!userId && !groupId && !useBroadcast) {
    Logger.log('⚠️ 請至少啟用一種發送模式:');
    Logger.log('');
    Logger.log('👥 GROUP 模式 (發送到指定群組):');
    Logger.log('  1. 將機器人加入 LINE 群組');
    Logger.log('  2. 執行 getLineFollowerIds() 取得 Group ID');
    Logger.log('  3. 設定 LINE_GROUP_ID');
    Logger.log('');
    Logger.log('👤 USER 模式 (發送到指定個人):');
    Logger.log('  1. 用 LINE 掃描 QR Code 加入機器人為好友');
    Logger.log('  2. 執行 getLineFollowerIds() 取得 User ID');
    Logger.log('  3. 設定 LINE_USER_ID');
    Logger.log('');
    Logger.log('📡 BROADCAST 模式 (廣播給所有好友):');
    Logger.log('  1. 執行 enableBroadcastMode() 啟用');
    Logger.log('  2. 或手動設定 USE_BROADCAST_MODE=true');
    Logger.log('');
    Logger.log('🔄 可同時啟用多種模式，例如: GROUP + BROADCAST');
  } else {
    var enabledModes = [];
    if (groupId) enabledModes.push('GROUP');
    if (userId) enabledModes.push('USER');
    if (useBroadcast) enabledModes.push('BROADCAST');
    
    Logger.log('✅ 設定完成！目前啟用: ' + enabledModes.join(' + '));
    Logger.log('');
    Logger.log('測試函數:');
    if (userId) Logger.log('  • testSendLineMessage() - 測試 Push API (個人/群組)');
    if (useBroadcast) Logger.log('  • testSendBroadcastMessage() - 測試 Broadcast API');
  }
}

/**
 * 測試廣播訊息 (Broadcast API)
 * 用途: 驗證 Broadcast 模式是否正確
 * 注意: 所有加入好友的用戶都會收到此測試訊息
 */
function testSendBroadcastMessage() {
  var accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  
  if (!accessToken) {
    Logger.log('❌ LINE_CHANNEL_ACCESS_TOKEN 未設定');
    return;
  }
  
  var testMessage = '📡 Broadcast API 測試訊息\n\n' +
                    '這是來自 ETF Scraper 的廣播測試訊息。\n' +
                    '所有加入好友的用戶都會收到此訊息！\n\n' + 
                    '⏰ 時間: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  
  var url = 'https://api.line.me/v2/bot/message/broadcast';
  var payload = {
    messages: [{ type: 'text', text: testMessage }]
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
    Logger.log('📡 準備廣播訊息給所有好友...');
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    
    if (code === 200) {
      Logger.log('✅ Broadcast 訊息發送成功！');
      Logger.log('所有加入好友的用戶都會收到訊息');
      Logger.log('請檢查 LINE 是否收到訊息');
    } else {
      Logger.log('❌ Broadcast 訊息發送失敗: HTTP ' + code);
      Logger.log(response.getContentText());
    }
  } catch (e) {
    Logger.log('❌ 發生錯誤: ' + e.toString());
  }
}

// ==================== 廣播模式控制 ====================

/**
 * 啟用 Broadcast 模式
 * 執行後 runDailyJob 會使用 Broadcast API 廣播訊息給所有好友
 * 注意: 可與 GROUP/USER 模式同時啟用，實現多目標發送
 */
function enableBroadcastMode() {
  PropertiesService.getScriptProperties().setProperty('USE_BROADCAST_MODE', 'true');
  
  Logger.log('✅ Broadcast 模式已啟用');
  Logger.log('');
  Logger.log('📡 runDailyJob 現在會廣播訊息給所有加入好友的用戶');
  Logger.log('🔄 如果同時設定了 GROUP_ID 或 USER_ID，將會一併發送');
  Logger.log('');
  Logger.log('建議執行 testSendBroadcastMessage() 測試');
}

/**
 * 關閉 Broadcast 模式
 * 執行後 runDailyJob 將不再使用 Broadcast API
 * 但如果設定了 GROUP_ID 或 USER_ID，仍會使用 Push API 發送
 */
function disableBroadcastMode() {
  PropertiesService.getScriptProperties().setProperty('USE_BROADCAST_MODE', 'false');
  
  Logger.log('✅ Broadcast 模式已關閉');
  Logger.log('');
  Logger.log('🚫 不再廣播訊息給所有好友');
  Logger.log('📤 如果設定了 GROUP_ID 或 USER_ID，仍會使用 Push API 發送');
}
