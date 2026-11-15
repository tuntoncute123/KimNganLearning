import { surfaceTransform } from '../drawing/coordinates';
import { downloadBlob } from './workspaceBackup';

export function composeLessonImage(): HTMLCanvasElement {
  const surface = document.querySelector<HTMLElement>('.active-viewer-container .document-surface');
  const plane = surface?.querySelector<HTMLElement>('.document-plane');
  if (!plane || !surface || !surface.getClientRects().length) throw new Error('Hãy đợi tài liệu hiển thị xong trước khi xuất.');
  const width = plane.offsetWidth, height = plane.offsetHeight;
  const rotation = Number(surface.dataset.rotation) || 0;
  const transform = surfaceTransform(width, height, 1, rotation);
  const resolution = Math.min(2, Math.sqrt(24_000_000 / (width * height)));
  const output = document.createElement('canvas');
  output.width = Math.ceil(transform.width * resolution); output.height = Math.ceil(transform.height * resolution);
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('Không tạo được ảnh bài giảng.');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, output.width, output.height);
  ctx.scale(resolution, resolution);
  ctx.transform(...transform.matrix as [number, number, number, number, number, number]);
  const original = plane.querySelector<HTMLCanvasElement | HTMLImageElement>(':scope > canvas, :scope > img');
  const annotations = plane.querySelector<HTMLCanvasElement>('.annotation-drawing-canvas');
  if (!original || !annotations || (original instanceof HTMLImageElement && !original.naturalWidth))
    throw new Error('Tài liệu chưa sẵn sàng để xuất ảnh.');
  ctx.drawImage(original, 0, 0, width, height);
  ctx.drawImage(annotations, 0, 0, width, height);
  return output;
}

export async function exportLessonPng(name: string) {
  const canvas = composeLessonImage();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Không tạo được ảnh PNG.')), 'image/png'));
  downloadBlob(blob, `${name.replace(/\.[^.]+$/, '')}-ghi-chu.png`);
}

export async function printLesson(name: string, isWord: boolean) {
  const frame = document.createElement('iframe');
  frame.title = 'Bản in bài giảng';
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;height:1000px;border:0';
  document.body.append(frame);
  try {
    const doc = frame.contentDocument!, win = frame.contentWindow!;
    doc.title = name;
    const style = doc.createElement('style');
    style.textContent = '@page{margin:10mm} body{margin:0;background:white;color:black} img.lesson-print{display:block;max-width:100%;height:auto} .selection-active-overlay{display:none!important} .document-plane{position:relative!important;transform:none!important;box-shadow:none!important;margin:0!important}';
    if (isWord) {
      const plane = document.querySelector('.active-viewer-container .document-plane');
      if (!plane || !(plane as HTMLElement).offsetWidth) throw new Error('Tài liệu chưa sẵn sàng để in.');
      const clone = plane.cloneNode(true) as HTMLElement;
      const sources = plane.querySelectorAll('canvas');
      clone.querySelectorAll('canvas').forEach((canvas, index) => {
        const img = doc.createElement('img'); img.src = sources[index].toDataURL(); img.style.cssText = canvas.style.cssText;
        canvas.replaceWith(img);
      });
      clone.querySelectorAll('.selection-active-overlay').forEach(el => el.remove());
      doc.body.append(clone);
    } else {
      const img = doc.createElement('img'); img.className = 'lesson-print'; img.src = composeLessonImage().toDataURL(); doc.body.append(img);
    }
    doc.head.append(style);
    await Promise.all(Array.from(doc.images).map(img => img.decode()));
    await doc.fonts.ready;
    win.addEventListener('afterprint', () => frame.remove(), { once: true });
    win.focus(); win.print();
    // Some engines omit afterprint on cancellation.
    setTimeout(() => frame.remove(), 120_000);
  } catch (error) { frame.remove(); throw error; }
}
