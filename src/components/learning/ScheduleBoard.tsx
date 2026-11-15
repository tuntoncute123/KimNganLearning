import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus } from 'lucide-react';
import type { Classroom, LessonSession } from '../../types/learning';
import { mondayOf, scheduleDate, scheduleDayLabel, scheduleRange, shiftDate } from './scheduleDates';

interface Props {
  sessions: LessonSession[];
  classes: Classroom[];
  day: string;
  now: number;
  onDay: (day: string) => void;
  onCreate: (day: string) => void;
  onEdit: (session: LessonSession) => void;
  onAttendance: (session: LessonSession) => void;
}

export function ScheduleBoard({ sessions, classes, day, now, onDay, onCreate, onEdit, onAttendance }: Props) {
  const [view, setView] = useState<'day' | 'week'>('week');
  const today = scheduleDate(now);
  const start = view === 'week' ? mondayOf(day) : day;
  const dates = Array.from({ length: view === 'week' ? 7 : 1 }, (_, index) => shiftDate(start, index));
  const visible = sessions.filter(session => dates.includes(scheduleDate(session.startsAt)))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return <section className="schedule-board" aria-label="Lịch giảng dạy">
    <div className="schedule-heading">
      <div><h3>Lịch giảng dạy</h3><p aria-live="polite">{scheduleDayLabel(start)}{view === 'week' ? ` – ${scheduleDayLabel(dates[6])}` : ''} · {visible.length} buổi học</p></div>
      <div className="schedule-mode" role="group" aria-label="Chế độ xem lịch">
        <button type="button" aria-pressed={view === 'day'} onClick={() => setView('day')}>Ngày</button>
        <button type="button" aria-pressed={view === 'week'} onClick={() => setView('week')}>Tuần</button>
      </div>
    </div>
    <div className="schedule-navigation">
      <button type="button" className="schedule-icon-button" aria-label={view === 'week' ? 'Tuần trước' : 'Ngày trước'} onClick={() => onDay(shiftDate(day, view === 'week' ? -7 : -1))}><ChevronLeft size={18} /></button>
      <input type="date" aria-label="Chọn ngày xem lịch" value={day} onChange={event => { if (event.target.value) onDay(event.target.value); }} />
      <button type="button" className="schedule-icon-button" aria-label={view === 'week' ? 'Tuần sau' : 'Ngày sau'} onClick={() => onDay(shiftDate(day, view === 'week' ? 7 : 1))}><ChevronRight size={18} /></button>
      <button type="button" className="learning-secondary" onClick={() => onDay(today)}>Hôm nay</button>
    </div>
    <div className={view === 'week' ? 'schedule-week' : 'schedule-day-list'}>
      {dates.map(date => {
        const lessons = visible.filter(session => scheduleDate(session.startsAt) === date);
        return <section key={date} className={`schedule-day${date === today ? ' is-today' : ''}`} aria-label={scheduleDayLabel(date)}>
          <h4><time dateTime={date}>{scheduleDayLabel(date)}</time>{date === today && <span>Hôm nay</span>}</h4>
          {lessons.map(session => {
            const classroom = classes.find(item => item.id === session.classId)!;
            const marked = classroom.studentIds.filter(id => session.attendance[id]).length;
            const ongoing = new Date(session.startsAt).getTime() <= now && new Date(session.startsAt).getTime() + session.duration * 60000 > now;
            return <article key={session.id} className={`calendar-lesson schedule-color-${classes.indexOf(classroom) % 3}`}>
              <p className="calendar-time">{scheduleRange(session.startsAt, session.duration)}</p>
              <strong>{classroom.name}</strong>
              <h5 className="calendar-topic">{session.title}</h5>
              {session.objectives && <p className="calendar-objectives learning-preserve">{session.objectives}</p>}
              {ongoing && <span className="calendar-live">Đang diễn ra</span>}
              <p className="calendar-status">{marked ? `${marked}/${classroom.studentIds.length} đã điểm danh` : 'Chưa điểm danh'}</p>
              <div className="calendar-actions">
                <button type="button" onClick={() => onEdit(session)} aria-label={`Sửa lịch ${session.title}`}><Pencil size={13} />Sửa lịch</button>
                <button type="button" onClick={() => onAttendance(session)}>Điểm danh</button>
                {session.meetingUrl && <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} />Vào phòng học</a>}
              </div>
            </article>;
          })}
          {!lessons.length && <p className="calendar-free">Chưa có buổi học</p>}
          <button type="button" className="calendar-add" disabled={!classes.length} aria-label={`Thêm buổi học ${scheduleDayLabel(date)}`} onClick={() => onCreate(date)}><Plus size={15} />Thêm buổi học</button>
        </section>;
      })}
    </div>
    <div className="schedule-footer"><CalendarDays size={14} />Giờ Việt Nam (UTC+7) · Chọn ngày để thêm buổi học, sửa lịch hoặc điểm danh.</div>
  </section>;
}
