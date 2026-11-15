import type { Assignment, Attendance, Classroom, Learner, LearningData, LessonSession, SubmissionAttachment } from '../types/learning';

export type LearningChange = (data: LearningData) => void;
const required = (value: string, label: string, max = 200) => {
  const text = value.trim();
  if (!text || text.length > max) throw new Error(`${label} cần từ 1 đến ${max} ký tự.`);
  return text;
};
function activeClass(data: LearningData, id: string) {
  const classroom = data.classes.find(item => item.id === id && !item.archived);
  if (!classroom) throw new Error('Lớp học không còn hoạt động.');
  return classroom;
}
function date(value: string) {
  if (!value || !Number.isFinite(new Date(value).getTime())) throw new Error('Ngày giờ không hợp lệ.');
  return new Date(value).toISOString();
}
export function safeMeetingUrl(value: string) {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new Error('Link phòng học phải là địa chỉ https:// hợp lệ.'); }
}
export const saveClass = (input: Omit<Classroom, 'studentIds' | 'archived'>): LearningChange => data => {
  const name = required(input.name, 'Tên lớp', 100), subject = required(input.subject, 'Môn học', 100);
  const existing = data.classes.find(item => item.id === input.id);
  if (data.classes.some(item => item.id !== input.id && !item.archived && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error('Tên lớp này đã có. Hãy dùng tên khác.');
  }
  if (input.description.length > 2000) throw new Error('Mô tả tối đa 2.000 ký tự.');
  if (existing) Object.assign(existing, { name, subject, description: input.description.trim() });
  else data.classes.push({ ...input, name, subject, description: input.description.trim(), studentIds: [], archived: false });
};
export const archiveClass = (id: string, archived: boolean): LearningChange => data => {
  const classroom = data.classes.find(item => item.id === id);
  if (!classroom) throw new Error('Không tìm thấy lớp học.');
  classroom.archived = archived;
};
export const addStudent = (classId: string, student: Learner): LearningChange => data => {
  const classroom = activeClass(data, classId);
  const existing = data.students.find(item => item.id === student.id);
  if (!existing) {
    const name = required(student.name, 'Tên học sinh', 100), email = student.email.trim().toLowerCase();
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) throw new Error('Email không hợp lệ.');
    if (email && data.students.some(item => item.email === email)) throw new Error('Email đã có. Hãy chọn học sinh từ danh sách có sẵn.');
    data.students.push({ ...student, name, email });
  }
  if (classroom.studentIds.includes(student.id)) throw new Error('Học sinh đã có trong lớp.');
  classroom.studentIds.push(student.id);
};
export const saveSession = (input: Omit<LessonSession, 'attendance'>): LearningChange => data => {
  activeClass(data, input.classId);
  const existing = data.sessions.find(item => item.id === input.id);
  if (!Number.isInteger(input.duration) || input.duration < 5 || input.duration > 480) throw new Error('Thời lượng từ 5 đến 480 phút.');
  const startsAt = date(input.startsAt);
  const start = new Date(startsAt).getTime(), end = start + input.duration * 60000;
  if (data.sessions.some(item => item.id !== input.id && item.classId === input.classId &&
    new Date(item.startsAt).getTime() < end && new Date(item.startsAt).getTime() + item.duration * 60000 > start)) {
    throw new Error('Lịch bị trùng với buổi học khác của lớp.');
  }
  if (input.objectives.length > 5000) throw new Error('Nội dung buổi học tối đa 5.000 ký tự.');
  const session = { ...input, title: required(input.title, 'Tên buổi học'), startsAt, meetingUrl: safeMeetingUrl(input.meetingUrl) };
  if (existing) Object.assign(existing, session);
  else data.sessions.push({ ...session, attendance: {} });
};
export const markAttendance = (sessionId: string, records: Record<string, Attendance>): LearningChange => data => {
  const session = data.sessions.find(item => item.id === sessionId);
  if (!session) throw new Error('Không tìm thấy buổi học.');
  const classroom = activeClass(data, session.classId);
  for (const [studentId, status] of Object.entries(records)) {
    if (!classroom.studentIds.includes(studentId) || !['present', 'late', 'absent', 'excused'].includes(status)) {
      throw new Error('Dữ liệu điểm danh không hợp lệ.');
    }
  }
  session.attendance = { ...session.attendance, ...records };
};
export const saveAssignment = (input: Assignment): LearningChange => data => {
  activeClass(data, input.classId);
  if (!Number.isFinite(input.maxScore) || input.maxScore <= 0 || input.maxScore > 100) throw new Error('Thang điểm phải lớn hơn 0 và không quá 100.');
  const existing = data.assignments.find(item => item.id === input.id);
  if (existing && data.submissions.some(item => item.assignmentId === existing.id && item.submittedAt)) {
    if (input.maxScore !== existing.maxScore || input.classId !== existing.classId) throw new Error('Không thể đổi lớp hoặc thang điểm sau khi có bài nộp.');
  }
  const assignment = { ...input, title: required(input.title, 'Tên bài tập'), instructions: required(input.instructions, 'Yêu cầu bài tập', 10000), dueAt: date(input.dueAt) };
  if (existing) Object.assign(existing, assignment); else data.assignments.push(assignment);
};
export const saveSubmission = (assignmentId: string, studentId: string, content: string,
  attachment: SubmissionAttachment | undefined, submit: boolean): LearningChange => data => {
  const assignment = data.assignments.find(item => item.id === assignmentId);
  if (!assignment || !activeClass(data, assignment.classId).studentIds.includes(studentId)) throw new Error('Học sinh không thuộc lớp được giao bài.');
  const existing = data.submissions.find(item => item.assignmentId === assignmentId && item.studentId === studentId);
  if (existing?.gradedAt) throw new Error('Bài đã chấm. Không thể thay đổi nội dung.');
  if (!submit && existing?.submittedAt) throw new Error('Bài đã nộp. Hãy dùng Nộp lại bài để cập nhật.');
  if (submit && !content.trim() && !attachment) throw new Error('Hãy nhập bài làm hoặc đính kèm tài liệu.');
  if (content.length > 20000) throw new Error('Bài làm tối đa 20.000 ký tự.');
  if (attachment && (!(attachment.data instanceof ArrayBuffer) || attachment.data.byteLength > 10 * 1024 * 1024)) throw new Error('File bài nộp tối đa 10 MB.');
  const submission = { id: existing?.id ?? crypto.randomUUID(), assignmentId, studentId,
    content: content.trim(), attachment, submittedAt: submit ? new Date().toISOString() : null,
    score: null, feedback: '', gradedAt: null };
  if (existing) Object.assign(existing, submission); else data.submissions.push(submission);
};
export const gradeSubmission = (id: string, score: number, feedback: string): LearningChange => data => {
  const submission = data.submissions.find(item => item.id === id && item.submittedAt);
  const assignment = data.assignments.find(item => item.id === submission?.assignmentId);
  if (!submission || !assignment) throw new Error('Bài làm chưa được nộp.');
  activeClass(data, assignment.classId);
  if (!Number.isFinite(score) || score < 0 || score > assignment.maxScore) throw new Error(`Điểm phải từ 0 đến ${assignment.maxScore}.`);
  if (feedback.length > 5000) throw new Error('Nhận xét tối đa 5.000 ký tự.');
  Object.assign(submission, { score, feedback: feedback.trim(), gradedAt: new Date().toISOString() });
};
export const shareResource = (classId: string, documentId: string, title: string): LearningChange => data => {
  activeClass(data, classId);
  if (!documentId) throw new Error('Hãy chọn tài liệu.');
  if (data.resources.some(item => item.classId === classId && item.documentId === documentId)) throw new Error('Tài liệu đã được chia sẻ với lớp.');
  data.resources.push({ id: crypto.randomUUID(), classId, documentId, title: required(title, 'Tên học liệu') });
};
export const publishAnnouncement = (classId: string, title: string, content: string): LearningChange => data => {
  activeClass(data, classId);
  data.announcements.push({ id: crypto.randomUUID(), classId, title: required(title, 'Tiêu đề'), content: required(content, 'Nội dung', 5000), createdAt: new Date().toISOString() });
};
