import { useRef, useState } from 'react';
import type { DocumentMetadata } from '../types/document';
import { exportWorkspace } from '../services/workspaceBackup';
import { exportLessonPng, printLesson } from '../services/exportLesson';

export function WorkspaceActions({ activeDoc, disabled, flush, onRestore, onError }:
  { activeDoc: DocumentMetadata | null; disabled: boolean; flush: () => Promise<void>;
    onRestore: (file: File) => Promise<void>; onError: (error: unknown) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await flush(); await action(); } catch (error) { onError(error); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div className="workspace-actions" role="toolbar" aria-label="Sao lưu và xuất bài giảng" aria-busy={busy}>
    <button className="btn btn-secondary btn-sm" disabled={disabled || busy} onClick={() => void run(exportWorkspace)}>Sao lưu workspace</button>
    <button className="btn btn-secondary btn-sm" disabled={disabled || busy} onClick={() => input.current?.click()}>Nhập bản sao lưu</button>
    <input ref={input} type="file" accept=".json,application/json" aria-label="Chọn bản sao lưu" hidden
      onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(() => onRestore(file)); }} />
    {activeDoc && <>
      {activeDoc.type !== 'word' && <button className="btn btn-secondary btn-sm" disabled={disabled || busy}
        onClick={() => void run(() => exportLessonPng(activeDoc.name))}>Xuất trang có ghi chú (PNG)</button>}
      <button className="btn btn-secondary btn-sm" disabled={disabled || busy}
        onClick={() => void run(() => printLesson(activeDoc.name, activeDoc.type === 'word'))}>
        {activeDoc.type === 'word' ? 'In / Lưu PDF tài liệu' : 'In / Lưu PDF trang này'}
      </button>
    </>}
    {busy && <span>Đang xử lý…</span>}
  </div>;
}
