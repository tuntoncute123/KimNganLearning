import { useState } from 'react';
import type { Assignment, Submission, SubmissionAttachment } from '../../types/learning';
import { gradeSubmission, saveAssignment, saveSubmission } from '../../services/learningActions';
import { validateDocumentFile } from '../../services/fileValidation';
import { dateLabel, downloadBlob, localDateInput, submissionStatus, value } from './format';
import { ClassField, DocumentField, FormModal, type LearningPanelProps } from './shared';

type Props = LearningPanelProps & { onClose: () => void };
export function AssignmentEditor({ assignment, onClose, controller, classes, classId, documents }: Props & { assignment: Assignment | null }) {
  const { commit, busy, error } = controller;
  return <FormModal title={assignment ? 'Chỉnh sửa bài tập' : 'Giao bài tập'} onClose={onClose} busy={busy} error={error}>
    <form className="learning-form" onSubmit={async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      if (await commit(saveAssignment({ id: assignment?.id ?? crypto.randomUUID(), classId: assignment?.classId ?? value(form, 'classId'),
        title: value(form, 'title'), instructions: value(form, 'instructions'), dueAt: value(form, 'dueAt'),
        maxScore: Number(value(form, 'maxScore')), documentId: value(form, 'documentId'),
      }), 'Đã lưu bài tập. Học sinh trong lớp có thể xem và nộp bài.')) onClose();
    }}>
      <ClassField classes={classes} classId={assignment?.classId ?? classId} disabled={!!assignment} />
      <label>Tên bài tập<input name="title" required maxLength={200} defaultValue={assignment?.title} /></label>
      <label>Yêu cầu bài tập<textarea name="instructions" rows={5} required maxLength={10000} defaultValue={assignment?.instructions} /></label>
      <div className="learning-form-grid"><label>Hạn nộp<input name="dueAt" type="datetime-local" required defaultValue={assignment ? localDateInput(assignment.dueAt) : ''} /></label>
        <label>Thang điểm<input name="maxScore" type="number" min={0.1} max={100} step="any" required defaultValue={assignment?.maxScore ?? 10} /></label></div>
      <DocumentField documents={documents} documentId={assignment?.documentId} />
      <p className="learning-muted">Học sinh có thể nộp muộn; thời gian nộp được ghi lại. Thang điểm được giữ cố định khi đã có bài nộp.</p>
      <button className="learning-primary" type="submit">Lưu bài tập</button>
    </form>
  </FormModal>;
}

export function SubmissionForm({ assignment, onClose, controller, studentId, documents, onOpenDocument }: Props & { assignment: Assignment }) {
  const { data, busy, error, setError, commit } = controller;
  const submission = data.submissions.find(item => item.assignmentId === assignment.id && item.studentId === studentId);
  const [content, setContent] = useState(submission?.content ?? '');
  const [attachment, setAttachment] = useState<SubmissionAttachment | undefined>(submission?.attachment);
  const [reading, setReading] = useState(false);
  const graded = !!submission?.gradedAt;
  const document = documents.find(item => item.id === assignment.documentId);
  const save = async (submit: boolean) => {
    if (await commit(saveSubmission(assignment.id, studentId, content, attachment, submit), submit ? 'Đã nộp bài. Giáo viên có thể xem và chấm điểm.' : 'Đã lưu bản nháp. Bài chưa được nộp cho giáo viên.')) onClose();
  };
  return <FormModal title={assignment.title} onClose={onClose} busy={busy || reading} error={error}>
    <p className="learning-muted">Hạn nộp: {dateLabel(assignment.dueAt)} · Thang điểm {assignment.maxScore} · {submissionStatus(assignment, submission)}</p>
    <p className="learning-preserve learning-instructions">{assignment.instructions}</p>
    {document && <button className="learning-secondary" onClick={() => onOpenDocument(document.id)}>Mở tài liệu: {document.name}</button>}
    {assignment.documentId && !document && <p className="learning-muted">Tài liệu đính kèm không còn trên thiết bị này.</p>}
    {graded && <div className="learning-feedback"><strong>Điểm: {submission!.score}/{assignment.maxScore}</strong><p className="learning-preserve">{submission!.feedback || 'Giáo viên chưa thêm nhận xét.'}</p><small>Bài đã chấm, không thể nộp lại.</small></div>}
    <form className="learning-form learning-divider" onSubmit={event => { event.preventDefault(); void save(true); }}>
      <label>Bài làm của em<textarea rows={7} maxLength={20000} value={content} onChange={event => setContent(event.target.value)} readOnly={graded} placeholder="Trình bày cách làm và đáp án…" /></label>
      {!graded && <label>Đính kèm bài làm (PDF, Word, ảnh · tối đa 10 MB)<input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.gif" onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        setReading(true); setError('');
        try {
          if (file.size > 10 * 1024 * 1024) throw new Error('File bài nộp tối đa 10 MB.');
          const format = await validateDocumentFile(file);
          setAttachment({ name: file.name, mimeType: format.mimeType, data: await file.arrayBuffer() });
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể đọc file bài nộp.'); }
        finally { setReading(false); }
      }} /></label>}
      {reading && <p role="status">Đang đọc file bài làm…</p>}
      {attachment && <div className="learning-attachment"><button className="learning-link" type="button" onClick={() => downloadBlob(new Blob([attachment.data], { type: attachment.mimeType }), attachment.name)}>{attachment.name}</button>{!graded && <button type="button" onClick={() => setAttachment(undefined)}>Bỏ đính kèm</button>}</div>}
      {!graded && <div className="learning-actions">{!submission?.submittedAt && <button className="learning-secondary" type="button" onClick={() => void save(false)}>Lưu bản nháp</button>}<button className="learning-primary" type="submit">{submission?.submittedAt ? 'Nộp lại bài' : 'Nộp bài'}</button></div>}
    </form>
  </FormModal>;
}

