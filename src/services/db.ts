import type { AnnotationBasis, DocumentItem, DocumentMetadata, DrawStroke } from '../types/document';

const DB_NAME = 'HoloTutor_Workspace_DB';
const DB_VERSION = 3;
const DOCUMENTS = 'teaching_documents';
const CONTENTS = 'document_contents';
const ANNOTATIONS = 'annotations';
const ALL_STORES = [DOCUMENTS, CONTENTS, ANNOTATIONS];

export interface AnnotationRecord {
  key: string;
  documentId: string | null;
  strokes: DrawStroke[];
  basis?: AnnotationBasis;
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
      if (!db.objectStoreNames.contains(CONTENTS)) {
        const contents = db.createObjectStore(CONTENTS, { keyPath: 'id' });
        const drawings = request.transaction!.objectStore(ANNOTATIONS).openCursor();
        drawings.onsuccess = () => {
          const cursor = drawings.result;
          if (!cursor) return;
          const record = cursor.value as AnnotationRecord;
          if (record.documentId && !record.basis) {
            const doc = request.transaction!.objectStore(DOCUMENTS).get(record.documentId);
            doc.onsuccess = () => {
              const metadata = doc.result as DocumentMetadata | undefined;
              cursor.update({ ...record, basis: {
                zoom: metadata?.type === 'word' ? 1 : metadata?.zoom || 1,
                rotation: metadata?.type === 'pdf' ? metadata.rotation || 0 : 0,
              } });
              cursor.continue();
            };
          } else cursor.continue();
        };

        // Moving bytes and removing them from metadata is one atomic upgrade.
        const cursorRequest = request.transaction!.objectStore(DOCUMENTS).openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          const { data, ...metadata } = cursor.value as DocumentItem;
          contents.put({ id: metadata.id, data });
          cursor.update(metadata);
          cursor.continue();
        };
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      reject(new Error('Vui lòng đóng các tab Kim Ngân Learning khác rồi tải lại để nâng cấp bộ nhớ.'));
      request.onsuccess = () => request.result.close();
    };
  });
}

async function transact<T>(stores: string[], mode: IDBTransactionMode,
  run: (tx: IDBTransaction, result: (value: T) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction | undefined;
    let value: T;
    try {
      tx = db.transaction(stores, mode);
      tx.oncomplete = () => { db.close(); resolve(value); };
      tx.onabort = () => { db.close(); reject(tx?.error || new Error('Giao dịch lưu trữ đã bị hủy.')); };
      run(tx, result => { value = result; });
    } catch (error) {
      tx?.abort(); db.close(); reject(error);
    }
  });
}

export function getAllDocuments(): Promise<DocumentMetadata[]> {
  return transact([DOCUMENTS], 'readonly', (tx, result) => {
    const request = tx.objectStore(DOCUMENTS).getAll();
    request.onsuccess = () => result(request.result.sort((a: DocumentMetadata, b: DocumentMetadata) => a.createdAt - b.createdAt));
  });
}

export function getDocumentById(id: string): Promise<DocumentItem | null> {
  return transact([DOCUMENTS, CONTENTS], 'readonly', (tx, result) => {
    const metadata = tx.objectStore(DOCUMENTS).get(id);
    const contents = tx.objectStore(CONTENTS).get(id);
    contents.onsuccess = () => result(metadata.result && contents.result
      ? { ...metadata.result, data: contents.result.data } : null);
  });
}

export function saveDocument(document: DocumentItem): Promise<void> {
  const { data, ...metadata } = document;
  return transact([DOCUMENTS, CONTENTS], 'readwrite', tx => {
    tx.objectStore(DOCUMENTS).put(metadata);
    tx.objectStore(CONTENTS).put({ id: document.id, data });
  });
}

export function updateDocumentMetadata(id: string, updates: Partial<Omit<DocumentMetadata, 'id'>>): Promise<boolean> {
  return transact([DOCUMENTS], 'readwrite', (tx, result) => {
    const store = tx.objectStore(DOCUMENTS);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) store.put({ ...request.result, ...updates });
      result(!!request.result);
    };
  });
}
export const updateDocumentProgress = updateDocumentMetadata;

export function getAllAnnotations(): Promise<AnnotationRecord[]> {
  return transact([ANNOTATIONS], 'readonly', (tx, result) => {
    const request = tx.objectStore(ANNOTATIONS).getAll();
    request.onsuccess = () => result(request.result);
  });
}

export function saveAnnotations(record: AnnotationRecord): Promise<void> {
  return transact([DOCUMENTS, ANNOTATIONS], 'readwrite', tx => {
    const store = tx.objectStore(ANNOTATIONS);
    if (record.documentId === null) { store.put(record); return; }
    const request = tx.objectStore(DOCUMENTS).get(record.documentId);
    request.onsuccess = () => { if (request.result) store.put(record); };
  });
}

export function deleteDocument(id: string): Promise<void> {
  return transact(ALL_STORES, 'readwrite', tx => {
    tx.objectStore(DOCUMENTS).delete(id);
    tx.objectStore(CONTENTS).delete(id);
    const request = tx.objectStore(ANNOTATIONS).index('documentId').openCursor(IDBKeyRange.only(id));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
  });
}

export function clearAllDocuments(): Promise<void> {
  return transact(ALL_STORES, 'readwrite', tx => { ALL_STORES.forEach(name => tx.objectStore(name).clear()); });
}

export interface WorkspaceSnapshot { documents: DocumentItem[]; annotations: AnnotationRecord[] }
export function readWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  return transact(ALL_STORES, 'readonly', (tx, result) => {
    const docs = tx.objectStore(DOCUMENTS).getAll();
    const contents = tx.objectStore(CONTENTS).getAll();
    const drawings = tx.objectStore(ANNOTATIONS).getAll();
    drawings.onsuccess = () => {
      const bytes = new Map(contents.result.map(item => [item.id, item.data]));
      result({ documents: docs.result.map(doc => ({ ...doc, data: bytes.get(doc.id) })), annotations: drawings.result });
    };
  });
}

// Imports use fresh IDs and append atomically. Existing files and scratchpad are retained.
export function importWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
  return transact(ALL_STORES, 'readwrite', tx => {
    for (const { data, ...metadata } of snapshot.documents) {
      tx.objectStore(DOCUMENTS).add(metadata);
      tx.objectStore(CONTENTS).add({ id: metadata.id, data });
    }
    for (const record of snapshot.annotations) {
      if (record.documentId !== null) tx.objectStore(ANNOTATIONS).add(record);
      else {
        const request = tx.objectStore(ANNOTATIONS).get('scratchpad');
        request.onsuccess = () => tx.objectStore(ANNOTATIONS).put({ ...record,
          strokes: [...(request.result?.strokes || []), ...record.strokes] });
      }
    }
  });
}
