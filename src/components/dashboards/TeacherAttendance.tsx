import React, { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, doc, setDoc, onSnapshot, serverTimestamp, handleFirestoreError, OperationType } from '../../firebase';
import { UserProfile, Class, AttendanceRecord } from '../../types';
import { CheckCircle, XCircle, Clock, AlertCircle, Save, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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
      const sortedClasses = sortByName(clsData);
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

  if (loading) return <div className="p-8 text-center text-gray-800">Loading classes...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-medium text-gray-800">Daily Attendance</h2>
            <p className="text-sm text-gray-800 mt-1">Mark and manage student attendance</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            
            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1">
              <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronLeft size={18} /></button>
              <div className="px-4 py-1 flex items-center gap-2 font-medium text-gray-800 min-w-[140px] justify-center">
                <CalendarIcon size={16} className="text-blue-500" />
                {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {students.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
            <p className="text-gray-800">No students found in this class.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              <button onClick={() => markAll('present')} className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                <CheckCircle size={16} /> Mark All Present
              </button>
              <button onClick={() => markAll('absent')} className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                <XCircle size={16} /> Mark All Absent
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-100">
                    <th className="px-4 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Student</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-center">Present</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-center">Absent</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-center">Late</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-center">Excused</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map(student => {
                    const status = attendance[student.uid];
                    return (
                      <tr key={student.uid} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs shrink-0">
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{student.firstName} {student.lastName}</p>
                              <p className="text-xs text-gray-800">{student.registrationNumber || 'No ID'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => handleStatusChange(student.uid, 'present')}
                            className={`p-2 rounded-full transition-colors ${status === 'present' ? 'bg-green-100 text-green-600' : 'text-gray-300 hover:bg-gray-100'}`}
                          >
                            <CheckCircle size={20} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => handleStatusChange(student.uid, 'absent')}
                            className={`p-2 rounded-full transition-colors ${status === 'absent' ? 'bg-red-100 text-red-600' : 'text-gray-300 hover:bg-gray-100'}`}
                          >
                            <XCircle size={20} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => handleStatusChange(student.uid, 'late')}
                            className={`p-2 rounded-full transition-colors ${status === 'late' ? 'bg-yellow-100 text-yellow-600' : 'text-gray-300 hover:bg-gray-100'}`}
                          >
                            <Clock size={20} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => handleStatusChange(student.uid, 'excused')}
                            className={`p-2 rounded-full transition-colors ${status === 'excused' ? 'bg-purple-100 text-purple-600' : 'text-gray-300 hover:bg-gray-100'}`}
                          >
                            <AlertCircle size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveAttendance}
                disabled={saving || Object.keys(attendance).length === 0}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={18} /> {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeacherAttendance;
