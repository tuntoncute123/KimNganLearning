import type { Assignment, Submission } from '../../types/learning';

export const value = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
export const dateLabel = (date: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
export function localDateInput(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export const attendanceLabels = { present: 'Có mặt', late: 'Đi muộn', absent: 'Vắng', excused: 'Có phép' } as const;
export function submissionStatus(assignment: Assignment, submission?: Submission) {
  if (submission?.gradedAt) return 'Đã chấm';
  if (submission?.submittedAt) return new Date(submission.submittedAt) > new Date(assignment.dueAt) ? 'Nộp muộn' : 'Đã nộp';
  if (new Date(assignment.dueAt).getTime() < Date.now()) return 'Quá hạn';
  return submission ? 'Bản nháp' : 'Chưa nộp';
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Neutralize spreadsheet formula cells, while preserving proper CSV quoting.
export function downloadCsv(rows: (string | number)[][], name: string) {
  const csv = rows.map(row => row.map(cell => {
    const text = String(cell), safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
  downloadBlob(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), name);
}
