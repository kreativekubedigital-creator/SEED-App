import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, OperationType, handleFirestoreError, auth } from '../../lib/compatibility';
import { UserProfile, Class, Subject, Assignment, School } from '../../types';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  CheckSquare, 
  Users, 
  Award, 
  X, 
  LogOut, 
  Calendar,
  Menu,
  Bell,
  Search,
  Settings,
  ChevronRight,
  Sparkles,
  Zap,
  Globe,
  Clock,
  GraduationCap,
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, sortByFullName, formatDisplayString } from '../../lib/utils';
import { TeacherQuizzes } from './TeacherQuizzes';
import { TeacherResultWorkspace } from './TeacherResultWorkspace';
import { TeacherAssignments } from './TeacherAssignments';
import TeacherAttendance from './TeacherAttendance';
import ClassTimetable from './ClassTimetable';
import { Link } from 'react-router-dom';

export const TeacherDashboard = ({ user, onLogout, school }: { user: UserProfile, onLogout: () => void, school?: School }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'assignments' | 'quizzes' | 'results' | 'timetable' | 'classes'>('overview');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<string | null>(null);

  useEffect(() => {
    if (!user.schoolId || !user.uid) return;

    // Fetch Subjects
    const qSubjects = query(collection(db, 'schools', user.schoolId, 'subjects'), where('teacherId', '==', user.uid));
    const unsubSubjects = onSnapshot(qSubjects, (snap) => {
      setSubjects(sortByName(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject))));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'subjects'));

    // Fetch Classes
    const qClasses = query(collection(db, 'schools', user.schoolId, 'classes'));
    const unsubClasses = onSnapshot(qClasses, (snap) => {
      setClasses(sortByName(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class))));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'classes'));

    // Fetch Students
    const qStudents = query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(sortByFullName(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile))));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users/students'));

    // Fetch Assignments
    const qAssignments = query(collection(db, 'schools', user.schoolId, 'assignments'), where('teacherId', '==', user.uid));
    const unsubAssignments = onSnapshot(qAssignments, (snap) => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'assignments'));

    return () => {
      unsubSubjects();
      unsubClasses();
      unsubStudents();
      unsubAssignments();
    };
  }, [user.schoolId, user.uid]);

  const getClassName = (classId: string) => formatDisplayString(classes.find(c => c.id === classId)?.name || 'Unknown Class');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Premium Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-100 transform transition-all duration-500 ease-out shadow-[20px_0_40px_-20px_rgba(0,0,0,0.03)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col p-8 no-scrollbar overflow-y-auto">
          <div className="flex items-center gap-4 mb-12 px-2">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-blue-500/20 active:scale-95 transition-transform">
              <GraduationCap className="text-white w-8 h-8" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none">SEED</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mt-1.5 opacity-80">Teacher Hub</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
              { id: 'attendance', icon: Users, label: 'Attendance' },
              { id: 'assignments', icon: BookOpen, label: 'Assignments' },
              { id: 'quizzes', icon: BrainCircuit, label: 'Quizzes' },
              { id: 'results', icon: Award, label: 'Result Room' },
              { id: 'timetable', icon: Clock, label: 'Schedule' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setIsMobileMenuOpen(false); }}
                className={`w-full group flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all duration-300 relative overflow-hidden ${
                  activeTab === item.id 
                    ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-slate-900"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className={`relative z-10 p-2 rounded-xl transition-colors ${
                  activeTab === item.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-slate-900'
                }`}>
                  <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                </div>
                <span className="relative z-10 font-black uppercase tracking-widest text-[11px]">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="activeArrow"
                    className="ml-auto relative z-10"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                  >
                    <ChevronRight size={16} strokeWidth={3} />
                  </motion.div>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-6 pt-8">
            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden shadow-2xl shadow-blue-500/20">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={80} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Academic Support</p>
              <h4 className="text-lg font-black leading-tight mb-4 tracking-tight">Need help with grading?</h4>
              <button className="w-full py-3 bg-white text-blue-700 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-blue-50 transition-colors shadow-lg">
                View Guidelines
              </button>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center gap-4 px-8 py-5 rounded-[1.5rem] text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-50 transition-all active:scale-95 group"
            >
              <div className="p-2 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
                <LogOut size={18} strokeWidth={3} />
              </div>
              Sign Out Securely
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="lg:ml-80 min-h-screen flex flex-col relative">
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Modern Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-6">
              <button 
                className="lg:hidden p-3 bg-slate-50 rounded-2xl text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={24} strokeWidth={2.5} />
              </button>
              <div className="hidden md:flex items-center gap-3 bg-slate-50 px-6 py-3.5 rounded-2xl border border-slate-100 w-96 group focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500/50 transition-all">
                <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search students, results, or tasks..." 
                  className="bg-transparent border-none outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400 w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end mr-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">Academic Role</p>
                <p className="text-sm font-black text-slate-900 tracking-tight">{formatDisplayString(user.role)}</p>
              </div>
              <button className="relative p-4 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-2xl transition-all group shadow-sm border border-slate-100">
                <Bell size={22} strokeWidth={2.5} />
                <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full shadow-sm"></span>
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-xl flex items-center justify-center text-slate-400 group cursor-pointer hover:shadow-2xl transition-all relative overflow-hidden">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="Profile" className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <Users size={24} strokeWidth={2.5} />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="p-8 lg:p-12 max-w-7xl mx-auto w-full flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <h2 className="text-5xl font-black tracking-tight text-slate-900 leading-tight">
                    Welcome, <span className="text-blue-600">{formatDisplayString(user.firstName)}</span>
                  </h2>
                  <p className="text-lg font-medium text-slate-500 mt-4 flex items-center gap-3">
                    <Calendar className="text-blue-500" size={20} />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                  <div className="flex -space-x-3 px-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`w-10 h-10 rounded-full border-2 border-white bg-slate-${i*100+100} shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-400`}>
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div className="pr-6 pl-4 border-l border-slate-100 py-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class Roster</p>
                    <p className="text-sm font-black text-slate-900">{students.length} Students Active</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { label: 'Total Subjects', value: subjects.length, icon: BookOpen, color: 'blue', trend: '+2 this term' },
                  { label: 'Assigned Classes', value: classes.length, icon: Users, color: 'emerald', trend: 'Full capacity' },
                  { label: 'Pending Grades', value: assignments.length, icon: CheckSquare, color: 'amber', trend: 'Active tasks' },
                  { label: 'Academic Year', value: '2024', icon: Award, color: 'purple', trend: 'Term 2 active' },
                ].map((stat, i) => (
                  <motion.div 
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 group hover:scale-[1.02] transition-all relative overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                    <div className={`w-14 h-14 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-${stat.color}-100 group-hover:bg-${stat.color}-600 group-hover:text-white transition-all`}>
                      <stat.icon size={28} strokeWidth={2.5} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{stat.label}</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-600">
                      <Zap size={12} fill="currentColor" />
                      {stat.trend}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
                    <div className="flex justify-between items-center mb-10">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Assigned Subjects</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5">Academic Scope</p>
                      </div>
                      <button className="p-4 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-2xl transition-all border border-slate-100 shadow-sm active:scale-95">
                        <Settings size={20} />
                      </button>
                    </div>
                    <div className="space-y-6">
                      {subjects.map(s => (
                        <div key={s.id} className="p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all group flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-lg border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                              <BookOpen size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">{getClassName(s.classId)}</p>
                              <h4 className="text-lg font-black text-slate-900 tracking-tight">{formatDisplayString(s.name)}</h4>
                            </div>
                          </div>
                          <div className="text-right hidden sm:block">
                            <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100">
                              <div className="text-center">
                                <p className="text-[7px] font-black uppercase text-slate-400">Status</p>
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active</p>
                              </div>
                              <ChevronRight size={16} className="text-slate-300" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden">
                    <div className="absolute top-0 left-0 p-8 opacity-10 pointer-events-none">
                      <Globe size={160} />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-2xl font-black tracking-tight mb-6">Class Bulletin</h3>
                      <div className="space-y-6">
                        {[
                          { time: '10 mins ago', text: 'Math homework deadline updated for Grade 10', icon: Clock },
                          { time: '2 hours ago', text: 'New student enrolled in Physics morning session', icon: Users },
                          { time: 'Yesterday', text: 'Term 2 result templates are now available', icon: Award },
                        ].map((note, i) => (
                          <div key={i} className="flex gap-4 group cursor-pointer">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0 group-hover:scale-150 transition-transform shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                            <div>
                              <p className="text-sm font-medium leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity">{note.text}</p>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-2">{note.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="w-full mt-10 py-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all active:scale-95">
                        View All Activities
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Classes & Subjects</h2>
                  <p className="text-lg font-medium text-slate-500 mt-2">Manage your student rosters and academic subjects</p>
                </div>
                <div className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-blue-600/30">
                  {subjects.length} Active Subjects
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {subjects.map(subject => (
                  <motion.div 
                    key={subject.id} 
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 group transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-5 mb-8 relative z-10">
                      <div className="w-16 h-16 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <BookOpen size={28} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h4 className="font-black uppercase tracking-widest text-[14px] text-slate-900 leading-tight mb-1">{formatDisplayString(subject.name)}</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{getClassName(subject.classId)}</p>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-50 space-y-6 relative z-10">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Students</span>
                          <span className="text-lg font-black text-slate-900">{students.filter(s => s.classId === subject.classId).length}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</span>
                          <span className="text-sm font-black text-emerald-600 uppercase tracking-widest">Active</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setActiveTab('assignments')} 
                          className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group/btn"
                        >
                          <FileText size={18} className="text-slate-400 group-hover/btn:text-blue-600" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Tasks</span>
                        </button>
                        <button 
                          onClick={() => setActiveTab('results')} 
                          className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group/btn"
                        >
                          <Award size={18} className="text-slate-400 group-hover/btn:text-emerald-600" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Results</span>
                        </button>
                        <button 
                          onClick={() => setSelectedClassForStudents(subject.classId)} 
                          className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          View Student Roster
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

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

        {/* Modal for Student List - Styled for Premium Hub */}
        <AnimatePresence>
          {selectedClassForStudents && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                className="bg-white rounded-[3rem] p-12 w-full max-w-2xl shadow-2xl border border-white max-h-[85vh] overflow-y-auto no-scrollbar relative"
              >
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                        <Users size={22} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Student Roster</p>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{getClassName(selectedClassForStudents)}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mt-6">
                      <div className="px-5 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Enrollment</p>
                        <p className="text-sm font-black text-slate-900">{students.filter(s => s.classId === selectedClassForStudents).length} Students</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedClassForStudents(null)}
                    className="p-4 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-[1.5rem] transition-all border border-slate-100 hover:border-red-100 shadow-sm active:scale-95"
                  >
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <div className="space-y-4">
                  {students.filter(s => s.classId === selectedClassForStudents).map((s, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={s.uid} 
                      className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          {s.photoUrl ? (
                            <img src={s.photoUrl} alt={s.firstName} className="w-14 h-14 rounded-2xl object-cover shadow-md border-2 border-white group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-white text-lg shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                              {s.firstName?.charAt(0)}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-widest text-[12px] text-slate-900">{formatDisplayString(s.firstName)} {formatDisplayString(s.lastName)}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            ID: {s.registrationNumber || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <button className="p-4 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 shadow-sm transition-all group-hover:scale-110">
                        <ChevronRight size={18} strokeWidth={3} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
