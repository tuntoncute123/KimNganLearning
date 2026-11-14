import type { DocumentItem, DrawStroke } from '../types/document';

const DB_NAME = 'HoloTutor_Workspace_DB';
const DB_VERSION = 2;
const DOCUMENTS = 'teaching_documents';
const ANNOTATIONS = 'annotations';

export interface AnnotationRecord {
  key: string;
  documentId: string | null;
  strokes: DrawStroke[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DOCUMENTS)) {
        const store = db.createObjectStore(DOCUMENTS, { keyPath: 'id' });
        store.createIndex('lastOpenedAt', 'lastOpenedAt');
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains(ANNOTATIONS)) {
        const store = db.createObjectStore(ANNOTATIONS, { keyPath: 'key' });
        store.createIndex('documentId', 'documentId');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      reject(new Error('Vui lòng đóng các tab Kim Ngân Learning khác rồi tải lại để nâng cấp bộ nhớ.'));
      // A blocked request can still succeed after its caller has received the error.
      request.onsuccess = () => request.result.close();
    };
  });
}

// Resolve only after commit, and close connections on every completion/error path.
async function transact<T>(
  stores: string[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction, result: (value: T) => void) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction | undefined;
    let value: T;
    try {
      transaction = db.transaction(stores, mode);
      transaction.oncomplete = () => { db.close(); resolve(value); };
      transaction.onabort = () => {
        db.close();
        reject(transaction?.error || new Error('Giao dịch lưu trữ đã bị hủy.'));
      };
      run(transaction, (result) => { value = result; });
    } catch (error) {
      transaction?.abort();
      db.close();
      reject(error);
    }
  });
}

export function getAllDocuments(): Promise<DocumentItem[]> {
  return transact([DOCUMENTS], 'readonly', (tx, result) => {
    const request = tx.objectStore(DOCUMENTS).getAll();
    request.onsuccess = () => result((request.result as DocumentItem[]).sort((a, b) => a.createdAt - b.createdAt));
  });
}

export function getDocumentById(id: string): Promise<DocumentItem | null> {
  return transact([DOCUMENTS], 'readonly', (tx, result) => {
    const request = tx.objectStore(DOCUMENTS).get(id);
    request.onsuccess = () => result(request.result || null);
  });
}

export function saveDocument(document: DocumentItem): Promise<void> {
  return transact([DOCUMENTS], 'readwrite', (tx) => { tx.objectStore(DOCUMENTS).put(document); });
}

export function updateDocumentProgress(
  id: string,
  updates: Partial<Pick<DocumentItem, 'currentPage' | 'totalPages' | 'zoom' | 'rotation' | 'lastOpenedAt'>>,
): Promise<void> {
  return transact([DOCUMENTS], 'readwrite', (tx) => {
    const store = tx.objectStore(DOCUMENTS);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) store.put({ ...request.result, ...updates });
    };
  });
}

export function getAllAnnotations(): Promise<AnnotationRecord[]> {
  return transact([ANNOTATIONS], 'readonly', (tx, result) => {
    const request = tx.objectStore(ANNOTATIONS).getAll();
    request.onsuccess = () => result(request.result);
  });
}

export function saveAnnotations(record: AnnotationRecord): Promise<void> {
  // Include documents in this transaction so deleting a file cannot leave orphan drawings.
  return transact([DOCUMENTS, ANNOTATIONS], 'readwrite', (tx) => {
    const store = tx.objectStore(ANNOTATIONS);
    if (record.documentId === null) {
      store.put(record);
      return;
    }
    const request = tx.objectStore(DOCUMENTS).get(record.documentId);
    request.onsuccess = () => {
      if (request.result) store.put(record);
    };
  });
}

export function deleteDocument(id: string): Promise<void> {
  return transact([DOCUMENTS, ANNOTATIONS], 'readwrite', (tx) => {
    tx.objectStore(DOCUMENTS).delete(id);
    const request = tx.objectStore(ANNOTATIONS).index('documentId').openCursor(IDBKeyRange.only(id));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
  });
}

export function clearAllDocuments(): Promise<void> {
  return transact([DOCUMENTS, ANNOTATIONS], 'readwrite', (tx) => {
    tx.objectStore(DOCUMENTS).clear();
    tx.objectStore(ANNOTATIONS).clear();
  });
}
