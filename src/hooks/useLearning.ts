import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyLearningData } from '../types/learning';
import { learningTransaction } from '../services/learningStore';
import type { LearningChange } from '../services/learningActions';

export function useLearning() {
  const [data, setData] = useState(emptyLearningData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const locked = useRef(false);
  const revision = useRef(0);

  const reload = useCallback(async () => {
    const version = ++revision.current;
    try {
      const next = await learningTransaction();
      if (version === revision.current) { setData(next); setReady(true); setError(''); }
    } catch (error) {
      if (version === revision.current) setError(error instanceof Error ? error.message : 'Không thể mở dữ liệu lớp học.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void reload(); });
    const connection = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('kimngan-learning') : null;
    channel.current = connection;
    if (connection) connection.onmessage = () => { if (!locked.current) void reload(); };
    const refresh = () => { if (!locked.current) void reload(); };
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; connection?.close(); channel.current = null; window.removeEventListener('focus', refresh); };
  }, [reload]);

  const commit = async (change: LearningChange, success: string): Promise<boolean> => {
    if (locked.current || !ready) return false;
    locked.current = true; ++revision.current;
    setBusy(true); setError(''); setMessage('');
    try {
      const next = await learningTransaction(change);
      setData(next); setMessage(success);
      channel.current?.postMessage('updated');
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể lưu thay đổi. Hãy thử lại.');
      return false;
    } finally { locked.current = false; setBusy(false); }
  };
  return { data, loading, busy, ready, error, message, commit, reload, setError, setMessage };
}
export type LearningController = ReturnType<typeof useLearning>;
