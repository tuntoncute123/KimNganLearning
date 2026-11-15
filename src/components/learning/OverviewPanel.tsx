import { ArrowRight, CalendarDays, ClipboardList, GraduationCap, Users, BookOpen, TrendingUp } from 'lucide-react';
import { attendanceLabels, dateLabel, submissionStatus } from './format';
import { EmptyPanel, PanelHeading, type LearningPanelProps } from './shared';

export function OverviewPanel({ controller, role, studentId, classes, classId, now, onNavigate }: LearningPanelProps & { onNavigate: (section: string) => void }) {
  const { data } = controller;
  const selected = classes.filter(item => !classId || item.id === classId);
  const classIds = new Set(selected.map(item => item.id));
  const assignments = data.assignments.filter(item => classIds.has(item.classId));
  const submissions = data.submissions.filter(item => assignments.some(a => a.id === item.assignmentId) && item.submittedAt && (role === 'teacher' || item.studentId === studentId));
  const pending = role === 'teacher' ? submissions.filter(item => !item.gradedAt).length : assignments.filter(item => !submissions.some(s => s.assignmentId === item.id)).length;
  const sessions = data.sessions.filter(item => classIds.has(item.classId));
  const upcoming = sessions.filter(item => new Date(item.startsAt).getTime() + item.duration * 60000 >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const graded = submissions.filter(item => item.gradedAt);
  const average = graded.length ? (graded.reduce((sum, item) => sum + item.score! / assignments.find(a => a.id === item.assignmentId)!.maxScore * 10, 0) / graded.length).toFixed(1) : '—';
  const student = data.students.find(item => item.id === studentId);
  const notices = data.announcements.filter(item => classIds.has(item.classId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const tasks = assignments.filter(item => role === 'teacher' ? data.submissions.some(s => s.assignmentId === item.id && s.submittedAt && !s.gradedAt) : !submissions.some(s => s.assignmentId === item.id)).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 4);
  const attended = sessions.filter(item => ['present', 'late'].includes(item.attendance[studentId])).length;
  const recorded = sessions.filter(item => !!item.attendance[studentId]).length;
  const stats = role === 'teacher' ? [
    { label: 'Lớp đang dạy', number: selected.length, Icon: BookOpen, section: 'classes' },
    { label: 'Học sinh', number: new Set(selected.flatMap(c => c.studentIds)).size, Icon: Users, section: 'classes' },
    { label: 'Bài chờ chấm', number: pending, Icon: ClipboardList, section: 'assignments' },
    { label: 'Buổi học sắp tới', number: upcoming.length, Icon: CalendarDays, section: 'schedule' },
  ] : [
    { label: 'Lớp đang học', number: selected.length, Icon: BookOpen, section: 'resources' },
    { label: 'Bài cần nộp', number: pending, Icon: ClipboardList, section: 'assignments' },
    { label: 'Bài đã chấm', number: graded.length, Icon: GraduationCap, section: 'results' },
    { label: 'Điểm TB quy về /10', number: average, Icon: TrendingUp, section: 'results' },
  ];
  return <>
    <PanelHeading title={role === 'teacher' ? 'Hôm nay bạn sẽ dạy gì?' : `Chào ${student?.name || 'em'}, cùng học nhé!`} description={role === 'teacher' ? 'Mọi lớp học, bài cần chấm và lịch dạy trong một không gian.' : 'Theo dõi việc cần làm và tiến bộ của em mỗi ngày.'}>
      <button className="learning-primary" onClick={() => onNavigate(role === 'teacher' ? 'classes' : 'assignments')}>{role === 'teacher' ? 'Quản lý lớp học' : 'Xem bài tập'}<ArrowRight size={17} /></button>
    </PanelHeading>
    <div className="learning-stats">{stats.map(({ label, number, Icon, section }) => <button className="learning-stat" key={label} onClick={() => onNavigate(section)}><span className="learning-stat-icon"><Icon size={21} /></span><strong>{number}</strong><span>{label}</span></button>)}</div>
    {role === 'teacher' && !data.classes.length && <div className="learning-onboarding"><h3>Chuẩn bị lớp học đầu tiên</h3><p>Bắt đầu từ danh sách lớp, sau đó tổ chức lịch học và giao bài.</p><div className="learning-actions"><button onClick={() => onNavigate('classes')}>1. Tạo lớp & thêm học sinh</button><button onClick={() => onNavigate('schedule')}>2. Lên lịch học</button><button onClick={() => onNavigate('assignments')}>3. Giao bài tập</button></div></div>}
    <div className="learning-overview-grid"><section className="learning-card"><div className="learning-section-heading"><h3>Lịch học sắp tới</h3><button className="learning-link" onClick={() => onNavigate('schedule')}>Xem lịch<ArrowRight size={15} /></button></div>
      {!upcoming.length ? <p className="learning-muted">Chưa có buổi học sắp tới.</p> : upcoming.slice(0, 4).map(item => <div className="learning-summary-row" key={item.id}><span className="learning-small-icon"><CalendarDays size={19} /></span><div><strong>{item.title}</strong><p>{selected.find(c => c.id === item.classId)?.name} · {dateLabel(item.startsAt)}</p></div></div>)}
    </section><section className="learning-card"><div className="learning-section-heading"><h3>{role === 'teacher' ? 'Cần chấm bài' : 'Bài tập cần hoàn thành'}</h3><button className="learning-link" onClick={() => onNavigate('assignments')}>Xem bài tập<ArrowRight size={15} /></button></div>
      {!tasks.length ? <p className="learning-muted">Hiện không có bài tập cần xử lý.</p> : tasks.map(item => <div className="learning-summary-row" key={item.id}><span className="learning-small-icon"><ClipboardList size={19} /></span><div><strong>{item.title}</strong><p>Hạn nộp: {dateLabel(item.dueAt)}</p></div></div>)}
    </section></div>
    <section className="learning-card"><div className="learning-section-heading"><h3>Thông báo gần đây</h3><button className="learning-link" onClick={() => onNavigate('announcements')}>Xem tất cả<ArrowRight size={15} /></button></div>
      {!notices.length ? <p className="learning-muted">Chưa có thông báo mới.</p> : notices.map(item => <div className="learning-summary-row" key={item.id}><div><span className="learning-subject">{selected.find(c => c.id === item.classId)?.name}</span><h4>{item.title}</h4><p className="learning-excerpt learning-preserve">{item.content}</p></div><time>{dateLabel(item.createdAt)}</time></div>)}
    </section>
    {role === 'student' && <p className="learning-muted learning-attendance-summary">Chuyên cần: {attended}/{recorded} buổi đã điểm danh có mặt hoặc đi muộn. Xem chi tiết trong Lịch học.</p>}
  </>;
}

export function ResultsPanel({ controller, classes, classId, studentId }: LearningPanelProps) {
  const { data } = controller;
  const assignments = data.assignments.filter(item => classes.some(c => c.id === item.classId) && (!classId || item.classId === classId));
  const sessions = data.sessions.filter(item => classes.some(c => c.id === item.classId) && (!classId || item.classId === classId) && item.attendance[studentId]).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return <>
    <PanelHeading title="Kết quả học tập" description="Điểm số, nhận xét và lịch sử chuyên cần của em." />
    {!assignments.length ? <EmptyPanel title="Chưa có kết quả học tập">Khi giáo viên giao và chấm bài, kết quả sẽ xuất hiện ở đây.</EmptyPanel> : <div className="learning-card-grid">{assignments.map(item => {
      const submission = data.submissions.find(s => s.assignmentId === item.id && s.studentId === studentId);
      return <article className="learning-card" key={item.id}><span className="learning-subject">{classes.find(c => c.id === item.classId)?.name}</span><h3>{item.title}</h3><p>{submissionStatus(item, submission)}</p>
        {submission?.gradedAt && <div className="learning-feedback"><strong>{submission.score}/{item.maxScore} điểm</strong><p className="learning-preserve">{submission.feedback || 'Chưa có nhận xét.'}</p><small>Chấm lúc {dateLabel(submission.gradedAt)}</small></div>}
      </article>;
    })}</div>}
    <section className="learning-card learning-divider"><h3>Lịch sử điểm danh</h3>{!sessions.length ? <p className="learning-muted">Chưa có buổi học được điểm danh.</p> : sessions.map(item => <div className="learning-summary-row" key={item.id}><div><strong>{item.title}</strong><p>{classes.find(c => c.id === item.classId)?.name} · {dateLabel(item.startsAt)}</p></div><span className="learning-tag">{attendanceLabels[item.attendance[studentId]]}</span></div>)}</section>
  </>;
}
