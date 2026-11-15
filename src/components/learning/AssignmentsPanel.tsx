import { useState } from 'react';
import { Plus, FilePenLine, Download, Clock3 } from 'lucide-react';
import type { Assignment } from '../../types/learning';
import { AssignmentEditor, ReviewSubmissions, SubmissionForm } from './AssignmentForms';
import { dateLabel, downloadCsv, submissionStatus } from './format';
import { EmptyPanel, PanelHeading, type LearningPanelProps } from './shared';

export function AssignmentsPanel(props: LearningPanelProps) {
  const { controller, role, classes, classId, studentId, now } = props;
  const { data, setError } = controller;
  const [modal, setModal] = useState<{ mode: 'edit' | 'submit' | 'review'; assignment: Assignment | null } | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const assignments = data.assignments.filter(item => classes.some(c => c.id === item.classId) && (!classId || item.classId === classId))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const filtered = assignments.filter(item => {
    if (!item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())) return false;
    const submissions = data.submissions.filter(s => s.assignmentId === item.id && s.submittedAt);
    if (role === 'teacher') return filter === 'all' || (filter === 'pending' && submissions.some(s => !s.gradedAt)) || (filter === 'overdue' && new Date(item.dueAt).getTime() < now);
    const mine = submissions.find(s => s.studentId === studentId);
    return filter === 'all' || (filter === 'todo' && !mine) || (filter === 'submitted' && !!mine && !mine.gradedAt) || (filter === 'graded' && !!mine?.gradedAt);
  });
  const open = (mode: 'edit' | 'submit' | 'review', assignment: Assignment | null) => { setError(''); setModal({ mode, assignment }); };
  const exportGrades = () => {
    const rows: (string | number)[][] = [['Lớp', 'Bài tập', 'Học sinh', 'Trạng thái', 'Điểm', 'Thang điểm', 'Nhận xét', 'Nộp lúc']];
    for (const assignment of assignments) {
      const classroom = classes.find(c => c.id === assignment.classId)!;
      for (const id of classroom.studentIds) {
        const submission = data.submissions.find(s => s.assignmentId === assignment.id && s.studentId === id && s.submittedAt);
        rows.push([classroom.name, assignment.title, data.students.find(s => s.id === id)?.name ?? '', submissionStatus(assignment, submission), submission?.score ?? '', assignment.maxScore, submission?.feedback ?? '', submission?.submittedAt ? dateLabel(submission.submittedAt) : '']);
      }
    }
    downloadCsv(rows, 'bang-diem.csv');
  };
  return <>
    <PanelHeading title={role === 'teacher' ? 'Bài tập & chấm điểm' : 'Bài tập của em'} description={role === 'teacher' ? 'Giao yêu cầu rõ ràng, theo dõi bài nộp và gửi nhận xét cho từng học sinh.' : 'Xem yêu cầu, lưu bản nháp và nộp bài cho giáo viên.'}>
      {role === 'teacher' && <><button className="learning-secondary" disabled={!assignments.length} onClick={exportGrades}><Download size={16} />Xuất bảng điểm</button><button className="learning-primary" disabled={!classes.length} onClick={() => open('edit', null)}><Plus size={17} />Giao bài tập</button></>}
    </PanelHeading>
    <div className="learning-filter-row"><label className="learning-search">Tìm bài tập<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nhập tên bài tập…" /></label>
      <label>Trạng thái bài tập<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Tất cả bài tập</option>{role === 'teacher' ? <><option value="pending">Có bài chờ chấm</option><option value="overdue">Đã hết hạn nộp</option></> : <><option value="todo">Cần làm</option><option value="submitted">Đã nộp, chờ chấm</option><option value="graded">Đã chấm</option></>}</select></label></div>
    {!filtered.length && <EmptyPanel title={assignments.length ? 'Không có bài tập phù hợp' : 'Chưa có bài tập'}>{assignments.length ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.' : role === 'teacher' ? 'Tạo lớp và giao bài tập đầu tiên cho học sinh.' : 'Bài tập sẽ xuất hiện khi giáo viên giao cho lớp của em.'}</EmptyPanel>}
    <div className="learning-card-grid">{filtered.map(assignment => {
      const classroom = classes.find(c => c.id === assignment.classId)!;
      const submissions = data.submissions.filter(s => s.assignmentId === assignment.id && s.submittedAt);
      const mine = data.submissions.find(s => s.assignmentId === assignment.id && s.studentId === studentId);
      return <article className="learning-card" key={assignment.id}>
        <div className="learning-card-top"><span className="learning-subject">{classroom.name}</span><span className="learning-tag">{role === 'student' ? submissionStatus(assignment, mine) : `${submissions.length}/${classroom.studentIds.length} đã nộp`}</span></div>
        <h3>{assignment.title}</h3><p className="learning-excerpt learning-preserve">{assignment.instructions}</p>
        <p className="learning-meta"><Clock3 size={15} />Hạn: {dateLabel(assignment.dueAt)}</p>
        {role === 'teacher' ? <p className="learning-meta">{submissions.filter(s => !s.gradedAt).length} bài chờ chấm · Thang điểm {assignment.maxScore}</p> : mine?.gradedAt && <div className="learning-feedback"><strong>{mine.score}/{assignment.maxScore} điểm</strong><p className="learning-preserve">{mine.feedback || 'Chưa có nhận xét.'}</p></div>}
        <div className="learning-card-actions">{role === 'teacher' ? <><button onClick={() => open('review', assignment)}><FilePenLine size={16} />Xem & chấm bài</button><button onClick={() => open('edit', assignment)}>Sửa bài tập</button></> : <button className="learning-primary" onClick={() => open('submit', assignment)}>{mine?.gradedAt ? 'Xem bài & nhận xét' : mine?.submittedAt ? 'Xem bài đã nộp' : 'Làm bài'}</button>}</div>
      </article>;
    })}</div>
    {modal?.mode === 'edit' && <AssignmentEditor {...props} assignment={modal.assignment} onClose={() => setModal(null)} />}
    {modal?.mode === 'submit' && modal.assignment && <SubmissionForm {...props} assignment={modal.assignment} onClose={() => setModal(null)} />}
    {modal?.mode === 'review' && modal.assignment && <ReviewSubmissions {...props} assignment={modal.assignment} onClose={() => setModal(null)} />}
  </>;
}
