# 盤點系統開發計畫

## 功能

- [x] 初始頁面，包含盤點日期和庫位輸入
- [x] 檢查日期與庫位是否存在
- [ ] 根據不同條件查詢盤點資料 (儲位、盤點單號、料號)
- [ ] 顯示查詢結果
- [ ] 掃描條碼功能
- [ ] 輸入實際盤點數量
- [ ] 提交盤點資料

## 變更紀錄

- 2025-09-24: 修正 `script.js` 中 `handleCheckDateAndWarehouse` 函式的驗證邏輯錯誤，將 `isValid === 'true'` 修改為 `isValid === true`。
- 2025-09-24: 調整 `showMessage` 函式：
    - 當訊息類型為 'success' 或 'info' 時，隱藏「關閉」按鈕。
    - 將 'success' 和 'info' 訊息的顯示時間從 2000ms 縮短為 500ms。
- 2025-09-24: 在 `index.html` 中，為 `dialog-close` 按鈕添加 `type="button"` 屬性，以防止意外的表單提交。