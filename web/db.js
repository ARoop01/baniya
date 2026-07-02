// AuraFinance IndexedDB Client-Side Database

const DB_NAME = 'aura_finance_db';
const DB_VERSION = 2;

let dbInstance = null;

export const openDB = () => {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores with ID as keyPath
      if (!db.objectStoreNames.contains('expenses')) {
        db.createObjectStore('expenses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('budgets')) {
        db.createObjectStore('budgets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('recurring_rules')) {
        db.createObjectStore('recurring_rules', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('debts')) {
        db.createObjectStore('debts', { keyPath: 'id' });
      }
      // Metadata store for last sync timestamp, user profile, auth token
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });
};

// Generic CRUD operations
export const getRecord = async (storeName, id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const putRecord = async (storeName, record) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(record);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteRecord = async (storeName, id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllRecords = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Clear all databases (useful for logouts)
export const clearAllStores = async () => {
  const db = await openDB();
  const stores = ['expenses', 'categories', 'budgets', 'recurring_rules', 'metadata', 'debts'];
  const transaction = db.transaction(stores, 'readwrite');
  
  stores.forEach((storeName) => {
    transaction.objectStore(storeName).clear();
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Sync helpers: get all dirty (locally updated) items since last sync
export const getLocalChanges = async (lastSyncTime) => {
  const stores = ['expenses', 'categories', 'budgets', 'recurring_rules', 'debts'];
  const changes = {};

  const cutoff = lastSyncTime ? new Date(lastSyncTime).getTime() : 0;

  for (const storeName of stores) {
    const records = await getAllRecords(storeName);
    // Filter records where updated_at is newer than lastSyncTime
    changes[storeName] = records.filter((r) => {
      // Don't send default categories to the server
      if (storeName === 'categories' && r.is_default) return false;
      const updatedTime = new Date(r.updated_at).getTime();
      return updatedTime > cutoff;
    });
  }

  return changes;
};

// Apply server changes locally
export const applyServerChanges = async (serverChanges) => {
  const stores = ['expenses', 'categories', 'budgets', 'recurring_rules', 'debts'];

  for (const storeName of stores) {
    const list = serverChanges[storeName];
    if (!list || !Array.isArray(list)) continue;

    for (const serverRecord of list) {
      const localRecord = await getRecord(storeName, serverRecord.id);
      
      if (!localRecord) {
        // If soft deleted on server and we don't have it, skip
        if (serverRecord.is_deleted) continue;
        await putRecord(storeName, serverRecord);
      } else {
        // Compare timestamps
        const localTime = new Date(localRecord.updated_at).getTime();
        const serverTime = new Date(serverRecord.updated_at).getTime();

        if (serverTime >= localTime) {
          if (serverRecord.is_deleted) {
            // Delete physically if deleted on server to keep DB small, 
            // or just write with is_deleted = 1
            await deleteRecord(storeName, serverRecord.id);
          } else {
            await putRecord(storeName, serverRecord);
          }
        }
      }
    }
  }
};
