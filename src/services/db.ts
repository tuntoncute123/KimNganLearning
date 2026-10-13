import type { DocumentItem } from '../types/document';

const DB_NAME = 'HoloTutor_Workspace_DB';
const DB_VERSION = 1;
const STORE_NAME = 'teaching_documents';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('lastOpenedAt', 'lastOpenedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`Không thể mở IndexedDB: ${request.error?.message}`));
    };
  });
}

export async function getAllDocuments(): Promise<DocumentItem[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const docs = request.result as DocumentItem[];
      // Sắp xếp theo thứ tự tạo hoặc mở gần nhất
      docs.sort((a, b) => a.createdAt - b.createdAt);
      resolve(docs);
    };

    request.onerror = () => {
      reject(new Error(`Lỗi khi lấy danh sách tài liệu: ${request.error?.message}`));
    };
  });
}

export async function getDocumentById(id: string): Promise<DocumentItem | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve((request.result as DocumentItem) || null);
    };

    request.onerror = () => {
      reject(new Error(`Lỗi khi lấy tài liệu ${id}: ${request.error?.message}`));
    };
  });
}

export async function saveDocument(document: DocumentItem): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(document);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Lỗi khi lưu tài liệu: ${request.error?.message}`));
    };
  });
}

export async function updateDocumentProgress(
  id: string,
  updates: Partial<Pick<DocumentItem, 'currentPage' | 'zoom' | 'rotation' | 'lastOpenedAt'>>
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result as DocumentItem | undefined;
      if (!existing) {
        resolve();
        return;
      }
      const updated: DocumentItem = {
        ...existing,
        ...updates,
      };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Lỗi khi xóa tài liệu: ${request.error?.message}`));
    };
  });
}

export async function clearAllDocuments(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Lỗi khi dọn sạch IndexedDB: ${request.error?.message}`));
    };
  });
}
