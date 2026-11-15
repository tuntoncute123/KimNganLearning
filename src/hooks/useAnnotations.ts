import { useCallback, useEffect, useRef, useState } from 'react';
import { saveAnnotations, type AnnotationRecord } from '../services/db';
import type { AnnotationBasis, DrawStroke } from '../types/document';

const HISTORY_LIMIT = 50;
const SCRATCHPAD_KEY = 'scratchpad';
const DEFAULT_BASIS: AnnotationBasis = { zoom: 1, rotation: 0 };
type History = { basis?: AnnotationBasis; strokes: DrawStroke[]; undo: DrawStroke[][]; redo: DrawStroke[][] };
const EMPTY: History = { strokes: [], undo: [], redo: [] };

export function useAnnotations(documentId: string | null, page: number) {
  const [pages, setPages] = useState<Record<string, History>>({});
  const latest = useRef(pages);
  const pending = useRef(Promise.resolve());
  const unsaved = useRef(new Map<string, AnnotationRecord>());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const revision = useRef(0);
  const key = documentId ? `${documentId}_${page}` : '';
  const current = pages[key] || EMPTY;

  const publish = useCallback((next: Record<string, History>) => {
    latest.current = next;
    setPages(next);
  }, []);

  const hydrate = useCallback((records: AnnotationRecord[]) => {
    publish(Object.fromEntries(records.map((record) => [record.key, { ...EMPTY, strokes: record.strokes, basis: record.basis || DEFAULT_BASIS }])));
  }, [publish]);

  const persist = (record: AnnotationRecord) => {
    const version = ++revision.current;
    unsaved.current.set(record.key, record);
    setSaveStatus('saving');
    pending.current = pending.current.then(() => saveAnnotations(record)).then(() => {
      if (unsaved.current.get(record.key) === record) unsaved.current.delete(record.key);
      if (version === revision.current) setSaveStatus(unsaved.current.size ? 'error' : 'saved');
    }).catch((error) => {
      console.error('Không thể lưu nét vẽ:', error);
      setSaveStatus('error');
    });
  };

  const changePage = (strokes: DrawStroke[], action: 'edit' | 'undo' | 'redo' = 'edit') => {
    if (!documentId || !key) return;
    const previous = latest.current[key] || EMPTY;
    let next: History;
    if (action === 'undo') {
      if (!previous.undo.length) return;
      next = {
        basis: previous.basis,
        strokes: previous.undo[previous.undo.length - 1],
        undo: previous.undo.slice(0, -1),
        redo: [...previous.redo, previous.strokes].slice(-HISTORY_LIMIT),
      };
    } else if (action === 'redo') {
      if (!previous.redo.length) return;
      next = {
        basis: previous.basis,
        strokes: previous.redo[previous.redo.length - 1],
        undo: [...previous.undo, previous.strokes].slice(-HISTORY_LIMIT),
        redo: previous.redo.slice(0, -1),
      };
    } else {
      next = { basis: previous.basis, strokes, undo: [...previous.undo, previous.strokes].slice(-HISTORY_LIMIT), redo: [] };
    }
    publish({ ...latest.current, [key]: next });
    persist({ key, documentId, strokes: next.strokes, basis: next.basis || DEFAULT_BASIS });
  };

  const setScratchpadStrokes = (value: DrawStroke[] | ((previous: DrawStroke[]) => DrawStroke[])) => {
    const previous = latest.current[SCRATCHPAD_KEY]?.strokes || [];
    const strokes = typeof value === 'function' ? value(previous) : value;
    publish({ ...latest.current, [SCRATCHPAD_KEY]: { ...EMPTY, strokes } });
    persist({ key: SCRATCHPAD_KEY, documentId: null, strokes });
  };

  const forgetDocument = (id: string) => {
    publish(Object.fromEntries(Object.entries(latest.current).filter(([pageKey]) => !pageKey.startsWith(`${id}_`))));
    for (const [pageKey, record] of unsaved.current) {
      if (record.documentId === id) unsaved.current.delete(pageKey);
    }
    if (!unsaved.current.size) setSaveStatus('saved');
  };

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (unsaved.current.size) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  return {
    basis: current.basis || DEFAULT_BASIS,
    currentPageStrokes: current.strokes,
    scratchpadStrokes: pages[SCRATCHPAD_KEY]?.strokes || [],
    canUndo: current.undo.length > 0,
    canRedo: current.redo.length > 0,
    saveStatus,
    hydrate,
    forgetDocument,
    flush: async () => { await pending.current; if (unsaved.current.size) throw new Error('Còn nét vẽ chưa lưu. Hãy thử lưu lại trước khi tiếp tục.'); },
    reset: () => { publish({}); unsaved.current.clear(); setSaveStatus('saved'); },
    retrySaving: () => { for (const record of unsaved.current.values()) persist(record); },
    setScratchpadStrokes,
    handlePageStrokesChange: (strokes: DrawStroke[]) => changePage(strokes),
    handleUndo: () => changePage([], 'undo'),
    handleRedo: () => changePage([], 'redo'),
    handleClearCurrentPage: () => { if (current.strokes.length) changePage([]); },
  };
}
