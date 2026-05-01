import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, OperationType, handleFirestoreError } from '../../lib/compatibility';
import { UserProfile, Class, Subject, Assignment, School } from '../../types';
import { Plus, BookOpen, FileText, CheckSquare, Users, Award, X, LogOut, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, sortByFullName, formatDisplayString } from '../../lib/utils';
import { TeacherQuizzes } from './TeacherQuizzes';
import { TeacherResultWorkspace } from './TeacherResultWorkspace';
import { TeacherAssignments } from './TeacherAssignments';
import TeacherAttendance from './TeacherAttendance';
import ClassTimetable from './ClassTimetable';
import { Link } from 'react-router-dom';

export const TeacherDashboard = ({ user, onLogout, school }: { user: UserProfile, onLogout: () => void, school?: School }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'assignments' | 'quizzes' | 'results' | 'attendance' | 'timetable'>('overview');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<string | null>(null);

  useEffect(() => {
    if (!user.schoolId || !user.uid) {
      setLoading(false);
      return;
    }

    const unsubClasses = onSnapshot(collection(db, `schools/${user.schoolId}/classes`), (snap) => {
      const classesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
      setClasses(sortByName(classesData));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/classes`));

    const qSubjects = query(collection(db, 'schools', user.schoolId, 'subjects'));
    const unsubSubjects = onSnapshot(qSubjects, (snap) => {
      const allSubjects = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
      const subjectsData = allSubjects.filter(s => s.teacherId === user.uid || s.classId === user.classId);
      setSubjects(sortByName(subjectsData));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/subjects`));

    const qAssignments = query(collection(db, 'schools', user.schoolId, 'assignments'), where('teacherId', '==', user.uid));
    const unsubAssignments = onSnapshot(qAssignments, (snap) => {
      const assignmentsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
      assignmentsData.sort((a, b) => {
        const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setAssignments(assignmentsData);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/assignments`);
    });

    return () => {
      unsubClasses();
      unsubSubjects();
      unsubAssignments();
    };
  }, [user.schoolId, user.uid, user.classId]);

  useEffect(() => {
    if (!user.schoolId) {
      setStudents([]);
      return;
    }

    const qStudents = query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const allStudents = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      const teacherClassIds = subjects.map(s => s.classId);
      if (user.classId) teacherClassIds.push(user.classId);
      
      if (teacherClassIds.length === 0) {
        setStudents([]);
        return;
      }

      const filteredStudents = allStudents.filter(s => s.classId && teacherClassIds.includes(s.classId));
      setStudents(sortByFullName(filteredStudents));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    return () => unsubStudents();
  }, [user.schoolId, user.classId, subjects]);

  const getClassName = (classId: string) => formatDisplayString(classes.find(c => c.id === classId)?.name || 'Unknown Class');
  const getSubjectName = (subjectId: string) => formatDisplayString(subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-6 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={formatDisplayString(school.name)} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
          ) : (
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-blue-600/20">S</div>
          )}
          <span className="font-bold tracking-tight text-xs text-slate-950 truncate max-w-[150px]">{formatDisplayString(school?.name || 'SEEDD')}</span>
        </div>
        <button onClick={onLogout} className="p-3 bg-red-50 text-red-500 rounded-xl transition-all active:scale-95"><LogOut size={20} /></button>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        {/* Desktop Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
          <div className="flex items-center gap-6">
            <Link to="/profile" className="relative group cursor-pointer">
              <div className="w-20 h-20 rounded-[2rem] bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-2xl border-4 border-white group-hover:scale-105 transition-all">
                {formatDisplayString(user.firstName).charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tighter text-slate-950 leading-none">
                  Hello, {formatDisplayString(user.firstName)}!
                </h1>
                {school?.logoUrl && (
                  <img src={school.logoUrl} alt={formatDisplayString(school.name)} className="w-8 h-8 rounded-lg object-cover opacity-30 grayscale" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs font-bold tracking-tight text-white bg-blue-600 px-5 py-2 rounded-full shadow-lg shadow-blue-600/25">
                  Teacher Portal
                </span>
                <div className="w-1.5 h-1.5 bg-blue-200 rounded-full"></div>
                <span className="text-xs font-bold tracking-tight text-slate-950">
                  {user.classId ? getClassName(user.classId) : 'Specialist'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button
              onClick={onLogout}
              id="teacher_logout_btn"
              className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white hover:bg-red-50 text-slate-700 hover:text-red-500 border border-white shadow-xl shadow-slate-200/20 hover:shadow-red-500/10 transition-all font-bold tracking-tight text-[11px] group"
            >
              <LogOut size={16} className="group-hover:translate-x-1 transition-transform" /> Logout
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 overflow-x-auto pb-6 mb-10 scrollbar-hide no-scrollbar scroll-smooth pt-4 -mx-2 px-4">
          {(['overview', 'subjects', 'assignments', 'quizzes', 'results', 'attendance', 'timetable'] as const).map((tab) => (
            <button
              key={tab}
              id={`tab_teacher_${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-10 py-4 rounded-xl font-bold tracking-tight text-sm transition-all whitespace-nowrap shrink-0 border shadow-sm ${
                activeTab === tab
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20 z-10'
                  : 'bg-white text-slate-950 border-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100'
              }`}
            >
              {tab === 'subjects' ? 'Subjects' : formatDisplayString(tab)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { id: 'subjects', label: 'My Subjects', value: subjects.length, icon: BookOpen, color: 'blue', action: 'subjects' },
                { id: 'subjects_list', label: 'Subjects', value: Array.from(new Set([...subjects.map(s => s.classId), ...(user.classId ? [user.classId] : [])])).length, icon: Users, color: 'blue', action: 'subjects' },
                { id: 'assignments', label: 'Assignments', value: assignments.length, icon: FileText, color: 'blue', action: 'assignments' },
                { id: 'quizzes', label: 'Quizzes', value: 'Portal', icon: CheckSquare, color: 'blue', action: 'quizzes' }
              ].map((stat) => (
                <motion.div 
                  key={stat.id}
                  id={`stat_teacher_${stat.id}`}
                  whileHover={{ y: -3, scale: 1.01 }} 
                  onClick={() => setActiveTab(stat.action as any)} 
                  className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-white cursor-pointer shadow-lg shadow-blue-600/5 hover:shadow-blue-600/10 transition-all group overflow-hidden relative"
                >
                  <div className={`absolute -right-2 -top-2 w-12 h-12 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all`} />
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <div className={`p-2 bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform`}>
                      <stat.icon size={16} strokeWidth={2.5} />
                    </div>
                    <span className="text-slate-950 font-bold text-xs tracking-tight">{stat.label}</span>
                  </div>
                  <p className="text-3xl font-bold tracking-tighter text-slate-950 leading-none relative z-10">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions & Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white/80 backdrop-blur-md p-12 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/40">
                <div className="flex justify-between items-center mb-12">
                  <h3 className="text-[10px] font-bold tracking-tight text-slate-950">Quick Actions</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'new_assign', label: 'New Assignment', desc: 'Upload Now', icon: Plus, color: 'blue', tab: 'assignments' },
                    { id: 'create_quiz', label: 'Create Quiz', desc: 'New Test', icon: Plus, color: 'blue', tab: 'quizzes' },
                    { id: 'enter_results', label: 'Results', desc: 'Grade Entry', icon: Award, color: 'blue', tab: 'results' },
                    { id: 'attendance', label: 'Attendance', desc: 'Daily Check', icon: Calendar, color: 'blue', tab: 'attendance' }
                  ].map((action) => (
                    <motion.button 
                      key={action.id}
                      id={`action_teacher_${action.id}`}
                      whileHover={{ scale: 1.02, y: -2 }} 
                      onClick={() => setActiveTab(action.tab as any)} 
                      className="p-5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/5 transition-all text-left flex flex-col gap-2 group"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-0.5 border border-blue-100 group-hover:scale-110 transition-transform`}>
                        <action.icon size={16} strokeWidth={3} />
                      </div>
                      <span className="font-bold tracking-tight text-xs text-slate-950">{action.label}</span>
                      <span className="text-[10px] text-slate-800 font-medium">{action.desc}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-md p-8 lg:p-10 rounded-[2rem] border border-white shadow-2xl shadow-slate-200/40">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-[10px] font-bold tracking-tight text-slate-950">Recent Activity</h3>
                </div>
                <div className="space-y-3">
                  {assignments.slice(0, 4).map(a => (
                    <motion.div 
                      whileHover={{ x: 4, scale: 1.01 }} 
                      key={a.id} 
                      className="flex gap-4 items-center p-5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/5 transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shrink-0 border border-slate-100 shadow-sm group-hover:bg-blue-50 transition-colors">
                        <FileText size={20} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold tracking-tight text-xs text-slate-950 truncate mb-0.5">{formatDisplayString(a.title)}</p>
                        <p className="text-[10px] text-slate-900 font-medium flex items-center gap-2">
                          <BookOpen size={10} /> {getSubjectName(a.subjectId)}
                        </p>
                      </div>
                      <div className="text-xs font-bold text-orange-700 whitespace-nowrap bg-orange-50 border border-orange-100 px-3 py-2 rounded-lg shadow-sm">
                        {new Date(a.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                    </motion.div>
                  ))}
                  {assignments.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                        <FileText size={40} />
                      </div>
                      <p className="text-slate-950 font-bold tracking-tight text-xs">No recent assignments.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'subjects' && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-xs font-bold tracking-tight text-slate-950 mb-2">Academic Control</h3>
                <h2 className="text-4xl font-bold tracking-tighter text-slate-950 leading-none">Subjects</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {subjects.map(subject => (
                <motion.div 
                  key={subject.id} 
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="bg-white p-4 rounded-3xl shadow-xl shadow-blue-900/5 border border-white hover:border-blue-100 hover:shadow-blue-600/10 transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <BookOpen size={18} strokeWidth={2.5} />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold tracking-tight text-sm text-slate-950 leading-tight mb-0.5 truncate">{formatDisplayString(subject.name)}</h4>
                      <p className="text-xs text-slate-950/80 font-bold">{getClassName(subject.classId)}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50 space-y-4 relative z-10">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-tight text-slate-950/70 mb-0.5">Students</span>
                        <span className="text-sm font-bold text-slate-950">{students.filter(s => s.classId === subject.classId).length}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-xs font-bold tracking-tight text-slate-950/70 mb-0.5">Assignments</span>
                        <span className="text-sm font-bold text-slate-950">{assignments.filter(a => a.subjectId === subject.id).length}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button id={`btn_teacher_assign_${subject.id}`} onClick={() => setActiveTab('assignments')} className="text-blue-600 text-[9px] font-bold tracking-tight hover:text-white transition-all bg-blue-50 hover:bg-blue-600 px-3 py-2 rounded-xl border border-blue-100 shadow-sm text-center">
                        Assign
                      </button>
                      <button id={`btn_teacher_results_${subject.id}`} onClick={() => setActiveTab('results')} className="text-blue-600 text-[9px] font-bold tracking-tight hover:text-white transition-all bg-blue-50 hover:bg-blue-600 px-3 py-2 rounded-xl border border-blue-100 shadow-sm text-center">
                        Results
                      </button>
                      <button id={`btn_teacher_students_${subject.id}`} onClick={() => setSelectedClassForStudents(subject.classId)} className="col-span-2 text-white text-[9px] font-bold tracking-tight transition-all bg-blue-600 hover:bg-blue-700 px-3 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 text-center border border-white/20">
                        Student Roster
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {subjects.length === 0 && (
                <div className="col-span-full text-center py-24 bg-white rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/40">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-8 shadow-sm border border-slate-100">
                    <BookOpen size={48} />
                  </div>
                  <p className="text-slate-950 font-bold tracking-tight text-sm mb-2">No subjects assigned</p>
                  <p className="text-slate-700 text-[10px] font-bold tracking-tight">Check with the school administrator.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Modal for Student List */}
        <AnimatePresence>
          {selectedClassForStudents && (
            <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                className="bg-white rounded-[3rem] p-12 w-full max-w-2xl shadow-2xl border border-white max-h-[85vh] overflow-y-auto custom-scrollbar"
              >
                 <div className="flex justify-between items-center mb-12">
                  <div>
                    <h3 className="text-xs font-bold tracking-tight text-slate-950 mb-2">Class Population</h3>
                    <h2 className="text-4xl font-bold tracking-tighter text-slate-950 leading-none">Student Roster</h2>
                  </div>
                  <p className="text-[11px] text-slate-700 font-bold mt-3">{getClassName(selectedClassForStudents)}</p>
                  <button 
                    onClick={() => setSelectedClassForStudents(null)}
                    className="p-5 bg-slate-100 hover:bg-blue-600 text-slate-500 hover:text-white rounded-[1.5rem] transition-all active:scale-95"
                  >
                    <X size={24} strokeWidth={3} />
                  </button>
                </div>
                <div className="space-y-4">
                  {students.filter(s => s.classId === selectedClassForStudents).map(s => (
                    <div key={s.uid} className="flex items-center gap-6 p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all group">
                      {s.photoUrl ? (
                        <img src={s.photoUrl} alt={formatDisplayString(s.firstName)} className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white text-xl shadow-lg border-2 border-white group-hover:scale-105 transition-transform">
                          {formatDisplayString(s.firstName)?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold tracking-tight text-base text-slate-950">{formatDisplayString(s.firstName)} {formatDisplayString(s.lastName)}</p>
                        <p className="text-[11px] text-slate-700 font-medium mt-1">Reg: {s.registrationNumber || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {activeTab === 'assignments' && (
          <TeacherAssignments user={user} subjects={subjects} classes={classes} />
        )}

        {activeTab === 'quizzes' && (
          <TeacherQuizzes user={user} subjects={subjects} classes={classes} />
        )}

        {activeTab === 'results' && (
          <TeacherResultWorkspace user={user} />
        )}

        {activeTab === 'attendance' && (
          <TeacherAttendance user={user} />
        )}

        {activeTab === 'timetable' && (
          <ClassTimetable user={user} mode="view" />
        )}
      </div>
    </div>
  );
};
