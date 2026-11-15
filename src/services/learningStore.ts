import { emptyLearningData, type LearningData } from '../types/learning';

// Separate database: teaching documents and their existing migrations stay independent.
const DATABASE = 'KimNgan_Learning_DB';
const STORE = 'learning';
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Hãy đóng các tab khác rồi thử lại.'));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

// Read-modify-write inside ONE transaction prevents lost updates across browser tabs.
export async function learningTransaction(change?: (data: LearningData) => void): Promise<LearningData> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, change ? 'readwrite' : 'readonly');
    let next: LearningData;
    let failure: unknown;
    const store = tx.objectStore(STORE);
    const request = store.get('state');
    request.onsuccess = () => {
      try {
        next = request.result ?? emptyLearningData();
        if (next.version !== 1) throw new Error('Phiên bản dữ liệu lớp học chưa được hỗ trợ.');
        if (change) { change(next); store.put(next, 'state'); }
      } catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => { db.close(); resolve(next); };
    tx.onabort = () => {
      db.close();
      reject(failure ?? tx.error ?? new Error('Không thể lưu dữ liệu lớp học. Kiểm tra bộ nhớ rồi thử lại.'));
    };
  });
}
