import type { GoogleUser } from '../types/document';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (error: any) => void;
          }) => any;
        };
      };
    };
  }
}

const DRIVE_ROOT_FOLDER_NAME = 'HoloTutor Materials';
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/**
 * Tìm hoặc tạo thư mục theo tên và ID thư mục cha
 */
export async function findOrCreateFolder(
  folderName: string,
  parentId: string | null,
  accessToken: string
): Promise<string> {
  // 1. Tìm kiếm xem thư mục đã tồn tại hay chưa
  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)&spaces=drive`;
  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Lỗi tìm thư mục "${folderName}": ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Chưa có thì tạo mới
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const meta: { name: string; mimeType: string; parents?: string[] } = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    meta.parents = [parentId];
  }

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meta),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Lỗi tạo thư mục "${folderName}": ${errText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Tự động đảm bảo cây thư mục:
 * HoloTutor Materials / [studentName] / [lessonName]
 */
export async function ensureStudentLessonPath(
  studentName: string,
  lessonName: string,
  accessToken: string
): Promise<{ folderId: string; folderPath: string }> {
  const cleanStudent = studentName.trim() || 'Học sinh chung';
  const cleanLesson = lessonName.trim() || 'Buổi học';

  // 1. Thư mục gốc HoloTutor Materials
  const rootId = await findOrCreateFolder(DRIVE_ROOT_FOLDER_NAME, null, accessToken);

  // 2. Thư mục Học sinh
  const studentFolderId = await findOrCreateFolder(cleanStudent, rootId, accessToken);

  // 3. Thư mục Buổi học
  const lessonFolderId = await findOrCreateFolder(cleanLesson, studentFolderId, accessToken);

  const folderPath = `${DRIVE_ROOT_FOLDER_NAME} / ${cleanStudent} / ${cleanLesson}`;
  return { folderId: lessonFolderId, folderPath };
}

/**
 * Upload file lên Google Drive vào đúng folderId bằng multipart/related
 */
export async function uploadFileToDrive(
  fileData: { name: string; mimeType: string; data: ArrayBuffer },
  folderId: string,
  accessToken: string
): Promise<{ id: string; name: string; webViewLink?: string; size?: number }> {
  const metadata = {
    name: fileData.name,
    mimeType: fileData.mimeType,
    parents: [folderId],
  };

  const boundary = '-------HoloTutorMultipartBoundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const fileHeader = `Content-Type: ${fileData.mimeType}\r\n\r\n`;

  const multipartBlob = new Blob(
    [
      delimiter,
      metaPart,
      delimiter,
      fileHeader,
      fileData.data,
      closeDelimiter,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: multipartBlob,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload lên Google Drive thất bại: ${errText}`);
  }

  const result = await res.json();
  return {
    id: result.id,
    name: result.name,
    webViewLink: result.webViewLink,
    size: result.size ? Number(result.size) : undefined,
  };
}

/**
 * Lấy thông tin tài khoản người dùng từ token
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error('Không thể lấy thông tin người dùng Google');
  }

  const data = await res.json();
  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

/**
 * Khởi tạo TokenClient của Google Identity Services
 */
export function createGoogleTokenClient(
  clientId: string,
  onSuccess: (token: string) => void,
  onError: (err: any) => void
) {
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK chưa được tải xong.');
  }

  return window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_FILE_SCOPE,
    callback: (response) => {
      if (response.error) {
        onError(response.error);
        return;
      }
      if (response.access_token) {
        onSuccess(response.access_token);
      }
    },
    error_callback: onError,
  });
}
