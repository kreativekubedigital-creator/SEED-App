import { db, collection, getDocs, query, where } from '../lib/compatibility';
import { Result, AttendanceRecord, Invoice, Payment, UserProfile, Class, Subject } from '../types';

export interface AnalyticsData {
  overview: {
    students: { total: number };
    teachers: { total: number };
    finance: { totalExpected: number; totalCollected: number; outstanding: number };
    attendance: { studentRate: number };
  };
  academics: {
    classRankings: { name: string; score: number }[];
    gradeDistribution: { name: string; value: number }[];
  };
  finance: {
    paymentStatus: { name: string; value: number; color: string }[];
  };
}

export const fetchSchoolAnalytics = async (schoolId: string, sessionId?: string, termId?: string): Promise<AnalyticsData> => {
  // 1. Fetch Basic Collections
  const usersSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId)));
  const users = usersSnap.docs.map(d => d.data() as UserProfile);
  
  const classesSnap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Class));

  const subjectsSnap = await getDocs(collection(db, 'schools', schoolId, 'subjects'));
  const subjects = subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));

  // 2. Fetch Performance Data
  let resultsQuery = query(collection(db, 'schools', schoolId, 'results'));
  if (sessionId) resultsQuery = query(resultsQuery, where('sessionId', '==', sessionId));
  if (termId) resultsQuery = query(resultsQuery, where('termId', '==', termId));
  const resultsSnap = await getDocs(resultsQuery);
  const results = resultsSnap.docs.map(d => d.data() as Result);

  // 3. Fetch Finance Data
  const invoicesSnap = await getDocs(collection(db, 'schools', schoolId, 'invoices'));
  const invoices = invoicesSnap.docs.map(d => d.data() as Invoice);
  const paymentsSnap = await getDocs(collection(db, 'schools', schoolId, 'payments'));
  const payments = paymentsSnap.docs.map(d => d.data() as Payment);

  // 4. Fetch Attendance Data
  const attendanceSnap = await getDocs(collection(db, 'schools', schoolId, 'attendance'));
  const attendanceRecords = attendanceSnap.docs.map(d => d.data() as AttendanceRecord);

  // --- PROCESSING ---

  // Counts
  const students = users.filter(u => u.role === 'student');
  const teachers = users.filter(u => u.role === 'teacher');

  // Attendance Rates
  const calculateAttendanceRate = (records: AttendanceRecord[]) => {
    if (records.length === 0) return 0;
    let totalPossible = 0;
    let totalPresent = 0;
    records.forEach(rec => {
      Object.values(rec.records).forEach(status => {
        totalPossible++;
        if (status === 'present' || status === 'late') totalPresent++;
      });
    });
    return totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;
  };
  const studentAttendanceRate = calculateAttendanceRate(attendanceRecords);

  // Academics
  const classPerformance = classes.map(c => {
    const classResults = results.filter(r => r.classId === c.id);
    const avg = classResults.length > 0 ? classResults.reduce((sum, r) => sum + (r.finalScore || r.score || 0), 0) / classResults.length : 0;
    return { name: c.name, score: Math.round(avg) };
  }).sort((a, b) => b.score - a.score);

  // Finance
  const totalExpected = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCollected = payments.filter(p => p.status === 'success').reduce((sum, p) => sum + p.amount, 0);
  const outstanding = Math.max(0, totalExpected - totalCollected);

  // Grade Distribution
  const grades = ['A', 'B', 'C', 'D', 'F'];
  const gradeDist = grades.map(g => ({
    name: g,
    value: results.filter(r => r.grade === g).length
  }));

  return {
    overview: {
      students: { total: students.length },
      teachers: { total: teachers.length },
      finance: { totalExpected, totalCollected, outstanding },
      attendance: { studentRate: studentAttendanceRate }
    },
    academics: {
      classRankings: classPerformance.slice(0, 10),
      gradeDistribution: gradeDist
    },
    finance: {
      paymentStatus: [
        { name: 'Paid', value: totalCollected, color: '#10b981' },
        { name: 'Pending', value: outstanding, color: '#f59e0b' }
      ]
    }
  };
};
