export type DocType = 'pdf' | 'image' | 'word';

export interface DocumentItem {
  id: string;
  name: string;
  type: DocType;
  mimeType: string;
  size: number;
  data: ArrayBuffer;
  createdAt: number;
  lastOpenedAt: number;
  currentPage: number;
  totalPages: number;
  zoom: number; // Tỉ lệ zoom (1 = 100%, 1.25 = 125%, ...)
  rotation: number; // 0, 90, 180, 270 độ

  // Metadata Google Drive
  driveFileId?: string;
  driveFolderId?: string;
  driveFolderPath?: string; // Ví dụ: "HoloTutor Materials / Học sinh A / Lesson 01"
  driveWebViewLink?: string;
  studentName?: string;
  lessonName?: string;
}

export type ZoomPreset = 'fit-width' | 'fit-page' | 'actual';

export interface ViewerState {
  currentPage: number;
  totalPages: number;
  zoom: number;
  rotation: number;
  isLaserActive: boolean;
}

export interface GoogleAuthConfig {
  clientId: string;
  apiKey?: string;
}

export interface GoogleUser {
  email: string;
  name?: string;
  picture?: string;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  path: string;
}

// ==============================================================================
// Math & Annotation Types
// ==============================================================================

export type DrawTool =
  | 'select' // Con trỏ chuột duyệt trang thông thường
  | 'pen' // Bút vẽ tự do
  | 'highlighter' // Bút dạ quang tô sáng
  | 'line' // Đoạn thẳng
  | 'dashed-line' // Nét đứt (đường cao, cạnh khuất)
  | 'arrow' // Mũi tên (vectơ, trục toạ độ)
  | 'rect' // Hình chữ nhật / Hình vuông
  | 'circle' // Đường tròn / Elip
  | 'triangle' // Tam giác
  | 'right-angle' // Ký hiệu góc vuông
  | 'coordinate-axes' // Hệ trục toạ độ Oxy
  | 'cube-3d' // Hình lập phương / Hình hộp 3D
  | 'pyramid-3d' // Hình chóp tứ giác S.ABCD 3D
  | 'tetrahedron-3d' // Tứ diện / Hình chóp tam giác S.ABC 3D
  | 'cylinder-3d' // Hình trụ 3D
  | 'cone-3d' // Hình nón 3D
  | 'sphere-3d' // Hình cầu 3D
  | 'math-text' // Công cụ chèn công thức Toán & văn bản
  | 'eraser'; // Tẩy nét vẽ

export interface Point {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  tool: DrawTool;
  color: string;
  width: number;
  points: Point[];
  opacity?: number;
  text?: string; // Dành cho math-text
  fontSize?: number;
  isDashed?: boolean;
}
