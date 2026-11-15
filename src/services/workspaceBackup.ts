import type { DocumentItem, DrawStroke, DrawTool } from '../types/document';
import { type AnnotationRecord, type WorkspaceSnapshot, readWorkspaceSnapshot, importWorkspace } from './db';
import { MAX_FILE_BYTES, validateDocumentFile } from './fileValidation';

const MAX_BACKUP_BYTES = 250 * 1024 * 1024;
const TOOLS = new Set<DrawTool>(['select', 'pen', 'highlighter', 'line', 'dashed-line', 'arrow', 'rect', 'circle',
  'triangle', 'right-angle', 'coordinate-axes', 'cube-3d', 'pyramid-3d', 'tetrahedron-3d', 'cylinder-3d', 'cone-3d', 'sphere-3d', 'math-text', 'eraser']);

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function base64(data: ArrayBuffer) {
  const bytes = new Uint8Array(data);
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 24_576) parts.push(btoa(String.fromCharCode(...bytes.subarray(i, i + 24_576))));
  return parts.join('');
}

export async function exportWorkspace() {
  const snapshot = await readWorkspaceSnapshot();
  if (snapshot.documents.reduce((sum, doc) => sum + doc.size * 4 / 3, 0) > MAX_BACKUP_BYTES)
    throw new Error('Workspace quá lớn cho bản sao lưu JSON 250 MB. Hãy chia nhỏ kho tài liệu trước khi sao lưu.');
  const payload = { format: 'kimngan-workspace', version: 1, exportedAt: new Date().toISOString(),
    documents: snapshot.documents.map(doc => ({ ...doc, data: base64(doc.data) })), annotations: snapshot.annotations };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  if (blob.size > MAX_BACKUP_BYTES) throw new Error('Bản sao lưu vượt giới hạn 250 MB.');
  downloadBlob(blob, `KimNgan-workspace-${new Date().toISOString().slice(0, 10)}.json`);
}

type UnknownRecord = Record<string, unknown>;
function object(value: unknown): asserts value is UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Cấu trúc bản sao lưu không hợp lệ.');
}
function text(value: unknown, max = 1000): string {
  if (typeof value !== 'string' || value.length > max) throw new Error('Chuỗi trong bản sao lưu không hợp lệ.');
  return value;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('Giá trị trong bản sao lưu không hợp lệ.');
  return value;
}
function integer(value: unknown, min: number, max: number) {
  const n = number(value, min, max);
  if (!Number.isInteger(n)) throw new Error('Số trang không hợp lệ.');
  return n;
}
function rotation(value: unknown) {
  const n = number(value, 0, 270);
  if (n % 90) throw new Error('Góc xoay không hợp lệ.');
  return n;
}
function stroke(value: unknown): DrawStroke {
  object(value);
  const tool = text(value.tool) as DrawTool;
  if (!TOOLS.has(tool) || !Array.isArray(value.points) || value.points.length > 200_000) throw new Error('Nét vẽ không hợp lệ.');
  const color = text(value.color, 80);
  if (!CSS.supports('color', color)) throw new Error('Màu nét vẽ không hợp lệ.');
  return { id: crypto.randomUUID(), tool, color, width: number(value.width, 0.1, 100),
    points: value.points.map(point => { object(point); return { x: number(point.x, -1e6, 1e6), y: number(point.y, -1e6, 1e6) }; }),
    ...(value.text !== undefined ? { text: text(value.text, 20_000) } : {}),
    ...(value.fontSize !== undefined ? { fontSize: number(value.fontSize, 1, 1000) } : {}),
    ...(value.opacity !== undefined ? { opacity: number(value.opacity, 0, 1) } : {}),
    ...(typeof value.isDashed === 'boolean' ? { isDashed: value.isDashed } : {}) };
}

export async function restoreWorkspace(file: File): Promise<number> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('Bản sao lưu vượt giới hạn 250 MB.');
  const payload: unknown = JSON.parse(await file.text());
  object(payload);
  if (payload.format !== 'kimngan-workspace' || payload.version !== 1 || !Array.isArray(payload.documents) || !Array.isArray(payload.annotations))
    throw new Error('File không phải bản sao lưu Kim Ngân được hỗ trợ.');
  if (payload.documents.length > 2000 || payload.annotations.length > 50_000) throw new Error('Bản sao lưu có quá nhiều mục.');
  const ids = new Map<string, string>();
  const documents: DocumentItem[] = [];
  for (const item of payload.documents) {
    object(item);
    const oldId = text(item.id);
    if (ids.has(oldId)) throw new Error('Bản sao lưu có ID tài liệu trùng lặp.');
    const id = crypto.randomUUID(); ids.set(oldId, id);
    const encoded = text(item.data, Math.ceil(MAX_FILE_BYTES * 4 / 3) + 4);
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const name = text(item.name);
    const format = await validateDocumentFile(new File([bytes], name));
    const totalPages = integer(item.totalPages, 1, 100_000);
    documents.push({ id, name, ...format, data: bytes.buffer, size: bytes.byteLength,
      createdAt: number(item.createdAt, 0, Number.MAX_SAFE_INTEGER), lastOpenedAt: Date.now(),
      currentPage: integer(item.currentPage, 1, totalPages), totalPages,
      zoom: number(item.zoom, 0.4, 3), rotation: rotation(item.rotation), isOpen: true,
      studentName: item.studentName === undefined ? undefined : text(item.studentName),
      lessonName: item.lessonName === undefined ? undefined : text(item.lessonName) });
  }
  const keys = new Set<string>();
  let pointCount = 0;
  const annotations: AnnotationRecord[] = payload.annotations.map(value => {
    object(value);
    const oldId = value.documentId === null ? null : text(value.documentId);
    const documentId = oldId === null ? null : ids.get(oldId);
    if (documentId === undefined || !Array.isArray(value.strokes) || value.strokes.length > 50_000) throw new Error('Ghi chú tham chiếu tài liệu không hợp lệ.');
    const oldKey = text(value.key);
    let key = 'scratchpad';
    if (oldId !== null) {
      const prefix = `${oldId}_`;
      const page = oldKey.startsWith(prefix) ? Number(oldKey.slice(prefix.length)) : NaN;
      integer(page, 1, 100_000);
      key = `${documentId}_${page}`;
    } else if (oldKey !== 'scratchpad') throw new Error('Khóa bảng nháp không hợp lệ.');
    if (keys.has(key)) throw new Error('Ghi chú bị trùng lặp.');
    keys.add(key);
    const strokes = value.strokes.map(item => {
      const parsed = stroke(item); pointCount += parsed.points.length;
      if (pointCount > 2_000_000) throw new Error('Bản sao lưu có quá nhiều điểm vẽ.');
      return parsed;
    });
    const doc = documents.find(item => item.id === documentId);
    let basis = { zoom: doc?.type === 'word' ? 1 : doc?.zoom || 1, rotation: doc?.type === 'pdf' ? doc.rotation : 0 };
    if (value.basis !== undefined) {
      object(value.basis);
      basis = { zoom: number(value.basis.zoom, 0.4, 3), rotation: rotation(value.basis.rotation) };
    }
    return { key, documentId, strokes, basis };
  });
  const snapshot: WorkspaceSnapshot = { documents, annotations };
  await importWorkspace(snapshot);
  return documents.length;
}
