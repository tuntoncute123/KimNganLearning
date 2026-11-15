export type LearningRole = 'teacher' | 'student';
export type Attendance = 'present' | 'late' | 'absent' | 'excused';

export interface Learner { id: string; name: string; email: string }
export interface Classroom {
  id: string;
  name: string;
  subject: string;
  description: string;
  studentIds: string[];
  archived: boolean;
}
export interface LessonSession {
  id: string;
  classId: string;
  title: string;
  startsAt: string;
  duration: number;
  meetingUrl: string;
  objectives: string;
  attendance: Record<string, Attendance>;
}
export interface Assignment {
  id: string;
  classId: string;
  title: string;
  instructions: string;
  dueAt: string;
  maxScore: number;
  documentId: string;
}
export interface SubmissionAttachment { name: string; mimeType: string; data: ArrayBuffer }
export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  attachment?: SubmissionAttachment;
  submittedAt: string | null;
  score: number | null;
  feedback: string;
  gradedAt: string | null;
}
export interface ClassResource { id: string; classId: string; documentId: string; title: string }
export interface Announcement { id: string; classId: string; title: string; content: string; createdAt: string }
export interface LearningData {
  version: 1;
  classes: Classroom[];
  students: Learner[];
  sessions: LessonSession[];
  assignments: Assignment[];
  submissions: Submission[];
  resources: ClassResource[];
  announcements: Announcement[];
}
export const emptyLearningData = (): LearningData => ({
  version: 1, classes: [], students: [], sessions: [], assignments: [], submissions: [], resources: [], announcements: [],
});
