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
  try {
    // 1. Prepare queries
    let resultsQuery = query(collection(db, 'schools', schoolId, 'results'));
    if (sessionId) resultsQuery = query(resultsQuery, where('sessionId', '==', sessionId));
    if (termId) resultsQuery = query(resultsQuery, where('termId', '==', termId));

    // 2. Fetch all required data in parallel
    const [
      usersSnap,
      classesSnap,
      resultsSnap,
      attendanceSnap,
      invoicesSnap,
      paymentsSnap
    ] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
      getDocs(collection(db, 'schools', schoolId, 'classes')),
      getDocs(resultsQuery),
      getDocs(collection(db, 'schools', schoolId, 'attendance')),
      getDocs(collection(db, 'schools', schoolId, 'invoices')),
      getDocs(collection(db, 'schools', schoolId, 'payments'))
    ]);

    // 3. Extract data
    const users = usersSnap.docs.map(d => d.data() as UserProfile);
    const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
    const results = resultsSnap.docs.map(d => d.data() as Result);
    const attendanceRecords = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    const invoices = invoicesSnap.docs.map(d => d.data() as Invoice);
    const payments = paymentsSnap.docs.map(d => d.data() as Payment);

    // 4. Counts
    const studentCount = users.filter(u => u.role === 'student').length;
    const teacherCount = users.filter(u => u.role === 'teacher').length;

    // 5. Attendance Calculation
    const calculateAttendanceRate = (records: AttendanceRecord[]) => {
      if (!records || records.length === 0) return 0;
      let totalPossible = 0;
      let totalPresent = 0;
      records.forEach(rec => {
        if (rec.records && typeof rec.records === 'object') {
          Object.values(rec.records).forEach(status => {
            totalPossible++;
            if (status === 'present' || status === 'late') totalPresent++;
          });
        }
      });
      return totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
    };
    const studentAttendanceRate = calculateAttendanceRate(attendanceRecords);

    // 6. Academic Performance
    const classRankings = classes.map(c => {
      const classResults = results.filter(r => r.classId === c.id);
      const avg = classResults.length > 0 
        ? classResults.reduce((sum, r) => sum + (r.finalScore || r.score || 0), 0) / classResults.length 
        : 0;
      return { name: c.name, score: Math.round(avg) };
    }).sort((a, b) => b.score - a.score).slice(0, 10);

    // 7. Grade Distribution
    const grades = ['A', 'B', 'C', 'D', 'F'];
    const gradeDistribution = grades.map(g => ({
      name: g,
      value: results.filter(r => r.grade === g).length
    }));

    // 8. Financials
    const totalExpected = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalCollected = payments.filter(p => p.status === 'success').reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.max(0, totalExpected - totalCollected);

    return {
      overview: {
        students: { total: studentCount },
        teachers: { total: teacherCount },
        finance: { totalExpected, totalCollected, outstanding },
        attendance: { studentRate: studentAttendanceRate }
      },
      academics: {
        classRankings,
        gradeDistribution
      },
      finance: {
        paymentStatus: [
          { name: 'Paid', value: totalCollected, color: '#10b981' },
          { name: 'Pending', value: outstanding, color: '#f59e0b' }
        ]
      }
    };
  } catch (error) {
    console.error("Critical error in fetchSchoolAnalytics:", error);
    // Return safe defaults
    return {
      overview: {
        students: { total: 0 },
        teachers: { total: 0 },
        finance: { totalExpected: 0, totalCollected: 0, outstanding: 0 },
        attendance: { studentRate: 0 }
      },
      academics: {
        classRankings: [],
        gradeDistribution: []
      },
      finance: {
        paymentStatus: []
      }
    };
  }
};
