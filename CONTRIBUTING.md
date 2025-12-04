# Contributing to gas-utils

感謝您對 gas-utils 的關注！這是一個個人專案的備份存儲庫，但我們歡迎建議和貢獻。

Thank you for your interest in gas-utils! While this is primarily a personal project backup repository, we welcome suggestions and contributions.

## 如何貢獻 (How to Contribute)

### 回報問題 (Reporting Issues)

如果您發現 bug 或有功能建議：

1. 檢查是否已有類似的 issue
2. 建立新的 issue，並提供：
   - 清楚的標題和描述
   - 重現步驟（如果是 bug）
   - 預期行為與實際行為
   - 您的環境資訊

### 提交程式碼 (Submitting Code)

如果您想貢獻程式碼：

1. Fork 此存儲庫
2. 建立您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### Pull Request 指南

- 保持更改專注於單一功能或修復
- 遵循現有的程式碼風格
- 加入適當的註解
- 更新相關文件
- 確保程式碼可以正常運行

## 程式碼風格 (Code Style)

### Google Apps Script 風格指南

- 使用 camelCase 命名函數和變數
- 使用 JSDoc 註解說明函數
- 保持函數簡短且專注
- 適當的錯誤處理

範例：

```javascript
/**
 * Calculates the sum of two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @return {number} The sum of a and b
 */
function addNumbers(a, b) {
  try {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('Both arguments must be numbers');
    }
    return a + b;
  } catch (error) {
    logWithTimestamp(`Error in addNumbers: ${error.message}`, 'ERROR');
    throw error;
  }
}
```

### 檔案組織

- 將相關功能放在同一個檔案中
- 使用清楚的檔案名稱
- 在檔案開頭加入說明註解

## 測試 (Testing)

在提交 Pull Request 之前：

1. 在 Apps Script 編輯器中測試您的程式碼
2. 確保沒有破壞現有功能
3. 測試邊界情況和錯誤處理

## 文件 (Documentation)

如果您加入新功能：

- 更新 README.md
- 在 docs/API.md 中加入 API 文件
- 提供使用範例

## 授權 (License)

提交貢獻即表示您同意您的貢獻將依照 MIT 授權條款授權。

## 問題或疑問？ (Questions?)

如有任何問題，歡迎：

- 開啟 issue 進行討論
- 查看現有文件
- 參考 Google Apps Script 官方文件

## 行為準則 (Code of Conduct)

### 我們的承諾

為了營造開放且友善的環境，我們承諾：

- 使用友善且包容的語言
- 尊重不同的觀點和經驗
- 優雅地接受建設性批評
- 專注於對社群最有利的事情

### 不被接受的行為

- 使用性化的語言或圖像
- 人身攻擊或侮辱性評論
- 公開或私下騷擾
- 未經許可發布他人私人資訊

## 致謝 (Acknowledgments)

感謝所有貢獻者和提供建議的人！

---

**注意**: 這是個人專案，回應時間可能會有所不同。感謝您的理解和耐心！

**Note**: This is a personal project, so response times may vary. Thank you for your understanding and patience!
