import { useCallback, useEffect, useRef } from 'react';
import type { DocumentMetadata } from '../types/document';
import { getDocumentById, updateDocumentMetadata } from '../services/db';
import { DriveAuthError, ensureStudentLessonPath, uploadFileToDrive } from '../services/googleDriveService';

export function useDriveUploads(token: string | null, onUpdate: (id: string, patch: Partial<DocumentMetadata>) => void,
  onExpired: () => void, onStorageError: (error: unknown) => void) {
  const pending = useRef(Promise.resolve());
  const jobs = useRef(new Map<string, AbortController>());
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
    if (!token) { jobs.current.forEach(controller => controller.abort()); jobs.current.clear(); }
  }, [token]);
  useEffect(() => () => { jobs.current.forEach(controller => controller.abort()); }, []);

  const enqueue = useCallback((id: string) => {
    if (jobs.current.has(id)) return;
    const controller = new AbortController();
    jobs.current.set(id, controller);
    const patch = async (updates: Partial<DocumentMetadata>) => {
      if (await updateDocumentMetadata(id, updates)) onUpdate(id, updates);
    };
    onUpdate(id, { driveStatus: 'queued', driveError: undefined });
    pending.current = pending.current.then(async () => {
      try {
        controller.signal.throwIfAborted();
        const accessToken = tokenRef.current;
        if (!accessToken) throw new DriveAuthError('Hãy kết nối Google Drive rồi thử tải lại.');
        const doc = await getDocumentById(id);
        if (!doc || doc.driveFileId) return;
        await patch({ driveStatus: 'uploading', driveError: undefined });
        const target = await ensureStudentLessonPath(doc.studentName || '', doc.lessonName || '', accessToken, controller.signal);
        const uploaded = await uploadFileToDrive(doc, target.folderId, accessToken, controller.signal);
        if (!controller.signal.aborted) await patch({ driveStatus: 'synced', driveError: undefined,
          driveFileId: uploaded.id, driveWebViewLink: uploaded.webViewLink,
          driveFolderId: target.folderId, driveFolderPath: target.folderPath });
      } catch (error) {
        const auth = error instanceof DriveAuthError;
        if (auth) { tokenRef.current = null; onExpired(); }
        await patch({ driveStatus: auth ? 'auth-required' : 'error',
          driveError: controller.signal.aborted ? 'Đã dừng tải. Bản trên thiết bị vẫn được giữ.'
            : error instanceof Error ? error.message : 'Không tải được lên Google Drive.' });
      } finally {
        if (jobs.current.get(id) === controller) jobs.current.delete(id);
      }
    }).catch(onStorageError);
  }, [onUpdate, onExpired, onStorageError]);

  const cancel = (id?: string) => {
    if (id) jobs.current.get(id)?.abort();
    else jobs.current.forEach(controller => controller.abort());
  };
  return { enqueue, cancel };
}
