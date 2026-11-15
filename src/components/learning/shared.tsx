import { useEffect, useId, useRef, type ReactNode } from 'react';
import { BookOpen, X } from 'lucide-react';
import type { LearningController } from '../../hooks/useLearning';
import type { DocumentMetadata } from '../../types/document';
import type { Classroom, LearningRole } from '../../types/learning';

export interface LearningPanelProps {
  controller: LearningController;
  role: LearningRole;
  now: number;
  studentId: string;
  classes: Classroom[];
  classId: string;
  documents: DocumentMetadata[];
  onOpenDocument: (id: string) => void;
}
export function EmptyPanel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="learning-empty"><BookOpen size={30} /><h3>{title}</h3><p>{children}</p></div>;
}
export function PanelHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="learning-panel-heading"><div><h2>{title}</h2><p>{description}</p></div><div className="learning-actions">{children}</div></div>;
}
export function ClassField({ classes, classId, disabled = false }: { classes: Classroom[]; classId: string; disabled?: boolean }) {
  return <label>Lớp học<select name="classId" defaultValue={classId || classes[0]?.id || ''} required disabled={disabled}>
    <option value="" disabled>Chọn lớp học</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
  </select></label>;
}
export function DocumentField({ documents, documentId = '' }: { documents: DocumentMetadata[]; documentId?: string }) {
  return <label>Tài liệu đính kèm<select name="documentId" defaultValue={documentId}>
    <option value="">Không đính kèm</option>{documents.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
  </select></label>;
}
export function FormModal({ title, onClose, children, busy, error }: { title: string; onClose: () => void; children: ReactNode; busy: boolean; error: string }) {
  const ref = useRef<HTMLDialogElement>(null), id = useId();
  useEffect(() => {
    const dialog = ref.current!; dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="learning-modal" aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="learning-modal-heading"><h2 id={id}>{title}</h2><button type="button" className="learning-icon-button" disabled={busy} onClick={onClose} aria-label="Đóng biểu mẫu"><X size={20} /></button></div>
    {error && <p className="learning-error" role="alert">{error}</p>}
    <fieldset disabled={busy}>{children}</fieldset>
  </dialog>;
}
