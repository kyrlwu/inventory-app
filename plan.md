# 條碼掃描邏輯實施計畫

## 1. 總體目標

修改庫存管理應用，使其能夠正確處理掃描或手動輸入的條碼。

**處理邏輯:**
1.  移除條碼中的連字號 (`-`)。
2.  忽略條碼中第一個空格之後的所有額外字符。
3.  所有輸入都應轉換為大寫。

## 2. 目標檔案

所有程式碼修改都將在 `script.js` 檔案中進行。

## 3. 詳細實施步驟

### 步驟 1: 創建一個通用的條碼格式化函式

在 `script.js` 中，新增一個名為 `formatBarcode` 的函式。這個函式將作為處理所有零件件號輸入的統一入口。

```javascript
function formatBarcode(barcode) {
    if (!barcode) {
        return '';
    }
    // 1. 移除第一個空格之後的所有內容
    let cleanedBarcode = barcode.split(' ')[0];
    // 2. 移除所有連字號
    cleanedBarcode = cleanedBarcode.replace(/-/g, '');
    // 3. 轉換為大寫
    return cleanedBarcode.toUpperCase();
}
```

### 步驟 2: 在掃描回呼中整合格式化邏輯

修改 `handleScanBarcode` 函式中的 `qrCodeSuccessCallback`，以使用新的 `formatBarcode` 函式。

**修改前:**
```javascript
const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    console.log(`Code matched = ${decodedText}`, decodedResult);
    
    // ... (省略部分程式碼)
    
    const targetEl = document.getElementById(targetInputId);
    targetEl.value = decodedText.toUpperCase(); // Convert to uppercase
    
    // ... (省略部分程式碼)
};
```

**修改後:**
```javascript
const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    console.log(`Code matched = ${decodedText}`, decodedResult);
    
    // ... (省略部分程式碼)
    
    const targetEl = document.getElementById(targetInputId);
    targetEl.value = formatBarcode(decodedText); // 使用新的格式化函式
    
    // ... (省略部分程式碼)
};
```

### 步驟 3: 在手動查詢中整合格式化邏輯

修改 `handleQuery` 函式，以確保手動輸入的零件件號也經過格式化處理。

**修改前:**
```javascript
async function handleQuery() {
    // ... (省略部分程式碼)
    
    } else if (selectedQueryType === 'byPartNo') {
        queryParams.cPartsIdn = document.getElementById('partsIdn').value;
    }

    // ... (省略部分程式碼)
}
```

**修改後:**
```javascript
async function handleQuery() {
    // ... (省略部分程式碼)
    
    } else if (selectedQueryType === 'byPartNo') {
        const rawPartNo = document.getElementById('partsIdn').value;
        queryParams.cPartsIdn = formatBarcode(rawPartNo);
        // (可選) 將格式化後的值更新回輸入框
        document.getElementById('partsIdn').value = queryParams.cPartsIdn;
    }

    // ... (省略部分程式碼)
}
```

### 步驟 4: (可選) 調整 API 模擬函式

為了保持程式碼的一致性，可以簡化 `api.fetchInventoryData` 函式中的邏輯，因為格式化步驟已經在 `handleQuery` 中完成。

**修改前:**
```javascript
fetchInventoryData: async (queryParams) => {
    // ... (省略部分程式碼)
    if (queryParams.cPartsIdn) {
        const partsIdn = queryParams.cPartsIdn.split(' ')[0].toUpperCase();
        filteredData = filteredData.filter(item => item.cPartsIdn === partsIdn);
    }
    // ... (省略部分程式碼)
},
```

**修改後:**
```javascript
fetchInventoryData: async (queryParams) => {
    // ... (省略部分程式碼)
    if (queryParams.cPartsIdn) {
        // 現在 cPartsIdn 已經是格式化後的版本
        filteredData = filteredData.filter(item => item.cPartsIdn.replace(/-/g, '') === queryParams.cPartsIdn);
    }
    // ... (省略部分程式碼)
},
```
**注意:** 由於 `mockInventoryData` 中的 `cPartsIdn` 包含連字號 (例如: `PART-A1`)，在比較時需要將其也進行格式化 (移除連字號)，以確保與無連字號的輸入匹配。

## 4. 總結

通過以上步驟，我們將能夠在 `script.js` 中有效地實現新的條碼處理邏輯，並確保掃描輸入和手動輸入的一致性。