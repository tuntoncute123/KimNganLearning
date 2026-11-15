import { useState } from 'react';
import { BookOpen, CalendarDays, ClipboardList, GraduationCap, LayoutDashboard, Megaphone, Moon, Sun, Users } from 'lucide-react';
import type { DocumentMetadata } from '../../types/document';
import type { LearningRole } from '../../types/learning';
import { useLearning } from '../../hooks/useLearning';
import { useLearningClock } from '../../hooks/useLearningClock';
import { ClassesPanel } from './ClassesPanel';
import { SchedulePanel } from './SchedulePanel';
import { AssignmentsPanel } from './AssignmentsPanel';
import { AnnouncementsPanel, ResourcesPanel } from './ResourcesPanel';
import { OverviewPanel, ResultsPanel } from './OverviewPanel';
import { EmptyPanel, type LearningPanelProps } from './shared';

interface Props {
  role: LearningRole;
  section: string;
  documents: DocumentMetadata[];
  onOpenDocument: (id: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}
export default function LearningPortal({ role, section, documents, onOpenDocument, theme, onToggleTheme }: Props) {
  const controller = useLearning();
  const now = useLearningClock();
  const { data, busy, loading, ready, error, message, setError, setMessage, reload } = controller;
  const [classSelection, setClassSelection] = useState('');
  const [studentSelection, setStudentSelection] = useState(() => {
    try { return localStorage.getItem('kimngan_selected_student') || ''; } catch { return ''; }
  });
  const studentId = data.students.some(item => item.id === studentSelection) ? studentSelection : data.students[0]?.id ?? '';
  const classes = data.classes.filter(item => !item.archived && (role === 'teacher' || item.studentIds.includes(studentId)));
  const classId = classes.some(item => item.id === classSelection) ? classSelection : '';
  const navigation = [
    { id: 'overview', label: 'Tổng quan', Icon: LayoutDashboard },
    ...(role === 'teacher' ? [{ id: 'classes', label: 'Lớp học & học sinh', Icon: Users }] : []),
    { id: 'schedule', label: role === 'teacher' ? 'Thời khóa biểu' : 'Lịch học & điểm danh', Icon: CalendarDays },
    { id: 'assignments', label: role === 'teacher' ? 'Bài tập & chấm điểm' : 'Bài tập của em', Icon: ClipboardList },
    { id: 'resources', label: 'Học liệu', Icon: BookOpen },
    ...(role === 'student' ? [{ id: 'results', label: 'Kết quả học tập', Icon: GraduationCap }] : []),
    { id: 'announcements', label: 'Thông báo', Icon: Megaphone },
  ];
  const activeSection = navigation.some(item => item.id === section) ? section : 'overview';
  const navigate = (next: string) => { window.location.hash = `/${role}/${next}`; setError(''); setMessage(''); };
  const props: LearningPanelProps = { controller, role, now, studentId, classes, classId, documents, onOpenDocument };
  return <div className="learning-portal">
    <aside className="learning-sidebar">
      <a className="learning-brand" href={`#/${role}`}><span className="learning-brand-icon"><GraduationCap size={24} /></span><span>Kim Ngân<strong>LEARNING</strong></span></a>
      <p className="learning-sidebar-caption">{role === 'teacher' ? 'KHÔNG GIAN GIÁO VIÊN' : 'KHÔNG GIAN HỌC SINH'}</p>
      <nav aria-label={role === 'teacher' ? 'Điều hướng giáo viên' : 'Điều hướng học sinh'}>{navigation.map(({ id, label, Icon }) => <a key={id} href={`#/${role}/${id}`} aria-current={activeSection === id ? 'page' : undefined} onClick={() => { setError(''); setMessage(''); }}><Icon size={19} />{label}</a>)}</nav>
      <div className="learning-sidebar-bottom"><BookOpen size={22} /><strong>Sẵn sàng cho buổi học</strong><p>Mở tài liệu, viết công thức và trình bày trực tiếp.</p><a href="#/workspace">Vào phòng giảng bài →</a></div>
    </aside>
    <div className="learning-body">
      <header className="learning-topbar"><div><span>{role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</span><strong>{navigation.find(item => item.id === activeSection)?.label}</strong></div>
        <div className="learning-topbar-actions"><span className="learning-save-indicator" role="status">{loading ? 'Đang mở dữ liệu…' : busy ? 'Đang lưu…' : ready ? 'Lưu tại thiết bị' : 'Chưa mở được dữ liệu'}</span><button className="learning-icon-button" aria-label="Đổi giao diện" onClick={onToggleTheme}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><span className="learning-avatar">{role === 'teacher' ? 'GV' : 'HS'}</span></div>
      </header>
      <main className="learning-content" id="learning-content">
        <div className="learning-local-note"><span><strong>Chế độ dùng trên máy này.</strong> Chọn vai trò/hồ sơ để thao tác; chưa có đăng nhập hay đồng bộ sang thiết bị khác.</span></div>
        {error && <div className="learning-error" role="alert">{error}<button onClick={() => void reload()}>Tải lại dữ liệu</button></div>}
        {message && <div className="learning-success" role="status">{message}<button aria-label="Đóng thông báo thành công" onClick={() => setMessage('')}>×</button></div>}
        {loading ? <p role="status">Đang tải lớp học…</p> : !ready ? <EmptyPanel title="Chưa thể mở dữ liệu lớp học">Bấm Tải lại dữ liệu để thử lại. Các thao tác ghi dữ liệu đang tạm khóa.</EmptyPanel> : <>
          <div className="learning-context">
            {role === 'student' && <label>Hồ sơ học sinh<select aria-label="Hồ sơ học sinh" value={studentId} onChange={event => {
              setStudentSelection(event.target.value); setClassSelection(''); setError(''); setMessage('');
              try { localStorage.setItem('kimngan_selected_student', event.target.value); } catch { /* Profile selection is optional; classroom data uses IndexedDB. */ }
            }}><option value="" disabled>Chưa có hồ sơ học sinh</option>{data.students.map(item => <option key={item.id} value={item.id}>{item.name}{item.email ? ` · ${item.email}` : ''}</option>)}</select></label>}
            <label>Lọc theo lớp<select value={classId} onChange={event => setClassSelection(event.target.value)}><option value="">Tất cả lớp học</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <span>{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)}</span>
          </div>
          {role === 'student' && !studentId ? <EmptyPanel title="Chưa có hồ sơ học sinh">Giáo viên cần tạo lớp và thêm học sinh trước. <a href="#/teacher/classes">Đến trang quản lý lớp</a>.</EmptyPanel> : <div key={`${role}-${role === 'student' ? studentId : ''}-${activeSection === 'schedule' ? '' : classId}-${activeSection}`}>
            {activeSection === 'overview' && <OverviewPanel {...props} onNavigate={navigate} />}
            {activeSection === 'classes' && <ClassesPanel {...props} />}
            {activeSection === 'schedule' && <SchedulePanel {...props} />}
            {activeSection === 'assignments' && <AssignmentsPanel {...props} />}
            {activeSection === 'resources' && <ResourcesPanel {...props} />}
            {activeSection === 'announcements' && <AnnouncementsPanel {...props} />}
            {activeSection === 'results' && <ResultsPanel {...props} />}
          </div>}
        </>}
      </main>
    </div>
  </div>;
}
