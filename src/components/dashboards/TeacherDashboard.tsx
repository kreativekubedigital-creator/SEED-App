import React, { useState, useEffect } from'react';
import { db, collection, getDocs, query, where, addDoc, doc, deleteDoc, onSnapshot, OperationType, handleFirestoreError } from'../../lib/compatibility';
import { UserProfile, Class, Subject, Assignment } from'../../types';
import { Plus, BookOpen, FileText, CheckSquare, Bell, TrendingUp, Users, Trash2, Calendar, Award, X } from'lucide-react';
import { motion, AnimatePresence } from'motion/react';
import { sortByName, sortByFullName } from'../../lib/utils';
import { TeacherQuizzes } from'./TeacherQuizzes';
import { TeacherResultWorkspace } from'./TeacherResultWorkspace';
import { TeacherAssignments } from'./TeacherAssignments';
import TeacherAttendance from'./TeacherAttendance';
import ClassTimetable from'./ClassTimetable';

import { Link } from 'react-router-dom';

export const TeacherDashboard = ({ user, onLogout, school }: { user: UserProfile, onLogout: () => void, school?: School }) => {
 const [activeTab, setActiveTab] = useState<'overview'|'classes'|'assignments'|'quizzes'|'results'|'attendance'|'timetable'>('overview');
 const [subjects, setSubjects] = useState<Subject[]>([]);
 const [classes, setClasses] = useState<Class[]>([]);
 const [assignments, setAssignments] = useState<Assignment[]>([]);
 const [students, setStudents] = useState<UserProfile[]>([]);
 const [loading, setLoading] = useState(true);
 const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
 const [postStatus, setPostStatus] = useState<'idle'|'posting'|'success'|'error'>('idle');
 const [newAnnouncement, setNewAnnouncement] = useState({ title:'', content:'', classId:'', studentId:'', target:'class'as'class'|'student'});
 const [selectedClassForStudents, setSelectedClassForStudents] = useState<string | null>(null);

 useEffect(() => {
 if (!user.schoolId || !user.uid) {
 setLoading(false);
 return;
 }

 const unsubClasses = onSnapshot(collection(db,`schools/${ user.schoolId }/classes`), (snap) => {
 const classesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
 setClasses(sortByName(classesData));
 }, (error) => handleFirestoreError(error, OperationType.GET,`schools/${ user.schoolId }/classes`));

 const qSubjects = query(collection(db,'schools', user.schoolId,'subjects'));
 const unsubSubjects = onSnapshot(qSubjects, (snap) => {
 const allSubjects = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
 const subjectsData = allSubjects.filter(s => s.teacherId === user.uid || s.classId === user.classId);
 setSubjects(sortByName(subjectsData));
 }, (error) => handleFirestoreError(error, OperationType.GET,`schools/${ user.schoolId }/subjects`));

 const qAssignments = query(collection(db,'schools', user.schoolId,'assignments'), where('teacherId','==', user.uid));
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
 handleFirestoreError(error, OperationType.GET,`schools/${ user.schoolId }/assignments`);
 });

 return () => {
 unsubClasses();
 unsubSubjects();
 unsubAssignments();
 };
 }, [user.schoolId, user.uid, user.classId]);

 // Separate effect for students to handle subjects dependency correctly
 useEffect(() => {
 if (!user.schoolId) {
 setStudents([]);
 return;
 }

 const qStudents = query(collection(db,'users'), where('schoolId','==', user.schoolId), where('role','==','student'));
 const unsubStudents = onSnapshot(qStudents, (snap) => {
 const allStudents = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
 const teacherClassIds = subjects.map(s => s.classId);
 if (user.classId) teacherClassIds.push(user.classId);
 
 // If teacher has no subjects and no classId, they see no students
 if (teacherClassIds.length === 0) {
 setStudents([]);
 return;
 }

 const filteredStudents = allStudents.filter(s => s.classId && teacherClassIds.includes(s.classId));
 setStudents(sortByFullName(filteredStudents));
 }, (error) => handleFirestoreError(error, OperationType.GET,'users'));

 return () => unsubStudents();
 }, [user.schoolId, user.classId, subjects]);

 const handlePostUpdate = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newAnnouncement.title || !newAnnouncement.content) return;
 if (newAnnouncement.target  === 'class'&& !newAnnouncement.classId) return;
 if (newAnnouncement.target  === 'student'&& !newAnnouncement.studentId) return;

 setPostStatus('posting');
 try {
 const announcementData = {
 title: newAnnouncement.title,
 content: newAnnouncement.content,
 schoolId: user.schoolId,
 teacherId: user.uid,
 teacherName:`${ user.firstName } ${ user.lastName }`,
 classId: newAnnouncement.target  === 'class'? newAnnouncement.classId : null,
 studentId: newAnnouncement.target  === 'student'? newAnnouncement.studentId : null,
 isSchoolWide: false,
 createdAt: new Date().toISOString()
 };
 await addDoc(collection(db,'schools', user.schoolId,'announcements'), announcementData);
 setPostStatus('success');
 setTimeout(() => {
 setShowAddAnnouncement(false);
 setPostStatus('idle');
 setNewAnnouncement({ title:'', content:'', classId:'', studentId:'', target:'class'});
 }, 1500);
 } catch (error) {
 console.error("Error posting update:", error);
 setPostStatus('error');
 setTimeout(() => setPostStatus('idle'), 3000);
 handleFirestoreError(error, OperationType.CREATE,`schools/${ user.schoolId }/announcements`);
 }
 };

 const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name ||'Unknown Class';
 const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name ||'Unknown Subject';

  const handleLogout = () => {
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      <div className="lg:hidden flex items-center justify-between p-4 bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xs">S</div>
          )}
          <span className="font-black uppercase tracking-tighter text-white truncate max-w-[150px]">{school?.name || 'SEEDD'}</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-white/60"><LogOut size={20} /></button>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <Link to="/profile" className="relative group cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-lg border-2 border-white/20 group-hover:scale-105 transition-transform">
                {user.firstName[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-[#020617] flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
                  Welcome, {user.firstName}!
                </h1>
                {school?.logoUrl && (
                  <img src={school.logoUrl} alt={school.name} className="w-6 h-6 rounded-md object-cover opacity-50" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 bg-white/5 px-2 py-0.5 rounded">
                  Teacher Portal
                </span>
                <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                  {user.classId ? getClassName(user.classId) : 'Specialist'}
                </span>
                {school?.name && (
                  <>
                    <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 truncate max-w-[150px]">
                      {school.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={handleLogout}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 border border-white/10 hover:border-red-500/20 transition-all font-black uppercase tracking-widest text-[10px]"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide no-scrollbar">
          {(['overview', 'classes', 'assignments', 'quizzes', 'results', 'attendance', 'timetable'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap shrink-0 border ${
                activeTab === tab
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

  { activeTab  === 'overview'&& (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -4 }} onClick={() => setActiveTab('classes')} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 cursor-pointer transition-all hover:bg-white/[0.07]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 shadow-sm border border-blue-500/20"><BookOpen size={ 24 } strokeWidth={ 2 } /></div>
            <span className="text-white/40 font-black text-[10px] uppercase tracking-widest">My Subjects</span>
          </div>
          <p className="text-4xl font-black text-white">{ subjects.length }</p>
        </motion.div>
        
        <motion.div whileHover={{ y: -4 }} onClick={() => setActiveTab('classes')} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 cursor-pointer transition-all hover:bg-white/[0.07]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 shadow-sm border border-emerald-500/20"><Users size={ 24 } strokeWidth={ 2 } /></div>
            <span className="text-white/40 font-black text-[10px] uppercase tracking-widest">My Classes</span>
          </div>
          <p className="text-4xl font-black text-white">
            { Array.from(new Set([...subjects.map(s => s.classId), ...(user.classId ? [user.classId] : [])])).length }
          </p>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} onClick={() => setActiveTab('assignments')} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 cursor-pointer transition-all hover:bg-white/[0.07]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400 shadow-sm border border-purple-500/20"><FileText size={ 24 } strokeWidth={ 2 } /></div>
            <span className="text-white/40 font-black text-[10px] uppercase tracking-widest">Assignments</span>
          </div>
          <p className="text-4xl font-black text-white">{ assignments.length }</p>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} onClick={() => setActiveTab('quizzes')} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 cursor-pointer transition-all hover:bg-white/[0.07]">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-400 shadow-sm border border-orange-500/20"><CheckSquare size={ 24 } strokeWidth={ 2 } /></div>
            <span className="text-white/40 font-black text-[10px] uppercase tracking-widest">Quizzes</span>
          </div>
          <p className="text-4xl font-black text-white">Manage</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('assignments')} className="p-6 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left flex flex-col gap-2 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2 shadow-sm border border-blue-500/20 group-hover:scale-110 transition-transform"><Plus size={ 24 } /></div>
              <span className="font-black uppercase tracking-widest text-[10px] text-white">New Assignment</span>
              <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">Upload homework</span>
            </motion.button>
            
            <motion.button whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('quizzes')} className="p-6 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left flex flex-col gap-2 group">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-2 shadow-sm border border-orange-500/20 group-hover:scale-110 transition-transform"><Plus size={ 24 } /></div>
              <span className="font-black uppercase tracking-widest text-[10px] text-white">Create Quiz</span>
              <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">Objective test</span>
            </motion.button>

            <motion.button whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('results')} className="p-6 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left flex flex-col gap-2 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 shadow-sm border border-emerald-500/20 group-hover:scale-110 transition-transform"><Award size={ 24 } /></div>
              <span className="font-black uppercase tracking-widest text-[10px] text-white">Enter Results</span>
              <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">Academic assessment</span>
            </motion.button>

            <motion.button whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('attendance')} className="p-6 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left flex flex-col gap-2 group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-2 shadow-sm border border-teal-500/20 group-hover:scale-110 transition-transform"><Calendar size={ 24 } /></div>
              <span className="font-black uppercase tracking-widest text-[10px] text-white">Mark Attendance</span>
              <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">Daily register</span>
            </motion.button>
          </div>
        </div>

        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
          <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-8">Recent Assignments</h3>
          <div className="space-y-4">
            { assignments.slice(0, 3).map(a => (
              <motion.div whileHover={{ x: 4 }} key={ a.id } className="flex gap-4 items-center p-5 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20">
                  <FileText size={ 24 } />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-black uppercase tracking-widest text-[10px] text-white truncate">{ a.title }</p>
                  <p className="text-[8px] text-white/40 font-black uppercase tracking-widest mt-1">{ getSubjectName(a.subjectId)}</p>
                </div>
                <div className="text-[8px] font-black uppercase tracking-widest text-orange-400 whitespace-nowrap bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full shadow-sm">
                  Due: { new Date(a.dueDate).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
            { assignments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white/20 mb-4 border border-white/10">
                  <FileText size={ 32 } />
                </div>
                <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">No recent assignments.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )}}

 { activeTab  === 'classes'&& (
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
 <h3 className="text-lg font-medium text-slate-900">My Classes & Subjects</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 { subjects.map(subject => (
 <div key={ subject.id } className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
 <div className="flex items-center gap-4 mb-6">
 <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50">
 <BookOpen size={ 20 } />
 </div>
 <div>
 <h4 className="font-medium text-xl text-slate-900">{ subject.name }</h4>
 <p className="text-sm text-slate-900 font-medium">{ getClassName(subject.classId)}</p>
 </div>
 </div>
 <div className="pt-6 border-t border-slate-100 space-y-6">
 <div className="flex justify-between items-center">
 <span className="text-[10px] font-medium uppercase tracking-wider text-slate-900">Students: { students.filter(s => s.classId === subject.classId).length }</span>
 <span className="text-[10px] font-medium uppercase tracking-wider text-slate-900">Assignments: { assignments.filter(a => a.subjectId === subject.id).length }</span>
 </div>
 <div className="flex gap-2">
 <button onClick={() => { setActiveTab('assignments'); }} className="flex-1 text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl border border-blue-100/50 shadow-sm text-center">
 New Assignment
 </button>
 <button onClick={() => { setActiveTab('results'); }} className="flex-1 text-emerald-600 text-sm font-medium hover:text-emerald-700 transition-colors bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-100/50 shadow-sm text-center">
 Enter Results
 </button>
 <button onClick={() => setSelectedClassForStudents(subject.classId)} className="flex-1 text-purple-600 text-sm font-medium hover:text-purple-700 transition-colors bg-purple-50 hover:bg-purple-100 px-4 py-2.5 rounded-xl border border-purple-100/50 shadow-sm text-center">
 View Students
 </button>
 </div>
 </div>
 </div>
 ))}
 { subjects.length === 0 && (
 <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
 <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-900 mx-auto mb-4 shadow-sm border border-slate-100">
 <BookOpen size={ 40 } />
 </div>
 <p className="text-slate-900 font-medium text-lg">You haven't been assigned to any subjects yet.</p>
 </div>
 )}
 </div>
 </motion.div>
 )}

 {/* Student Details Modal */}
 <AnimatePresence>
 { selectedClassForStudents && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
 <motion.div
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="bg-white rounded-2xl p-4 md:p-4 w-full max-w-2xl shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto relative"
 >
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-lg font-medium text-slate-900">Students in { getClassName(selectedClassForStudents)}</h3>
 <button 
 onClick={() => setSelectedClassForStudents(null)}
 className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-900 hover:text-slate-900"
 >
 <X size={ 20 } />
 </button>
 </div>
 <div className="space-y-6">
 { students.filter(s => s.classId === selectedClassForStudents).map(s => (
 <div key={ s.uid } className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
 { s.photoUrl ? (
 <img src={ s.photoUrl } alt={ s.firstName } className="w-10 h-10 rounded-full object-cover"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-medium text-blue-600 shrink-0">
 { s.firstName?.charAt(0) ||'?'}
 </div>
 )}
 <div>
 <p className="font-medium text-slate-900">{ s.firstName } { s.lastName }</p>
 <p className="text-xs text-slate-900 font-medium uppercase tracking-wider">Reg No: { s.registrationNumber ||'N/A'}</p>
 </div>
 </div>
 ))}
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>


 { activeTab  === 'assignments'&& (
 <TeacherAssignments user={ user } subjects={ subjects } classes={ classes } />
 )}

 { activeTab  === 'quizzes'&& (
 <TeacherQuizzes user={ user } subjects={ subjects } classes={ classes } />
 )}

 { activeTab  === 'results'&& (
 <TeacherResultWorkspace user={ user } />
 )}

 { activeTab  === 'attendance'&& (
 <TeacherAttendance user={ user } />
 )}

 { activeTab  === 'timetable'&& (
 <ClassTimetable user={ user } mode="view"/>
 )}

 {/* Post Update Modal */}
 <AnimatePresence>
 { showAddAnnouncement && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
 <motion.div
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="bg-white rounded-2xl p-4 md:p-4 w-full max-w-2xl shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto relative"
 >
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-lg font-medium text-slate-900">Post Update</h3>
 <button 
 onClick={() => setShowAddAnnouncement(false)}
 className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-900 hover:text-slate-900"
 >
 <X size={ 20 } />
 </button>
 </div>
 <form onSubmit={ handlePostUpdate } className="space-y-5">
 <div className="space-y-6">
 <div className="flex gap-4 p-1 bg-gray-100 rounded-2xl">
 <button
 type="button"
 onClick={() => setNewAnnouncement({ ...newAnnouncement, target:'class', studentId:''})}
 className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${ newAnnouncement.target  === 'class'?'bg-white text-blue-600 shadow-sm':'text-slate-900 hover:text-slate-900'}`}
 >
 Class Update
 </button>
 <button
 type="button"
 onClick={() => setNewAnnouncement({ ...newAnnouncement, target:'student', classId:''})}
 className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${ newAnnouncement.target  === 'student'?'bg-white text-blue-600 shadow-sm':'text-slate-900 hover:text-slate-900'}`}
 >
 Student Specific
 </button>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Title</label>
 <input
 type="text"
 required
 value={ newAnnouncement.title }
 onChange={ e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 placeholder="e.g. Test Tomorrow"
 />
 </div>

 { newAnnouncement.target  === 'class'? (
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Target Class</label>
 <select
 required
 value={ newAnnouncement.classId }
 onChange={ e => setNewAnnouncement({ ...newAnnouncement, classId: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 >
 <option value="">Select Class</option>
 { classes
 .filter(c => subjects.some(s => s.classId === c.id) || user.classId === c.id)
 .map(c => (
 <option key={ c.id } value={ c.id }>{ c.name }</option>
 ))}
 </select>
 </div>
 ) : (
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Target Student</label>
 <select
 required
 value={ newAnnouncement.studentId }
 onChange={ e => setNewAnnouncement({ ...newAnnouncement, studentId: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 >
 <option value="">Select Student</option>
 { students.map(s => (
 <option key={ s.uid } value={ s.uid }>{ s.firstName } { s.lastName } ({ getClassName(s.classId ||'')})</option>
 ))}
 </select>
 </div>
 )}

 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Content</label>
 <textarea
 required
 value={ newAnnouncement.content }
 onChange={ e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 min-h-[120px] cursor-text"
 placeholder="Write your update here..."
 />
 </div>
 </div>
 <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
 <button type="button"onClick={() => setShowAddAnnouncement(false)} className="px-4 py-2 rounded-lg font-medium text-slate-900 hover:bg-slate-50 hover:text-slate-900 transition-all border border-gray-200/50 shadow-sm">Cancel</button>
 <button
 type="submit"
 disabled={ postStatus !=='idle'}
 className={`px-4 py-2 rounded-lg font-medium text-slate-900 transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${
 postStatus  === 'success'?'bg-emerald-500':
 postStatus  === 'error'?'bg-red-500':
'bg-purple-600 hover:bg-purple-700'
 }`}
 >
 { postStatus  === 'posting'?'Posting...':
 postStatus  === 'success'?'Posted!':
 postStatus  === 'error'?'Failed':
'Post Update'}
 </button>
 </div>
 </form>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 </div>
 );
};
