import type { DocType } from '../types/document';
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

// Validate size and supported extensions before allocating the full file buffer.
export async function validateDocumentFile(file: File): Promise<{ type: DocType; mimeType: string }> {
  if (!file.size) throw new Error(`“${file.name}” là file rỗng.`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`“${file.name}” vượt giới hạn 100 MB mỗi file.`);
  const extension = file.name.split('.').at(-1)?.toLowerCase();
  const formats: Record<string, { type: DocType; mimeType: string }> = {
    pdf: { type: 'pdf', mimeType: 'application/pdf' },
    docx: { type: 'word', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    png: { type: 'image', mimeType: 'image/png' },
    jpg: { type: 'image', mimeType: 'image/jpeg' }, jpeg: { type: 'image', mimeType: 'image/jpeg' },
    webp: { type: 'image', mimeType: 'image/webp' }, gif: { type: 'image', mimeType: 'image/gif' },
  };
  const format = extension && Object.hasOwn(formats, extension) ? formats[extension] : undefined;
  if (!format) throw new Error(`“${file.name}” không được hỗ trợ. Chọn PDF, DOCX, PNG, JPG, WEBP hoặc GIF.`);
  const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const ascii = new TextDecoder('latin1').decode(header);
  const valid = format.type === 'pdf' ? ascii.includes('%PDF-')
    : format.type === 'word' ? header[0] === 0x50 && header[1] === 0x4b
    : format.mimeType === 'image/png' ? header[0] === 137 && ascii.slice(1, 4) === 'PNG'
    : format.mimeType === 'image/jpeg' ? header[0] === 255 && header[1] === 216
    : format.mimeType === 'image/webp' ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP'
    : ascii.startsWith('GIF8');
  if (!valid) throw new Error(`“${file.name}” có nội dung không khớp định dạng hoặc đã bị hỏng.`);
  return format;
}
