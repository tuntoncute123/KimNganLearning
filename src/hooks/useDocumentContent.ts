import { useEffect, useState } from 'react';
import { getDocumentById } from '../services/db';

// Only the active file is held in React memory. Late reads cannot replace a newer file.
export function useDocumentContent(id: string | null) {
  const [loaded, setLoaded] = useState<{ id: string; data?: ArrayBuffer; error?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const read = id ? getDocumentById(id) : Promise.resolve(null);
    void read.then(doc => {
      if (!cancelled) setLoaded(!id ? null : doc ? { id, data: doc.data } : { id, error: 'Không tìm thấy nội dung tài liệu.' });
    }).catch(error => {
      if (!cancelled && id) setLoaded({ id, error: error instanceof Error ? error.message : 'Không thể đọc tài liệu.' });
    });
    return () => { cancelled = true; };
  }, [id]);
  return loaded?.id === id ? loaded : null;
}
