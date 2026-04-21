import { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, addDoc, doc, deleteDoc, onSnapshot, OperationType, handleFirestoreError } from '../../firebase';
import { UserProfile, Class, Subject, Assignment } from '../../types';
import { Plus, BookOpen, FileText, CheckSquare, Bell, TrendingUp, Users, Trash2, Calendar, Award, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, sortByFullName } from '../../lib/utils';
import { TeacherQuizzes } from './TeacherQuizzes';
import { TeacherResultWorkspace } from './TeacherResultWorkspace';
import { TeacherAssignments } from './TeacherAssignments';
import TeacherAttendance from './TeacherAttendance';
import ClassTimetable from './ClassTimetable';

export const TeacherDashboard = ({ user }: { user: UserProfile }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'assignments' | 'quizzes' | 'results' | 'attendance' | 'timetable'>('overview');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [postStatus, setPostStatus] = useState<'idle' | 'posting' | 'success' | 'error'>('idle');
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', classId: '', studentId: '', target: 'class' as 'class' | 'student' });
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

  // Separate effect for students to handle subjects dependency correctly
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
      
      // If teacher has no subjects and no classId, they see no students
      if (teacherClassIds.length === 0) {
        setStudents([]);
        return;
      }

      const filteredStudents = allStudents.filter(s => s.classId && teacherClassIds.includes(s.classId));
      setStudents(sortByFullName(filteredStudents));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    return () => unsubStudents();
  }, [user.schoolId, user.classId, subjects]);

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    if (newAnnouncement.target === 'class' && !newAnnouncement.classId) return;
    if (newAnnouncement.target === 'student' && !newAnnouncement.studentId) return;

    setPostStatus('posting');
    try {
      const announcementData = {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        schoolId: user.schoolId,
        teacherId: user.uid,
        teacherName: `${user.firstName} ${user.lastName}`,
        classId: newAnnouncement.target === 'class' ? newAnnouncement.classId : null,
        studentId: newAnnouncement.target === 'student' ? newAnnouncement.studentId : null,
        isSchoolWide: false,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'schools', user.schoolId, 'announcements'), announcementData);
      setPostStatus('success');
      setTimeout(() => {
        setShowAddAnnouncement(false);
        setPostStatus('idle');
        setNewAnnouncement({ title: '', content: '', classId: '', studentId: '', target: 'class' });
      }, 1500);
    } catch (error) {
      console.error("Error posting update:", error);
      setPostStatus('error');
      setTimeout(() => setPostStatus('idle'), 3000);
      handleFirestoreError(error, OperationType.CREATE, `schools/${user.schoolId}/announcements`);
    }
  };

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'Unknown Class';
  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap bg-white/40 backdrop-blur-md p-1 rounded-xl border border-gray-200/50 bg-gray-50/50">
          {(['overview', 'classes', 'assignments', 'quizzes', 'results', 'attendance', 'timetable'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all duration-300 ${
                activeTab === tab ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-gray-800 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div 
              whileHover={{ y: -4 }} 
              onClick={() => setActiveTab('classes')}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:border-blue-200"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2.5 bg-blue-50 rounded-2xl text-blue-600 shadow-sm border border-blue-100/50"><BookOpen size={20} strokeWidth={2} /></div>
                <span className="text-gray-800 font-medium text-xs uppercase tracking-wider">My Subjects</span>
              </div>
              <p className="text-xl font-medium text-gray-800">{subjects.length}</p>
            </motion.div>
            <motion.div 
              whileHover={{ y: -4 }} 
              onClick={() => setActiveTab('classes')}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:border-emerald-200"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100/50"><Users size={20} strokeWidth={2} /></div>
                <span className="text-gray-800 font-medium text-xs uppercase tracking-wider">My Classes</span>
              </div>
              <p className="text-xl font-medium text-gray-800">
                {Array.from(new Set([...subjects.map(s => s.classId), ...(user.classId ? [user.classId] : [])])).length}
              </p>
            </motion.div>
            <motion.div whileHover={{ y: -4 }} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:border-purple-200" onClick={() => setActiveTab('assignments')}>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2.5 bg-purple-50 rounded-2xl text-purple-600 shadow-sm border border-purple-100/50"><FileText size={20} strokeWidth={2} /></div>
                <span className="text-gray-800 font-medium text-xs uppercase tracking-wider">Assignments</span>
              </div>
              <p className="text-xl font-medium text-gray-800">{assignments.length}</p>
            </motion.div>
            <motion.div whileHover={{ y: -4 }} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:border-orange-200" onClick={() => setActiveTab('quizzes')}>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2.5 bg-orange-50 rounded-2xl text-orange-600 shadow-sm border border-orange-100/50"><CheckSquare size={20} strokeWidth={2} /></div>
                <span className="text-gray-800 font-medium text-xs uppercase tracking-wider">Quizzes</span>
              </div>
              <p className="text-xl font-medium text-gray-800">Manage</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-medium text-xl text-gray-800">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => { setActiveTab('assignments'); }} className="p-4 rounded-2xl bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-1 group">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 shadow-sm border border-blue-100/50 group-hover:scale-110 transition-transform"><Plus size={20} /></div>
                  <span className="font-medium text-gray-800 block truncate">New Assignment</span>
                  <span className="text-xs text-gray-800 font-medium">Upload homework</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('quizzes')} className="p-4 rounded-2xl bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-1 group">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-2 shadow-sm border border-orange-100/50 group-hover:scale-110 transition-transform"><Plus size={20} /></div>
                  <span className="font-medium text-gray-800 block truncate">Create Quiz</span>
                  <span className="text-xs text-gray-800 font-medium">Objective test</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('results')} className="p-4 rounded-2xl bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-1 group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 shadow-sm border border-emerald-100/50 group-hover:scale-110 transition-transform"><Award size={20} /></div>
                  <span className="font-medium text-gray-800 block truncate">Enter Results</span>
                  <span className="text-xs text-gray-800 font-medium">Academic assessment</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('attendance')} className="p-4 rounded-2xl bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-1 group">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2 shadow-sm border border-teal-100/50 group-hover:scale-110 transition-transform"><Calendar size={20} /></div>
                  <span className="font-medium text-gray-800 block truncate">Mark Attendance</span>
                  <span className="text-xs text-gray-800 font-medium">Daily register</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowAddAnnouncement(true)} className="p-4 rounded-2xl bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-1 group">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 shadow-sm border border-purple-100/50 group-hover:scale-110 transition-transform"><Bell size={20} /></div>
                  <span className="font-medium text-gray-800 block truncate">Post Update</span>
                  <span className="text-xs text-gray-800 font-medium">Class announcement</span>
                </motion.button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-medium text-xl text-gray-800 mb-6">Recent Assignments</h3>
              <div className="space-y-3">
                {assignments.slice(0, 3).map(a => (
                  <motion.div whileHover={{ x: 4 }} key={a.id} className="flex gap-4 items-center p-4 rounded-2xl bg-white hover:bg-gray-50 border border-gray-100 shadow-sm hover:shadow-sm transition-all cursor-pointer">
                    <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm border border-blue-100/50">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium text-gray-800 text-sm truncate">{a.title}</p>
                      <p className="text-xs text-gray-800 font-medium">{getSubjectName(a.subjectId)}</p>
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-orange-600 whitespace-nowrap bg-orange-50 border border-orange-100/50 px-3 py-1.5 rounded-full shadow-sm">
                      Due: {new Date(a.dueDate).toLocaleDateString()}
                    </div>
                  </motion.div>
                ))}
                {assignments.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-800 mb-3 shadow-sm border border-gray-100/50">
                      <FileText size={20} />
                    </div>
                    <p className="text-gray-800 font-medium">No recent assignments.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'classes' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <h3 className="text-lg font-medium text-gray-800">My Classes & Subjects</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map(subject => (
              <div key={subject.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-xl text-gray-800">{subject.name}</h4>
                    <p className="text-sm text-gray-800 font-medium">{getClassName(subject.classId)}</p>
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-100 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-800">Students: {students.filter(s => s.classId === subject.classId).length}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-800">Assignments: {assignments.filter(a => a.subjectId === subject.id).length}</span>
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
            {subjects.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-800 mx-auto mb-4 shadow-sm border border-gray-100/50">
                  <BookOpen size={40} />
                </div>
                <p className="text-gray-800 font-medium text-lg">You haven't been assigned to any subjects yet.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Student Details Modal */}
      <AnimatePresence>
        {selectedClassForStudents && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-4 md:p-4 w-full max-w-2xl shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto relative"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-800">Students in {getClassName(selectedClassForStudents)}</h3>
                <button 
                  onClick={() => setSelectedClassForStudents(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-800 hover:text-gray-800"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                {students.filter(s => s.classId === selectedClassForStudents).map(s => (
                  <div key={s.uid} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    {s.photoUrl ? (
                      <img src={s.photoUrl} alt={s.firstName} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-medium text-blue-600 shrink-0">
                        {s.firstName?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-gray-800 font-medium uppercase tracking-wider">Reg No: {s.registrationNumber || 'N/A'}</p>
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

      {/* Post Update Modal */}
      <AnimatePresence>
        {showAddAnnouncement && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-4 md:p-4 w-full max-w-2xl shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto relative"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-800">Post Update</h3>
                <button 
                  onClick={() => setShowAddAnnouncement(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-800 hover:text-gray-800"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handlePostUpdate} className="space-y-5">
                <div className="space-y-6">
                  <div className="flex gap-4 p-1 bg-gray-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setNewAnnouncement({ ...newAnnouncement, target: 'class', studentId: '' })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${newAnnouncement.target === 'class' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-800 hover:text-gray-800'}`}
                    >
                      Class Update
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAnnouncement({ ...newAnnouncement, target: 'student', classId: '' })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${newAnnouncement.target === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-800 hover:text-gray-800'}`}
                    >
                      Student Specific
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Title</label>
                    <input
                      type="text"
                      required
                      value={newAnnouncement.title}
                      onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                      placeholder="e.g. Test Tomorrow"
                    />
                  </div>

                  {newAnnouncement.target === 'class' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Target Class</label>
                      <select
                        required
                        value={newAnnouncement.classId}
                        onChange={e => setNewAnnouncement({ ...newAnnouncement, classId: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                      >
                        <option value="">Select Class</option>
                        {classes
                          .filter(c => subjects.some(s => s.classId === c.id) || user.classId === c.id)
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Target Student</label>
                      <select
                        required
                        value={newAnnouncement.studentId}
                        onChange={e => setNewAnnouncement({ ...newAnnouncement, studentId: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                      >
                        <option value="">Select Student</option>
                        {students.map(s => (
                          <option key={s.uid} value={s.uid}>{s.firstName} {s.lastName} ({getClassName(s.classId || '')})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Content</label>
                    <textarea
                      required
                      value={newAnnouncement.content}
                      onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 min-h-[120px] cursor-text"
                      placeholder="Write your update here..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                  <button type="button" onClick={() => setShowAddAnnouncement(false)} className="px-4 py-2 rounded-lg font-medium text-gray-800 hover:bg-gray-50 hover:text-gray-800 transition-all border border-gray-200/50 shadow-sm">Cancel</button>
                  <button
                    type="submit"
                    disabled={postStatus !== 'idle'}
                    className={`px-4 py-2 rounded-lg font-medium text-white transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${
                      postStatus === 'success' ? 'bg-emerald-500' :
                      postStatus === 'error' ? 'bg-red-500' :
                      'bg-purple-600 hover:bg-purple-700 '
                    }`}
                  >
                    {postStatus === 'posting' ? 'Posting...' :
                     postStatus === 'success' ? 'Posted!' :
                     postStatus === 'error' ? 'Failed' :
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
