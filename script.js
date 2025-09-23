(function() {
    document.addEventListener('DOMContentLoaded', () => {
        // DOM Elements
        const inventoryDateEl = document.getElementById('inventoryDate');
        const warehouseIdEl = document.getElementById('warehouseId');

        // Set default values
        inventoryDateEl.value = '2025-09-25';
        warehouseIdEl.value = 'AH400';
        const checkDateAndWarehouseBtn = document.getElementById('checkDateAndWarehouse');
        const querySection = document.getElementById('query-section');
        const dataSection = document.getElementById('data-section');
        const actionSection = document.getElementById('action-section');
        const queryBtn = document.getElementById('queryBtn');
        const confirmBtn = document.getElementById('confirmBtn');
        const inventoryTableBody = document.querySelector('#inventoryTable tbody');
        const messageArea = document.getElementById('messageArea');
        let messageTimeout; // Variable to hold the timeout
        const scannerContainer = document.getElementById('scanner-container');
        const closeScannerBtn = document.getElementById('close-scanner');
        let html5QrCode;

        const dialogOverlay = document.getElementById('dialog-overlay');
        const dialogMessage = document.getElementById('dialog-message');
        const dialogCloseBtn = document.getElementById('dialog-close');

        // --- Mock Data ---
        const mockWarehouses = ['W01', 'W02', 'W03', 'AH400'];
        const mockInventoryData = [
            { cInvSNo: 'S001', cPartsIdn: 'PART-A1', cCName: '零件A', cBin: 'A01', nQtyAvailable: 100, nActualInvQty: null },
            { cInvSNo: 'S002', cPartsIdn: 'PART-B2', cCName: '零件B', cBin: 'A02', nQtyAvailable: 50, nActualInvQty: null },
            { cInvSNo: 'S003', cPartsIdn: 'PART-C3', cCName: '零件C', cBin: 'B01', nQtyAvailable: 200, nActualInvQty: null },
            { cInvSNo: 'S004', cPartsIdn: 'PART-D4', cCName: '零件D', cBin: 'B02', nQtyAvailable: 20, nActualInvQty: null },
            { cInvSNo: 'S005', cPartsIdn: 'PART-A1', cCName: '零件A', cBin: 'C01', nQtyAvailable: 30, nActualInvQty: null },
        ];

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

        // --- API Simulation ---
        const api = {
            checkWarehouse: async (warehouseId) => {
                console.log(`Checking warehouse: ${warehouseId}`);
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
                return warehouseId && mockWarehouses.includes(warehouseId.toUpperCase());
            },
            fetchInventoryData: async (queryParams) => {
                console.log('Fetching inventory data with params:', queryParams);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
                
                let filteredData = mockInventoryData;

                if (queryParams.cBinBegin && queryParams.cBinEnd) {
                    filteredData = filteredData.filter(item => item.cBin >= queryParams.cBinBegin.toUpperCase() && item.cBin <= queryParams.cBinEnd.toUpperCase());
                }
                if (queryParams.cInvNoBegin && queryParams.cInvNoEnd) {
                     filteredData = filteredData.filter(item => item.cInvSNo >= queryParams.cInvNoBegin.toUpperCase() && item.cInvSNo <= queryParams.cInvNoEnd.toUpperCase());
                }
                if (queryParams.cPartsIdn) {
                    // 現在 cPartsIdn 已經是格式化後的版本
                    filteredData = filteredData.filter(item => item.cPartsIdn.replace(/-/g, '') === queryParams.cPartsIdn);
                }
                
                return filteredData;
            },
            submitInventory: async (data) => {
                console.log('Submitting inventory data:', data);
                await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
                if (data.inventoryData && data.inventoryData.length > 0) {
                    return { status: true, message: '紀錄完成' };
                }
                return { status: false, message: '提交失敗，無有效數據' };
            }
        };

        // --- Event Listeners ---
        checkDateAndWarehouseBtn.addEventListener('click', handleCheckDateAndWarehouse);
        queryBtn.addEventListener('click', handleQuery);
        confirmBtn.addEventListener('click', handleConfirm);
        document.getElementById('scanBarcode').addEventListener('click', () => handleScanBarcode('partsIdn'));
        document.getElementById('scanBinBegin').addEventListener('click', () => handleScanBarcode('binBegin'));
        document.getElementById('scanBinEnd').addEventListener('click', () => handleScanBarcode('binEnd'));
        closeScannerBtn.addEventListener('click', stopScan);

        document.querySelectorAll('input[name="queryType"]').forEach(radio => {
            radio.addEventListener('change', handleQueryTypeChange);
        });

        // --- Auto-uppercase ---
        ['warehouseId', 'binBegin', 'binEnd', 'invNoBegin', 'invNoEnd', 'partsIdn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    el.value = el.value.toUpperCase();
                });
            }
        });

        // --- Functions ---

        function handleQueryTypeChange(event) {
            const selectedType = event.target.value;
            const queryOptions = document.querySelectorAll('.query-option');

            queryOptions.forEach(option => {
                const optionType = option.dataset.queryType;
                const inputs = option.querySelectorAll('input');

                if (optionType === selectedType) {
                    option.classList.remove('hidden');
                    inputs.forEach(input => input.disabled = false);
                } else {
                    option.classList.add('hidden');
                    inputs.forEach(input => {
                        input.disabled = true;
                        input.value = ''; // Clear value when hiding
                    });
                }
            });
        }
        dialogCloseBtn.addEventListener('click', () => {
            dialogOverlay.classList.add('hidden');
        });

        async function handleCheckDateAndWarehouse() {
            console.log('handleCheckDateAndWarehouse triggered');
            const date = inventoryDateEl.value;
            const warehouseId = warehouseIdEl.value;

            if (!date || !warehouseId) {
                showMessage('error', '請填寫盤點日期和盤點庫位');
                return;
            }

            console.log('Inputs are valid, proceeding with API call');
            checkDateAndWarehouseBtn.textContent = '檢查中...';
            checkDateAndWarehouseBtn.disabled = true;

            const isValid = await api.checkWarehouse(warehouseId);
            console.log('API check result:', isValid);

            if (isValid) {
                console.log('Warehouse is valid, updating UI');
                inventoryDateEl.disabled = true;
                warehouseIdEl.disabled = true;
                checkDateAndWarehouseBtn.style.display = 'none';
                checkDateAndWarehouseBtn.disabled = true;
                querySection.classList.remove('hidden');
                showMessage('success', '日期與庫位驗證成功！');
                return;
            } else {
                console.log('Warehouse is invalid, showing error');
                showMessage('error', '盤點庫位不正確或不存在');
                checkDateAndWarehouseBtn.textContent = '檢查庫存';
                checkDateAndWarehouseBtn.disabled = false;
            }
        }

        async function handleQuery() {
            const selectedQueryType = document.querySelector('input[name="queryType"]:checked').value;
            const queryParams = {};

            if (selectedQueryType === 'byBin') {
                queryParams.cBinBegin = document.getElementById('binBegin').value;
                queryParams.cBinEnd = document.getElementById('binEnd').value;
                if (!queryParams.cBinBegin || !queryParams.cBinEnd) {
                    showMessage('error', '請輸入完整的查詢條件');
                    return;
                }
            } else if (selectedQueryType === 'byInvNo') {
                queryParams.cInvNoBegin = document.getElementById('invNoBegin').value;
                queryParams.cInvNoEnd = document.getElementById('invNoEnd').value;
                if (!queryParams.cInvNoBegin || !queryParams.cInvNoEnd) {
                    showMessage('error', '請輸入完整的查詢條件');
                    return;
                }
            } else if (selectedQueryType === 'byPartNo') {
                const rawPartNo = document.getElementById('partsIdn').value;
                queryParams.cPartsIdn = formatBarcode(rawPartNo);
                // (可選) 將格式化後的值更新回輸入框
                document.getElementById('partsIdn').value = queryParams.cPartsIdn;
            }

            // Basic validation to ensure at least one query method is used
            const hasQueryParams = Object.values(queryParams).some(val => val !== '');
            if (!hasQueryParams) {
                showMessage('error', '請至少提供一組查詢條件');
                return;
            }

            queryBtn.textContent = '查詢中...';
            queryBtn.disabled = true;
            
            const data = await api.fetchInventoryData(queryParams);
            
            if (data && data.length > 0) {
                populateTable(data);
                dataSection.classList.remove('hidden');
                actionSection.classList.remove('hidden');
                showMessage('success', `查詢到 ${data.length} 筆資料`);
            } else {
                inventoryTableBody.innerHTML = '';
                dataSection.classList.add('hidden');
                actionSection.classList.add('hidden');
                showMessage('info', '查無資料');
            }

            queryBtn.textContent = '查詢';
            queryBtn.disabled = false;
        }

        function populateTable(data) {
            inventoryTableBody.innerHTML = ''; // Clear existing data
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="盤點編號">${item.cInvSNo}</td>
                    <td data-label="零件件號">${item.cPartsIdn}</td>
                    <td data-label="品名">${item.cCName}</td>
                    <td data-label="月結堪用量">${item.nQtyAvailable}</td>
                    <td data-label="本次盤點數"><input type="number" class="actual-qty" data-inv-sno="${item.cInvSNo}" data-origin-qty="${item.nActualInvQty || ''}" value="" min="0"></td>
                `;
                inventoryTableBody.appendChild(row);
            });
        }

        async function handleConfirm() {
            // 1. 增加確認對話框
            if (!confirm('若無輸入盤點數，將以「月結堪用量」替代。確定要提交嗎？')) {
                return; // 如果用戶取消，則終止
            }

            confirmBtn.textContent = '提交中...';
            confirmBtn.disabled = true;

            const rows = inventoryTableBody.querySelectorAll('tr');
            const inventoryData = []; // 用於存放待上傳的數據

            rows.forEach(row => {
                const actualQtyEl = row.querySelector('.actual-qty');
                const userInputQty = actualQtyEl.value;

                // 2. 只處理使用者手動輸入了數值的項目
                if (userInputQty !== '' && userInputQty !== null) {
                    const invSNo = actualQtyEl.dataset.invSno;
                    const originQty = actualQtyEl.dataset.originQty; // 原始盤點數
                    const newQty = parseInt(userInputQty, 10);

                    // 檢查轉換後的數字是否有效
                    if (isNaN(newQty)) {
                        // 雖然 input type="number" 會做基本防禦，但還是加上以防萬一
                        console.warn(`盤點編號 ${invSNo} 的輸入值 "${userInputQty}" 不是一個有效的數字，已忽略。`);
                        return; // 繼續處理下一行
                    }

                    // 3. 只有當新盤點數與原始值不同時，才加入待上傳陣列
                    if (String(newQty) !== String(originQty)) {
                        inventoryData.push({
                            cInvSNo: invSNo,
                            cPartsIdn: row.cells[1].textContent.trim(),
                            nActualInvQty: newQty,
                        });
                    }
                }
                // 如果 userInputQty 是空的，則不做任何事
            });

            // 4. 打印調試信息並暫停實際的上傳操作
            console.log('待上傳的數據:', inventoryData);

            // const submissionData = {
            //     dInventoryDate: inventoryDateEl.value,
            //     cWhIdn: warehouseIdEl.value,
            //     inventoryData: inventoryData
            // };
            //
            // const result = await api.submitInventory(submissionData);
            //
            // if (result.status) {
            //     showMessage('success', result.message);
            //     resetScreen();
            // } else {
            //     showMessage('error', result.message);
            // }

            // 暫時直接顯示成功，因為我們跳過了上傳
            // showMessage('info', '數據已在控制台打印，未執行上傳。');
            // confirmBtn.textContent = '確認';
            // confirmBtn.disabled = false;
        }
        
        function showMessage(type, text) {
            const dialogBox = document.getElementById('dialog-box');
            
            dialogMessage.textContent = text;
            dialogBox.className = `message ${type}`; // Apply class for color
            dialogOverlay.classList.remove('hidden');
            dialogCloseBtn.className = `message ${type}`; // Apply class for color

            clearTimeout(messageTimeout); // Clear any existing timeout

            if (type === 'success' || type === 'info') {
                messageTimeout = setTimeout(() => {
                    dialogOverlay.classList.add('hidden');
                }, 2000);
            }
            // For 'error', no timeout is set, so it requires manual closing.
        }
        
        function resetScreen() {
            inventoryTableBody.innerHTML = '';
            dataSection.classList.add('hidden');
            actionSection.classList.add('hidden');
            
            // Clear query fields
            document.getElementById('binBegin').value = '';
            document.getElementById('binEnd').value = '';
            document.getElementById('invNoBegin').value = '';
            document.getElementById('invNoEnd').value = '';
            document.getElementById('partsIdn').value = '';
        }

        function handleScanBarcode(targetInputId) {
            scannerContainer.classList.remove('hidden');
            
            // Lazy-load the scanner
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("reader");
            }

            const qrCodeSuccessCallback = (decodedText, decodedResult) => {
                console.log(`Code matched = ${decodedText}`, decodedResult);
                
                if (targetInputId === 'partsIdn') {
                    // Clear other query fields
                    document.getElementById('binBegin').value = '';
                    document.getElementById('binEnd').value = '';
                    document.getElementById('invNoBegin').value = '';
                    document.getElementById('invNoEnd').value = '';
                }
                
                const targetEl = document.getElementById(targetInputId);
                targetEl.value = formatBarcode(decodedText); // 使用新的格式化函式
                
                stopScan();

                // Automatically trigger query for partsIdn
                if (targetInputId === 'partsIdn') {
                    handleQuery();
                }
            };

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: false
                }
            };

            // Start scanning
            html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
                .catch(err => {
                    console.error("Unable to start scanning.", err);
                    showMessage('error', '無法啟動相機，請確認授權。');
                    stopScan();
                });
        }

        function stopScan() {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    console.log("QR Code scanning stopped.");
                }).catch(err => {
                    console.error("Failed to stop scanning.", err);
                });
            }
            scannerContainer.classList.add('hidden');
        }
    });
})();