function GradeForm({ submission, assignment, controller }: { submission: Submission; assignment: Assignment; controller: LearningPanelProps['controller'] }) {
  return <form className="learning-form" onSubmit={async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await controller.commit(gradeSubmission(submission.id, Number(value(form, 'score')), value(form, 'feedback')), 'Đã lưu điểm và nhận xét.');
  }}>
    <label>Điểm (tối đa {assignment.maxScore})<input name="score" type="number" required min={0} max={assignment.maxScore} step="any" defaultValue={submission.score ?? ''} /></label>
    <label>Nhận xét của giáo viên<textarea name="feedback" rows={3} maxLength={5000} defaultValue={submission.feedback} /></label>
    <button className="learning-primary" type="submit">{submission.gradedAt ? 'Cập nhật điểm' : 'Lưu điểm & nhận xét'}</button>
  </form>;
}

export function ReviewSubmissions({ assignment, onClose, controller }: Props & { assignment: Assignment }) {
  const { data, busy, error } = controller;
  const classroom = data.classes.find(item => item.id === assignment.classId)!;
  return <FormModal title={`Chấm bài · ${assignment.title}`} onClose={onClose} busy={busy} error={error}>
    <p className="learning-muted">Chỉ hiển thị nội dung đã nộp; bản nháp thuộc trang học sinh.</p>
    {!classroom.studentIds.length && <p>Lớp chưa có học sinh.</p>}
    {classroom.studentIds.map(id => {
      const student = data.students.find(item => item.id === id)!;
      const submission = data.submissions.find(item => item.assignmentId === assignment.id && item.studentId === id && item.submittedAt);
      return <section className="learning-review" key={id} aria-label={`Bài nộp của ${student.name}`}>
        <div className="learning-card-top"><h3>{student.name}</h3><span className="learning-tag">{submissionStatus(assignment, submission)}</span></div>
        {submission ? <><p className="learning-muted">Nộp lúc {dateLabel(submission.submittedAt!)}</p><p className="learning-answer learning-preserve">{submission.content || 'Bài làm trong file đính kèm.'}</p>
          {submission.attachment && <button className="learning-secondary" onClick={() => downloadBlob(new Blob([submission.attachment!.data], { type: submission.attachment!.mimeType }), submission.attachment!.name)}>Tải bài làm: {submission.attachment.name}</button>}
          <GradeForm key={`${submission.id}-${submission.gradedAt}`} submission={submission} assignment={assignment} controller={controller} />
          {submission.gradedAt && <p className="learning-success">Đã chấm: {submission.score}/{assignment.maxScore}</p>}
        </> : <p className="learning-muted">Chưa có bài nộp để chấm.</p>}
      </section>;
    })}
  </FormModal>;
}
