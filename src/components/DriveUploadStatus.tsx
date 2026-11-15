import type { DocumentMetadata } from '../types/document';

export function DriveUploadStatus({ documents, connected, onRetry, onConnect }:
  { documents: DocumentMetadata[]; connected: boolean; onRetry: (id: string) => void; onConnect: () => void }) {
  const jobs = documents.filter(doc => doc.driveStatus);
  if (!jobs.length) return null;
  const unfinished = jobs.filter(doc => doc.driveStatus !== 'synced');
  return <details className="drive-upload-status" open={unfinished.some(doc => ['error', 'auth-required'].includes(doc.driveStatus!)) || undefined}>
    <summary>Google Drive: {jobs.length - unfinished.length}/{jobs.length} file đã tải bản gốc</summary>
    <ul>{jobs.map(doc => <li key={doc.id}>
      <span>{doc.name} — {doc.driveStatus === 'synced' ? 'Đã tải bản gốc' : doc.driveStatus === 'queued' ? 'Đang chờ tải'
        : doc.driveStatus === 'uploading' ? 'Đang tải lên…' : doc.driveError || 'Chưa tải được. Bản trên thiết bị vẫn được giữ.'}</span>
      {['error', 'auth-required'].includes(doc.driveStatus!) && <button type="button" className="btn btn-secondary btn-sm"
        onClick={() => connected ? onRetry(doc.id) : onConnect()}>{connected ? 'Thử tải lại' : 'Đăng nhập lại Google'}</button>}
    </li>)}</ul>
  </details>;
}
