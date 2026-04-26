import React, { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, doc, setDoc, onSnapshot, serverTimestamp, handleFirestoreError, OperationType } from '../../lib/compatibility';
import { UserProfile, Class, AttendanceRecord } from '../../types';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Save, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Loader2 
} from 'lucide-react';
import { sortByName, sortByFullName } from '../../lib/utils';

interface TeacherAttendanceProps {
  user: UserProfile;
}

const TeacherAttendance: React.FC<TeacherAttendanceProps> = ({ user }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user.schoolId) return;
    const unsubClasses = onSnapshot(collection(db, 'schools', user.schoolId, 'classes'), (snap) => {
      const clsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
      const sortedClasses = sortByName(clsData) as Class[];
      setClasses(sortedClasses);
      if (sortedClasses.length > 0 && !selectedClass) {
        setSelectedClass(sortedClasses[0].id);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'classes'));
    return () => unsubClasses();
  }, [user.schoolId]);

  useEffect(() => {
    if (!user.schoolId || !selectedClass) return;
    const qStudents = query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('classId', '==', selectedClass), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const studentsData = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setStudents(sortByFullName(studentsData));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    return () => unsubStudents();
  }, [user.schoolId, selectedClass]);

  useEffect(() => {
    if (!user.schoolId || !selectedClass || !selectedDate) return;
    const fetchAttendance = async () => {
      try {
        const q = query(collection(db, 'schools', user.schoolId, 'attendance'), 
          where('classId', '==', selectedClass),
          where('date', '==', selectedDate)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as AttendanceRecord;
          setAttendance(data.records || {});
        } else {
          setAttendance({});
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'attendance');
      }
    };
    fetchAttendance();
  }, [user.schoolId, selectedClass, selectedDate]);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status: 'present' | 'absent') => {
    const newAttendance: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
    students.forEach(s => {
      newAttendance[s.uid] = status;
    });
    setAttendance(newAttendance);
  };

  const saveAttendance = async () => {
    if (!user.schoolId || !selectedClass || !selectedDate) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const attendanceId = `${selectedClass}_${selectedDate}`;
      const attendanceRef = doc(db, 'schools', user.schoolId, 'attendance', attendanceId);
      
      await setDoc(attendanceRef, {
        id: attendanceId,
        schoolId: user.schoolId,
        classId: selectedClass,
        date: selectedDate,
        records: attendance,
        markedBy: user.uid,
        createdAt: serverTimestamp()
      }, { merge: true });
      
      setMessage({ type: 'success', text: 'Attendance saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
      setMessage({ type: 'error', text: 'Failed to save attendance.' });
    } finally {
      setSaving(false);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  if (loading) return <div className="p-8 text-center text-slate-900 dark:text-slate-100">Loading classes...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Attendance Register</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Mark and monitor daily student presence</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
            <div className="flex flex-col gap-2 min-w-[200px]">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Class</label>
              <select
                id="select_teacher_attendance_class"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Academic Date</label>
              <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-200 p-1.5 shadow-sm">
                <button id="btn_teacher_attendance_prev_day" onClick={() => changeDate(-1)} className="p-3 hover:bg-white text-slate-400 hover:text-blue-600 rounded-xl transition-all active:scale-90"><ChevronLeft size={20} strokeWidth={2.5} /></button>
                <div className="px-6 py-1 flex items-center gap-3 font-black uppercase tracking-widest text-[10px] text-slate-900 min-w-[180px] justify-center">
                  <CalendarIcon size={16} className="text-blue-500" strokeWidth={2.5} />
                  {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <button id="btn_teacher_attendance_next_day" onClick={() => changeDate(1)} className="p-3 hover:bg-white text-slate-400 hover:text-blue-600 rounded-xl transition-all active:scale-90"><ChevronRight size={20} strokeWidth={2.5} /></button>
              </div>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`p-6 rounded-2xl mb-10 font-black uppercase tracking-widest text-[10px] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {message.text}
          </div>
        )}

        {students.length === 0 ? (
          <div className="text-center py-24 bg-slate-50 rounded-[2rem] border border-slate-100 border-dashed">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-6 shadow-sm">
              <AlertCircle size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-2">No Students Found</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">There are no students registered in this class.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-10">
              <button id="btn_teacher_attendance_mark_all_present" onClick={() => markAll('present')} className="px-8 py-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 shadow-sm border border-emerald-100 active:scale-95">
                <CheckCircle size={16} strokeWidth={2.5} /> Mark All Present
              </button>
              <button id="btn_teacher_attendance_mark_all_absent" onClick={() => markAll('absent')} className="px-8 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 shadow-sm border border-red-100 active:scale-95">
                <XCircle size={16} strokeWidth={2.5} /> Mark All Absent
              </button>
            </div>

            <div className="overflow-hidden bg-white rounded-[2rem] border border-slate-100 shadow-sm mb-10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Roster</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-32">Present</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-32">Absent</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-32">Late</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-32">Excused</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map(student => {
                    const status = attendance[student.uid];
                    return (
                      <tr key={student.uid} className="hover:bg-slate-50/50 transition-all duration-200">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs shrink-0 border-2 border-white shadow-sm">
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-black uppercase tracking-widest text-[10px] text-slate-900">{student.firstName} {student.lastName}</p>
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">{student.registrationNumber || 'NO ID'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <button 
                            id={`btn_teacher_attendance_present_${student.uid}`}
                            onClick={() => handleStatusChange(student.uid, 'present')}
                            className={`p-3 rounded-2xl transition-all active:scale-90 ${status === 'present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm' : 'text-slate-200 hover:bg-slate-50 hover:text-slate-400'}`}
                          >
                            <CheckCircle size={24} strokeWidth={2.5} />
                          </button>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <button 
                            id={`btn_teacher_attendance_absent_${student.uid}`}
                            onClick={() => handleStatusChange(student.uid, 'absent')}
                            className={`p-3 rounded-2xl transition-all active:scale-90 ${status === 'absent' ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm' : 'text-slate-200 hover:bg-slate-50 hover:text-slate-400'}`}
                          >
                            <XCircle size={24} strokeWidth={2.5} />
                          </button>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <button 
                            id={`btn_teacher_attendance_late_${student.uid}`}
                            onClick={() => handleStatusChange(student.uid, 'late')}
                            className={`p-3 rounded-2xl transition-all active:scale-90 ${status === 'late' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100 shadow-sm' : 'text-slate-200 hover:bg-slate-50 hover:text-slate-400'}`}
                          >
                            <Clock size={24} strokeWidth={2.5} />
                          </button>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <button 
                            id={`btn_teacher_attendance_excused_${student.uid}`}
                            onClick={() => handleStatusChange(student.uid, 'excused')}
                            className={`p-3 rounded-2xl transition-all active:scale-90 ${status === 'excused' ? 'bg-purple-50 text-purple-600 border border-purple-100 shadow-sm' : 'text-slate-200 hover:bg-slate-50 hover:text-slate-400'}`}
                          >
                            <AlertCircle size={24} strokeWidth={2.5} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                id="btn_teacher_attendance_save"
                onClick={saveAttendance}
                disabled={saving || Object.keys(attendance).length === 0}
                className="bg-blue-600 text-white px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 border border-white/20 flex items-center gap-3 disabled:opacity-50 active:scale-95"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} strokeWidth={2.5} />}
                Save Register
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeacherAttendance;
