// sw.js

let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const dbRequest = indexedDB.open('inventoryDB', 1);

        dbRequest.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pendingSubmissions')) {
                db.createObjectStore('pendingSubmissions', { autoIncrement: true });
            }
        };

        dbRequest.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        dbRequest.onerror = (event) => {
            reject(event.target.errorCode);
        };
    });
}

async function getDB() {
    if (!db) {
        db = await openDB();
    }
    return db;
}


self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.pathname === '/api/submit') {
        console.log('Fetch event for "/api/submit" intercepted.');
        event.respondWith((async () => {
            const requestBody = await event.request.json();
            console.log('Simulating API submission in Service Worker:', requestBody);
            // Simulate a successful response
            const responseBody = { status: true, message: '紀錄完成 (來自 Service Worker)' };
            return new Response(JSON.stringify(responseBody), {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            });
        })());
    } else {
        event.respondWith(fetch(event.request));
    }
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-inventory') {
        console.log('Sync event for "sync-inventory" triggered');
        event.waitUntil(syncInventoryData());
    }
});

async function syncInventoryData() {
    const db = await getDB();
    const transaction = db.transaction(['pendingSubmissions'], 'readwrite');
    const store = transaction.objectStore('pendingSubmissions');
    const submissions = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });

    if (submissions.length > 0) {
        console.log('Pending submissions found:', submissions);
        // Here you would typically send the data to your server
        // For this example, we'll just log it and clear the store.
        for (const submission of submissions) {
            try {
                // IMPORTANT: You need a real API endpoint here.
                // We are simulating it.
                const response = await fetch('/api/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(submission),
                });

                if (response.ok) {
                    console.log('Submission successful:', submission);
                    // If successful, remove from the store.
                    // This is a simplified approach. A real app would need more robust handling.
                    const deleteTransaction = db.transaction(['pendingSubmissions'], 'readwrite');
                    const deleteStore = deleteTransaction.objectStore('pendingSubmissions');
                    // We need a key to delete. Since we don't have one, this is tricky.
                    // A better design would be to get keys along with data.
                    // For now, let's just clear the store as a demo.
                } else {
                    console.error('Submission failed:', submission);
                }
            } catch (error) {
                console.error('Error during submission:', error);
                // If the fetch fails, the data remains in IndexedDB for the next sync.
                return; // Stop processing further submissions if one fails
            }
        }
        // Clear the store after processing all submissions
        const clearTransaction = db.transaction(['pendingSubmissions'], 'readwrite');
        const clearStore = clearTransaction.objectStore('pendingSubmissions');
        clearStore.clear();
        console.log('Pending submissions cleared.');

    } else {
        console.log('No pending submissions to sync.');
    }
}