export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent';

export interface UserProfile {
  uid: string;
  email: string;
  phone?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  registrationNumber?: string;
  photoUrl?: string;
  dob?: string;
  gender?: 'male' | 'female';
  role: UserRole;
  schoolId?: string;
  classId?: string;
  studentId?: string; // For students
  parentStudentId?: string; // For parents (legacy)
  parentStudentIds?: string[]; // For parents (multiple children)
  createdAt?: string;
  points?: number; // Legacy
  xp?: number;
  coins?: number;
  level?: number;
  streakCount?: number;
  lastActivityDate?: string;
  purchasedItems?: string[];
  forcePasswordChange?: boolean;
  promotionHistory?: {
    from: string;
    to: string;
    date: string;
    sessionId: string;
  }[];
}

export interface School {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  address: string;
  location?: string;
  email: string;
  phone: string;
  logoUrl?: string;
  planId: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  currentSessionId?: string;
  currentTermId?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  studentLimit: number;
  features: string[];
}

export interface Class {
  id: string;
  name: string;
  schoolId: string;
  level?: 'primary' | 'secondary';
  createdAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  classId: string;
  teacherId: string;
  schoolId: string;
  createdAt?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  dueDate: string;
  questions: {
    id: string;
    text: string;
    type: 'multiple_choice' | 'short_answer';
    options?: string[];
    correctAnswer?: string;
  }[];
  createdAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  answers: {
    questionId: string;
    answer: string;
  }[];
  status: 'submitted' | 'graded';
  score?: number;
  totalScore?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  gradedBy?: string;
}

export interface Quiz {
  id: string;
  title: string;
  subjectId?: string;
  subject?: string;
  classId?: string;
  schoolId?: string;
  level?: string; // e.g., 'Primary 1'
  isRevision?: boolean;
  timeLimit?: number;
  rewardPoints?: number;
  questions: {
    question: string;
    options: string[];
    correctOption: number;
  }[];
}

export interface Session {
  id: string;
  name: string; // e.g., "2025/2026"
  schoolId: string;
  isCurrent: boolean;
  createdAt?: string;
}

export interface Term {
  id: string;
  name: string; // "1st Term", "2nd Term", "3rd Term"
  schoolId: string;
  sessionId: string;
  isCurrent: boolean;
  resumptionDate?: string; // ISO date string
  createdAt?: string;
}

export interface GradeScale {
  id: string;
  schoolId: string;
  grades: {
    grade: string;
    minScore: number;
    maxScore: number;
    remark: string;
  }[];
  caConfig?: {
    cas: { name: string; maxScore: number }[];
    maxExamScore: number;
  };
  promotionThreshold?: number; // Minimum average score to be promoted (default 40)
}

export interface Result {
  id: string;
  studentId: string;
  subjectId: string;
  schoolId: string;
  classId: string;
  sessionId: string;
  termId: string;
  teacherId?: string;
  quizId?: string;
  ca1: number | null;
  ca2: number | null;
  ca3: number | null;
  cas?: Record<string, number | null>;
  exam: number | null;
  caTotal: number;
  finalScore: number;
  grade: string;
  remark: string;
  score: number; // Legacy/Quiz compatibility
  total: number; // Legacy/Quiz compatibility
  date: string;
  isRevision?: boolean;
  createdAt: string;
  status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  adminComment?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  schoolId: string;
  teacherId?: string;
  teacherName?: string;
  classId?: string;
  studentId?: string;
  isSchoolWide: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  records: Record<string, 'present' | 'absent' | 'late' | 'excused'>;
  markedBy: string;
  createdAt: string;
}

export interface TimetablePeriod {
  id: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId?: string;
}

export interface Timetable {
  id: string;
  schoolId: string;
  classId: string;
  termId: string;
  schedule: Record<string, TimetablePeriod[]>; // e.g., { 'Monday': [...], 'Tuesday': [...] }
  updatedAt: string;
}

export interface GraduationStudent {
  id: string;
  name: string;
  photoUrl: string;
  schoolId: string;
}

export interface Lesson {
  id: string;
  subjectId: string;
  classId: string;
  title: string;
  level: string; // e.g., 'Primary 1'
  intro?: string;
  content: string;
  practice: {
    instruction: string;
    task: string;
  };
  quiz: {
    topic?: string;
    question: string;
    options: string[];
    correctOption: number;
    explanation?: string;
  }[];
  rewardPoints: number;
}

export interface LessonResult {
  id: string;
  userId: string;
  lessonId: string;
  subject: string;
  classLevel: string;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  coinsEarned: number;
  completedAt: string;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  classId: string; // 'all' or specific classId
  termId: string;
  sessionId: string;
  name: string; // e.g., "Tuition Fee", "Bus Fee"
  category: 'tuition' | 'activities' | 'miscellaneous';
  amount: number;
  isMandatory: boolean;
  createdAt: string;
}

export interface Invoice {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  termId: string;
  sessionId: string;
  amount: number;
  amountPaid: number;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  dueDate: string;
  items: { name: string; amount: number }[];
  createdAt: string;
}

export interface Payment {
  id: string;
  schoolId: string;
  invoiceId: string;
  studentId: string;
  parentId: string;
  amount: number;
  method: 'online' | 'cash' | 'transfer';
  reference: string;
  status: 'success' | 'failed' | 'pending';
  date: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  coinReward: number;
  type: 'daily' | 'weekly';
  targetType: 'quiz' | 'lesson' | 'game';
  targetCount: number;
  endDate: string;
}
