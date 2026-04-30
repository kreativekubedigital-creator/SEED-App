import React, { useState, useEffect } from 'react';
import { db, collection, query, where, addDoc, doc, deleteDoc, onSnapshot, updateDoc, OperationType, handleFirestoreError } from '../../lib/compatibility';
import { UserProfile, Class, Subject, Assignment, AssignmentSubmission } from '../../types';
import { 
  Plus, Trash2, Calendar, FileText, CheckCircle2, 
  Clock, ChevronRight, X, User, Award, 
  MessageSquare, Search, Filter, ArrowUpRight,
  Users, MoreVertical, Edit2, AlertCircle, Eye, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDisplayString } from '../../lib/utils';

interface TeacherAssignmentsProps {
  user: UserProfile;
  subjects: Subject[];
  classes: Class[];
}

export const TeacherAssignments = ({ user, subjects, classes }: TeacherAssignmentsProps) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null); // assignmentId
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    subjectId: '',
    classId: '',
    dueDate: new Date().toISOString().split('T')[0],
    pointsWeight: 10,
    questions: [] as { id: string; text: string; type: 'multiple_choice' | 'short_answer'; options?: string[]; correctAnswer?: string }[]
  });

  const [newQuestion, setNewQuestion] = useState({
    text: '',
    type: 'short_answer' as 'multiple_choice' | 'short_answer',
    options: ['', '', '', ''],
    correctAnswer: ''
  });

  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user.schoolId || !user.uid) return;

    const qAssignments = query(collection(db, 'schools', user.schoolId, 'assignments'), where('teacherId', '==', user.uid));
    const unsubAssignments = onSnapshot(qAssignments, (snap) => {
      const assignmentsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
      assignmentsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAssignments(assignmentsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/assignments`));

    return () => unsubAssignments();
  }, [user.schoolId, user.uid]);

  useEffect(() => {
    if (!user.schoolId || !viewingSubmissions) return;

    const qSubmissions = query(collection(db, 'schools', user.schoolId, 'assignmentSubmissions'), where('assignmentId', '==', viewingSubmissions));
    const unsubSubmissions = onSnapshot(qSubmissions, (snap) => {
      const submissionsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentSubmission));
      submissionsData.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setSubmissions(submissionsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/assignmentSubmissions`));

    return () => unsubSubmissions();
  }, [user.schoolId, viewingSubmissions]);

  const handleAddQuestion = () => {
    if (!newQuestion.text) return;
    setNewAssignment({
      ...newAssignment,
      questions: [
        ...newAssignment.questions,
        {
          id: Math.random().toString(36).substr(2, 9),
          ...newQuestion,
          options: newQuestion.type === 'multiple_choice' ? newQuestion.options.filter(o => o.trim() !== '') : undefined
        }
      ]
    });
    setNewQuestion({
      text: '',
      type: 'short_answer',
      options: ['', '', '', ''],
      correctAnswer: ''
    });
  };

  const removeQuestion = (id: string) => {
    setNewAssignment({
      ...newAssignment,
      questions: newAssignment.questions.filter(q => q.id !== id)
    });
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.title || !newAssignment.subjectId || !newAssignment.dueDate) return;

    const subject = subjects.find(s => s.id === newAssignment.subjectId);
    if (!subject) return;

    try {
      const assignmentData = {
        ...newAssignment,
        schoolId: user.schoolId,
        teacherId: user.uid,
        classId: subject.classId,
        createdAt: new Date().toISOString(),
        status: 'active'
      };
      await addDoc(collection(db, 'schools', user.schoolId, 'assignments'), assignmentData);
      setShowAddAssignment(false);
      setNewAssignment({
        title: '',
        description: '',
        subjectId: '',
        classId: '',
        dueDate: new Date().toISOString().split('T')[0],
        pointsWeight: 10,
        questions: []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignments');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!user.schoolId) return;
    try {
      await deleteDoc(doc(db, 'schools', user.schoolId, 'assignments', id));
      setAssignments(assignments.filter(a => a.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assignments/${id}`);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission || !user.schoolId) return;

    try {
      const submissionRef = doc(db, 'schools', user.schoolId, 'assignmentSubmissions', gradingSubmission.id);
      await updateDoc(submissionRef, {
        status: 'graded',
        score: gradingSubmission.score,
        feedback: gradingSubmission.feedback,
        gradedAt: new Date().toISOString(),
        gradedBy: user.uid
      });
      setGradingSubmission(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `assignmentSubmissions/${gradingSubmission.id}`);
    }
  };

  const getClassName = (classId: string) => formatDisplayString(classes.find(c => c.id === classId)?.name || 'Unknown Class');
  const getSubjectName = (subjectId: string) => formatDisplayString(subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject');

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">
            Assignment Hub
          </h1>
          <p className="text-slate-500 font-medium text-lg mt-1">Design, deploy, and evaluate academic excellence</p>
        </div>
        <button
          onClick={() => setShowAddAssignment(true)}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Create New Assignment
        </button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-10">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
            {(['active', 'closed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-blue-500" />
              <input
                type="text"
                placeholder="SEARCH ASSIGNMENTS..."
                className="pl-12 pr-6 py-4 bg-slate-50 border-none rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest w-full md:w-72 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
              />
            </div>
            <button className="p-4 bg-slate-50 text-slate-400 rounded-[1.25rem] hover:bg-slate-100 transition-all border border-slate-100">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Assignment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {assignments
            .filter(a => activeTab === 'active' ? (a as any).status !== 'closed' : (a as any).status === 'closed')
            .map(assignment => (
              <motion.div
                key={assignment.id}
                whileHover={{ y: -8 }}
                className="bg-white p-10 rounded-[3.5rem] shadow-sm hover:shadow-2xl border border-slate-100 group transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex flex-col gap-3">
                    <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100 w-fit">
                      {getSubjectName(assignment.subjectId)}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {getClassName(assignment.classId || '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingSubmissions(assignment.id)}
                      className="p-4 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-all duration-300 border border-slate-100 shadow-sm"
                    >
                      <Eye size={18} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="p-4 bg-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white rounded-2xl transition-all duration-300 border border-slate-100 shadow-sm"
                    >
                      <Trash2 size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                <div className="mb-10 relative z-10">
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                    {assignment.title}
                  </h4>
                  <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-relaxed">
                    {assignment.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-slate-50 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400">
                      <Clock size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Deadline</p>
                      <p className="text-[11px] font-black text-slate-900 uppercase">{new Date(assignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Weight</p>
                    <p className="text-[11px] font-black text-blue-600">{assignment.pointsWeight || 10} POINTS</p>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      </div>

      {/* New Assignment Modal */}
      <AnimatePresence>
        {showAddAssignment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddAssignment(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-12 py-10 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Assignment</h2>
                  <p className="text-slate-500 font-medium text-lg mt-1">Design a comprehensive academic task</p>
                </div>
                <button 
                  onClick={() => setShowAddAssignment(false)}
                  className="p-4 bg-white text-slate-400 hover:text-red-500 rounded-2xl shadow-sm border border-slate-100 transition-all hover:bg-red-50"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-12">
                <form onSubmit={handleCreateAssignment} className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <div className="space-y-3 col-span-full">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                        Assignment Title
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="E.G. QUANTUM PHYSICS BASICS"
                        value={newAssignment.title}
                        onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                        className="w-full px-8 py-5 bg-slate-50 border-none rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                        Subject
                      </label>
                      <select
                        required
                        value={newAssignment.subjectId}
                        onChange={e => setNewAssignment({ ...newAssignment, subjectId: e.target.value })}
                        className="w-full px-8 py-5 bg-slate-50 border-none rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-500/5 transition-all outline-none appearance-none cursor-pointer"
                      >
                        <option value="">SELECT SUBJECT</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{formatDisplayString(s.name)} ({getClassName(s.classId)})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Submission Deadline</label>
                        <div className="relative">
                          <input
                            type="date"
                            required
                            value={newAssignment.dueDate}
                            onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                            className="w-full pl-14 pr-8 py-5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-black text-slate-900 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                          />
                          <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Points Weight</label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            min="1"
                            max="100"
                            value={newAssignment.pointsWeight}
                            onChange={e => setNewAssignment({ ...newAssignment, pointsWeight: parseInt(e.target.value) })}
                            className="w-full pl-14 pr-8 py-5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-black text-slate-900 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                            placeholder="10"
                          />
                          <Award className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 col-span-full">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                        Instructions & Description
                      </label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Provide detailed instructions for your students..."
                        value={newAssignment.description}
                        onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                        className="w-full px-8 py-6 bg-slate-50 border-none rounded-[2rem] text-lg font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Question Builder Section */}
                  <div className="pt-12 border-t border-slate-100">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="p-4 bg-purple-50 text-purple-600 rounded-[1.25rem] border border-purple-100 shadow-sm">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tight">Question Builder</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Structure your assessment tasks</p>
                      </div>
                    </div>

                    <div className="space-y-6 mb-10">
                      {newAssignment.questions.map((q, idx) => (
                        <div key={q.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all duration-500">
                          <div className="flex items-center gap-6">
                            <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-lg">#{idx + 1}</span>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-1">{q.text}</p>
                              <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                                {formatDisplayString(q.type)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeQuestion(q.id)}
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="p-10 bg-blue-50/30 rounded-[3rem] border border-blue-100/50 space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Question Text</label>
                          <input
                            type="text"
                            value={newQuestion.text}
                            onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                            placeholder="WHAT IS THE POWER OF AI?"
                            className="w-full px-8 py-5 bg-white border border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Type</label>
                          <select
                            value={newQuestion.type}
                            onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value as any })}
                            className="w-full px-8 py-5 bg-white border border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                          >
                            <option value="short_answer">SHORT ANSWER</option>
                            <option value="multiple_choice">MULTIPLE CHOICE</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="w-full py-5 bg-white border-2 border-dashed border-blue-200 text-blue-600 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
                      >
                        <Plus size={20} strokeWidth={3} /> Append Question To Task
                      </button>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-col sm:flex-row justify-end gap-6 pt-12 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddAssignment(false)}
                      className="px-12 py-5 rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                    >
                      Discard Changes
                    </button>
                    <button
                      type="submit"
                      className="px-16 py-5 bg-blue-600 text-white rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                    >
                      Deploy Assignment
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Portal View (Slide-over) */}
      <AnimatePresence>
        {viewingSubmissions && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[110] w-full max-w-5xl bg-[#F8FAFC] shadow-2xl flex flex-col"
          >
            {/* Slide-over Header */}
            <div className="px-12 py-10 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-8">
                <button 
                  onClick={() => setViewingSubmissions(null)}
                  className="p-4 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all border border-slate-100"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Submissions Portal</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                      {assignments.find(a => a.id === viewingSubmissions)?.title}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Submissions */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-12 space-y-12">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Active Tasks', value: assignments.length, color: 'text-blue-600', icon: BookOpen },
                  { label: 'Pending Reviews', value: submissions.filter(s => s.status !== 'graded').length, color: 'text-amber-600', icon: AlertCircle },
                  { label: 'Completed', value: submissions.filter(s => s.status === 'graded').length, color: 'text-emerald-600', icon: CheckCircle2 },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all duration-500">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                      <p className={`text-4xl font-black ${stat.color} tracking-tight`}>{stat.value}</p>
                    </div>
                    <div className={`w-16 h-16 rounded-3xl ${stat.color.replace('text-', 'bg-')}/10 flex items-center justify-center`}>
                      <stat.icon className={stat.color} size={28} strokeWidth={2.5} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Submissions List */}
              <div className="space-y-8">
                <div className="flex items-center justify-between px-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Student Submissions</h4>
                  <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Filter className="w-4 h-4" />
                    Sort By Recent
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {submissions.map((sub, i) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white p-8 rounded-[3rem] shadow-sm hover:shadow-xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between group transition-all duration-500"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 text-white flex items-center justify-center text-xl font-black shadow-lg border-2 border-white group-hover:scale-110 transition-transform duration-500">
                          {sub.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-900 tracking-tight uppercase">{sub.studentName}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                            <Clock size={14} /> SUBMITTED {new Date(sub.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 w-full md:w-auto mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-slate-50">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-2xl font-black text-slate-900">{sub.score || '—'}</span>
                            <span className="text-[11px] font-black text-slate-300">/ {sub.totalScore || '100'}</span>
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${sub.status === 'graded' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {sub.status === 'graded' ? 'GRADED' : 'PENDING'}
                          </span>
                        </div>
                        <button 
                          onClick={() => setGradingSubmission(sub)}
                          className="flex-1 md:flex-none px-10 py-4 bg-slate-50 text-slate-900 group-hover:bg-blue-600 group-hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 shadow-sm"
                        >
                          EVALUATE
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {submissions.length === 0 && (
                    <div className="py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-100">
                      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-6 shadow-sm border border-slate-100">
                        <User size={32} />
                      </div>
                      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Await submissions from students</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evaluation Modal */}
      <AnimatePresence>
        {gradingSubmission && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGradingSubmission(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[4rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-12 py-10 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white text-blue-600 flex items-center justify-center shadow-sm border border-slate-100">
                    <Award size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Academic Evaluation</h3>
                    <p className="text-slate-500 font-medium text-lg mt-1">Evaluating: <span className="text-blue-600 font-black uppercase">{gradingSubmission.studentName}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setGradingSubmission(null)} 
                  className="p-4 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm border border-slate-100 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-12 space-y-12">
                <div className="space-y-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Submission Analysis</h4>
                  
                  {gradingSubmission.answers.map((ans, idx) => (
                    <div key={idx} className="p-10 bg-slate-50/50 rounded-[3rem] border border-slate-100 space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">Q{idx + 1}</span>
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">Task Question {idx + 1}</p>
                      </div>
                      <div className="p-8 bg-white rounded-[2rem] border border-slate-200 text-lg text-slate-700 leading-relaxed shadow-sm font-medium">
                        {ans.answer || 'No response provided.'}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleGradeSubmission} className="pt-12 border-t border-slate-100 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Grade Assignment</label>
                      <div className="flex items-center gap-6">
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            required
                            value={gradingSubmission.score || 0}
                            onChange={e => setGradingSubmission({ ...gradingSubmission, score: parseInt(e.target.value) })}
                            className="w-full px-8 py-8 bg-slate-50 border-none rounded-[2rem] text-4xl font-black text-center text-slate-900 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                          />
                          <span className="absolute -top-3 left-8 bg-white px-3 text-[9px] font-black text-slate-400 border border-slate-100 rounded-full">SCORE</span>
                        </div>
                        <span className="text-4xl font-black text-slate-200">/</span>
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            readOnly
                            value={gradingSubmission.totalScore || 100}
                            className="w-full px-8 py-8 bg-slate-50 border-none rounded-[2rem] text-4xl font-black text-center text-slate-400 outline-none"
                          />
                          <span className="absolute -top-3 left-8 bg-white px-3 text-[9px] font-black text-slate-400 border border-slate-100 rounded-full">TOTAL</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Quick Feedback</label>
                      <div className="flex flex-wrap gap-3">
                        {['Excellent Work', 'Needs Improvement', 'Great Effort', 'Incomplete'].map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setGradingSubmission({ ...gradingSubmission, feedback: f })}
                            className="px-5 py-2.5 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100 transition-all duration-300"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Detailed Remarks</label>
                    <textarea
                      rows={5}
                      value={gradingSubmission.feedback || ''}
                      onChange={e => setGradingSubmission({ ...gradingSubmission, feedback: e.target.value })}
                      placeholder="ENTER PROFESSIONAL FEEDBACK HERE..."
                      className="w-full px-10 py-8 bg-slate-50 border-none rounded-[2.5rem] text-lg font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-6 pt-12 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setGradingSubmission(null)}
                      className="px-12 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      className="px-16 py-5 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      Finalize Evaluation
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {assignmentToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssignmentToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[4rem] p-16 w-full max-w-md shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-28 h-28 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-red-100 shadow-sm">
                <Trash2 size={48} strokeWidth={2.5} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Delete Data?</h3>
              <p className="text-slate-500 font-medium text-lg mb-12 leading-relaxed">
                This action will <span className="text-red-600 font-black">permanently eradicate</span> this assignment and all associated student submissions.
              </p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    handleDeleteAssignment(assignmentToDelete);
                    setAssignmentToDelete(null);
                  }}
                  className="w-full py-6 bg-red-600 text-white rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-red-500/20 hover:bg-red-700 transition-all active:scale-95"
                >
                  YES, PURGE RECORD
                </button>
                <button
                  onClick={() => setAssignmentToDelete(null)}
                  className="w-full py-6 bg-slate-50 text-slate-400 rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                >
                  CANCEL REQUEST
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
