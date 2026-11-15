import { useState } from 'react';
import { Plus, ExternalLink } from 'lucide-react';
import type { Attendance, LessonSession } from '../../types/learning';
import { markAttendance, saveSession } from '../../services/learningActions';
import { attendanceLabels, value } from './format';
import { ScheduleBoard } from './ScheduleBoard';
import { scheduleDate, scheduleDayLabel, scheduleRange, scheduleTime } from './scheduleDates';
import '../../schedule.css';
import { ClassField, EmptyPanel, FormModal, PanelHeading, type LearningPanelProps } from './shared';

export function SchedulePanel({ controller, classes, classId, role, studentId, now }: LearningPanelProps) {
  const { data, busy, error, setError, commit } = controller;
  const [editing, setEditing] = useState<LessonSession | 'new' | null>(null);
  const [attendanceId, setAttendanceId] = useState('');
  const [day, setDay] = useState(() => scheduleDate(now));
  const [period, setPeriod] = useState('upcoming');
  const [marks, setMarks] = useState<Record<string, Attendance>>({});
  const session = data.sessions.find(item => item.id === attendanceId);
  const roster = data.classes.find(item => item.id === session?.classId);
  const allowedSessions = data.sessions.filter(item => classes.some(c => c.id === item.classId) && (!classId || item.classId === classId));
  const sessions = allowedSessions
    .filter(item => period === 'all' || (period === 'upcoming' ? new Date(item.startsAt).getTime() + item.duration * 60000 >= now : new Date(item.startsAt).getTime() + item.duration * 60000 < now))
    .sort((a, b) => period === 'past' ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt));
  const createSession = (date: string) => { setDay(date); setError(''); setEditing('new'); };
  return <div className="learning-schedule">
    <PanelHeading title={role === 'teacher' ? 'Thời khóa biểu' : 'Lịch học & điểm danh'} description={role === 'teacher' ? 'Sắp xếp lịch giảng dạy, theo dõi buổi học và điểm danh theo lớp.' : 'Theo dõi lịch học, nội dung chuẩn bị và điểm danh của em.'}>
      {role === 'teacher' && <button className="learning-primary" disabled={!classes.length} onClick={() => createSession(day)}><Plus size={17} />Lên lịch buổi học</button>}
    </PanelHeading>
    {role === 'teacher' ? <>
      {!classes.length && <EmptyPanel title="Chưa có lớp học">Tạo lớp học trước để bắt đầu lên thời khóa biểu. <a href="#/teacher/classes">Đến quản lý lớp học</a>.</EmptyPanel>}
      <ScheduleBoard sessions={allowedSessions} classes={classes} day={day} now={now} onDay={setDay} onCreate={createSession}
        onEdit={item => { setError(''); setEditing(item); }}
        onAttendance={item => { setError(''); setAttendanceId(item.id); setMarks({ ...item.attendance }); }} />
    </> : <>
      <div className="learning-filter-row"><label>Hiển thị<select aria-label="Hiển thị" value={period} onChange={event => setPeriod(event.target.value)}><option value="upcoming">Sắp tới & đang diễn ra</option><option value="past">Đã kết thúc</option><option value="all">Tất cả buổi học</option></select></label><span className="schedule-list-count">{sessions.length} buổi học · Giờ Việt Nam (UTC+7)</span></div>
      {!sessions.length && <EmptyPanel title="Chưa có buổi học trong khoảng này">Lịch học do giáo viên thêm sẽ xuất hiện tại đây. Chọn Tất cả buổi học để xem lịch cũ.</EmptyPanel>}
      <div className="student-schedule-list">{sessions.map(item => {
        const classroom = classes.find(c => c.id === item.classId)!;
        const ended = new Date(item.startsAt).getTime() + item.duration * 60000 < now;
        return <article className="student-session-card" key={item.id}>
          <div className="student-session-top"><strong>{scheduleDayLabel(scheduleDate(item.startsAt))} · {scheduleRange(item.startsAt, item.duration)}</strong><span className={`schedule-badge${ended ? ' is-done' : ''}`}>{ended ? 'Đã kết thúc' : new Date(item.startsAt).getTime() <= now ? 'Đang diễn ra' : 'Sắp tới'}</span></div>
          <p className="student-session-class">{classroom.name} · {item.duration} phút</p>
          <h3>{item.title}</h3>
          {item.objectives && <p className="learning-preserve">{item.objectives}</p>}
          <div className="student-session-bottom"><span className="schedule-badge is-done">Điểm danh: {attendanceLabels[item.attendance[studentId]] || 'Chưa điểm danh'}</span>
            {item.meetingUrl && <a className="learning-secondary" href={item.meetingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Vào phòng học</a>}
          </div>
        </article>;
      })}</div>
    </>}
    {editing && <FormModal title={editing === 'new' ? 'Lên lịch buổi học' : 'Chỉnh sửa buổi học'} busy={busy} error={error} onClose={() => setEditing(null)}>
      <form className="learning-form" onSubmit={async event => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        if (await commit(saveSession({ id: editing === 'new' ? crypto.randomUUID() : editing.id,
          classId: editing === 'new' ? value(form, 'classId') : editing.classId,
          title: value(form, 'title'), startsAt: `${value(form, 'startsAt')}:00+07:00`, duration: Number(value(form, 'duration')),
          meetingUrl: value(form, 'meetingUrl'), objectives: value(form, 'objectives'),
        }), 'Đã lưu lịch học.')) { setDay(value(form, 'startsAt').slice(0, 10)); setEditing(null); }
      }}>
        <ClassField classes={classes} classId={editing === 'new' ? classId : editing.classId} disabled={editing !== 'new'} />
        <label>Tên buổi học<input name="title" required maxLength={200} defaultValue={editing === 'new' ? '' : editing.title} /></label>
        <p className="learning-muted">Thời gian buổi học theo giờ Việt Nam (UTC+7).</p>
        <div className="learning-form-grid"><label>Bắt đầu lúc<input type="datetime-local" name="startsAt" required defaultValue={editing === 'new' ? `${day}T18:00` : `${scheduleDate(editing.startsAt)}T${scheduleTime(editing.startsAt)}`} /></label>
          <label>Thời lượng (phút)<input type="number" name="duration" min={5} max={480} step={1} required defaultValue={editing === 'new' ? 60 : editing.duration} /></label></div>
        <label>Link phòng học (không bắt buộc)<input type="url" name="meetingUrl" placeholder="https://meet.google.com/…" defaultValue={editing === 'new' ? '' : editing.meetingUrl} /></label>
        <label>Nội dung & chuẩn bị<textarea name="objectives" rows={4} maxLength={5000} defaultValue={editing === 'new' ? '' : editing.objectives} /></label>
        <button className="learning-primary" type="submit">Lưu lịch học</button>
      </form>
    </FormModal>}
    {session && roster && <FormModal title={`Điểm danh · ${session.title}`} busy={busy} error={error} onClose={() => setAttendanceId('')}>
      {!roster.studentIds.length ? <p>Lớp chưa có học sinh. Thêm học sinh ở mục Lớp học trước.</p> : <form className="learning-form" onSubmit={async event => {
        event.preventDefault(); if (await commit(markAttendance(session.id, marks), 'Đã lưu điểm danh.')) setAttendanceId('');
      }}>
        <button type="button" className="learning-secondary" onClick={() => setMarks(Object.fromEntries(roster.studentIds.map(id => [id, 'present'])))}>Đánh dấu tất cả có mặt</button>
        {roster.studentIds.map(id => <label className="learning-attendance-row" key={id}>{data.students.find(item => item.id === id)?.name}
          <select aria-label={`Điểm danh ${data.students.find(item => item.id === id)?.name}`} value={marks[id] || ''} onChange={event => setMarks(previous => ({ ...previous, [id]: event.target.value as Attendance }))} required>
            <option value="" disabled>Chưa điểm danh</option>{Object.entries(attendanceLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select></label>)}
        <button className="learning-primary" type="submit">Lưu điểm danh</button>
      </form>}
    </FormModal>}
  </div>;
}
