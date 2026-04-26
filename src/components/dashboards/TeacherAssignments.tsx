import React, { useState, useEffect } from 'react';
import { db, collection, query, where, addDoc, doc, deleteDoc, onSnapshot, updateDoc, OperationType, handleFirestoreError } from '../../lib/compatibility';
import { UserProfile, Class, Subject, Assignment, AssignmentSubmission } from '../../types';
import { Plus, Trash2, Calendar, FileText, CheckCircle2, Clock, ChevronRight, X, User, Award, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    subjectId: '',
    dueDate: '',
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
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'schools', user.schoolId, 'assignments'), assignmentData);
      setShowAddAssignment(false);
      setNewAssignment({
        title: '',
        description: '',
        subjectId: '',
        dueDate: '',
        questions: []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignments');
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete || !user.schoolId) return;
    try {
      await deleteDoc(doc(db, 'schools', user.schoolId, 'assignments', assignmentToDelete));
      setAssignments(assignments.filter(a => a.id !== assignmentToDelete));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assignments/${assignmentToDelete}`);
    } finally {
      setAssignmentToDelete(null);
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

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'Unknown Class';
  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Assignment Management</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Create and manage academic tasks</p>
        </div>
        <button
          id="btn_create_assignment"
          onClick={() => setShowAddAssignment(true)}
          className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> Create Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map(assignment => (
          <motion.div
            key={assignment.id}
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-6 group hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm">
                <FileText size={24} strokeWidth={2.5} />
              </div>
              <button
                id={`btn_assignment_delete_${assignment.id}`}
                onClick={() => setAssignmentToDelete(assignment.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
            <div className="relative z-10">
              <h4 className="font-black uppercase tracking-widest text-lg text-slate-900 leading-tight">{assignment.title}</h4>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                {getSubjectName(assignment.subjectId)} <span className="mx-1 text-slate-200">•</span> {getClassName(assignment.classId)}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-4 py-2 rounded-full border border-orange-100 w-fit relative z-10 shadow-sm">
              <Calendar size={14} strokeWidth={3} />
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </div>
            <div className="pt-6 border-t border-slate-50 relative z-10">
              <button
                id={`btn_assignment_view_submissions_${assignment.id}`}
                onClick={() => setViewingSubmissions(assignment.id)}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98]"
              >
                View Submissions <ChevronRight size={14} strokeWidth={3} />
              </button>
            </div>
          </motion.div>
        ))}
        {assignments.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100 shadow-sm">
              <FileText size={40} />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No assignments created yet.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddAssignment && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-4xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">New Assignment</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Design a new task for your students</p>
                </div>
                <button 
                  onClick={() => setShowAddAssignment(false)} 
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Title</label>
                    <input
                      id="input_assignment_title"
                      type="text"
                      required
                      value={newAssignment.title}
                      onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
                      placeholder="e.g. Weekly English Essay"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                    <select
                      required
                      value={newAssignment.subjectId}
                      onChange={e => setNewAssignment({ ...newAssignment, subjectId: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({getClassName(s.classId)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                    <textarea
                      id="input_assignment_description"
                      required
                      value={newAssignment.description}
                      onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 min-h-[120px]"
                      placeholder="Instructions for the students..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={newAssignment.dueDate}
                      onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h4 className="text-lg font-black uppercase tracking-widest text-slate-900 mb-6">Questions ({newAssignment.questions.length})</h4>
                  
                  <div className="space-y-4 mb-8">
                    {newAssignment.questions.map((q, idx) => (
                      <div key={q.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex justify-between items-start group hover:bg-white hover:shadow-md transition-all">
                        <div>
                          <p className="font-black uppercase tracking-widest text-xs text-slate-900">Q{idx + 1}: {q.text}</p>
                          <p className="text-[8px] text-blue-600 font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 bg-blue-50 rounded w-fit border border-blue-100">{q.type.replace('_', ' ')}</p>
                          {q.options && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {q.options.map((opt, i) => (
                                <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">{opt}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-8 rounded-[2.5rem] bg-blue-50/50 border border-blue-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Question Text</label>
                        <input
                          type="text"
                          value={newQuestion.text}
                          onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
                          placeholder="Enter question..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Type</label>
                        <select
                          value={newQuestion.type}
                          onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value as any })}
                          className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
                        >
                          <option value="short_answer">Short Answer</option>
                          <option value="multiple_choice">Multiple Choice</option>
                        </select>
                      </div>
                    </div>

                    {newQuestion.type === 'multiple_choice' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {newQuestion.options.map((opt, idx) => (
                          <input
                            key={idx}
                            id={`input_assignment_option_${idx}`}
                            type="text"
                            value={opt}
                            onChange={e => {
                              const newOpts = [...newQuestion.options];
                              newOpts[idx] = e.target.value;
                              setNewQuestion({ ...newQuestion, options: newOpts });
                            }}
                            className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900"
                            placeholder={`Option ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      id="btn_assignment_add_question"
                      type="button"
                      onClick={handleAddQuestion}
                      className="w-full py-4 rounded-2xl bg-white border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Plus size={16} strokeWidth={3} /> Add Question to Assignment
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-slate-100">
                  <button
                    id="btn_assignment_cancel_create"
                    type="button"
                    onClick={() => setShowAddAssignment(false)}
                    className="order-2 sm:order-1 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn_assignment_save"
                    type="submit"
                    className="order-1 sm:order-2 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                  >
                    Create Assignment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingSubmissions && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-5xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Student Submissions</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">
                    {assignments.find(a => a.id === viewingSubmissions)?.title}
                  </p>
                </div>
                <button 
                  onClick={() => setViewingSubmissions(null)} 
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {submissions.map(sub => (
                  <div key={sub.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 border-white">
                        {sub.studentName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black uppercase tracking-widest text-sm text-slate-900">{sub.studentName}</h4>
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                        sub.status === 'graded' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {sub.status === 'graded' ? `Graded: ${sub.score}/${sub.totalScore}` : 'Pending Grade'}
                      </div>
                      <button
                        onClick={() => setGradingSubmission(sub)}
                        className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                      >
                        {sub.status === 'graded' ? 'Review Grade' : 'Grade Now'}
                      </button>
                    </div>
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100 shadow-sm">
                      <User size={40} />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No submissions yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gradingSubmission && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-3xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Grade Submission</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">{gradingSubmission.studentName}</p>
                </div>
                <button 
                  onClick={() => setGradingSubmission(null)} 
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-6">
                  <h4 className="text-lg font-black uppercase tracking-widest text-slate-900">Student Answers</h4>
                  {(assignments.find(a => a.id === gradingSubmission.assignmentId)?.questions || []).length > 0 ? (
                    (assignments.find(a => a.id === gradingSubmission.assignmentId)?.questions || []).map((q, idx) => {
                      const answer = gradingSubmission.answers.find(a => a.questionId === q.id)?.answer || 'No answer provided';
                      return (
                        <div key={q.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                          <p className="font-black uppercase tracking-widest text-xs text-slate-900">Q{idx + 1}: {q.text}</p>
                          <div className="p-5 bg-white rounded-2xl border border-slate-200 text-sm text-slate-700 shadow-sm">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Student Answer</span>
                            {answer}
                          </div>
                          {q.correctAnswer && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest px-4 py-2 bg-emerald-50 rounded-full w-fit border border-emerald-100 shadow-sm">
                              <CheckCircle2 size={14} /> Correct Answer: {q.correctAnswer}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                      <p className="font-black uppercase tracking-widest text-xs text-slate-900">General Response</p>
                      <div className="p-5 bg-white rounded-2xl border border-slate-200 text-sm text-slate-700 shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Student Answer</span>
                        {gradingSubmission.answers.find(a => a.questionId === 'general')?.answer || 'No answer provided'}
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleGradeSubmission} className="pt-8 border-t border-slate-100 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Academic Score</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          required
                          min="0"
                          value={gradingSubmission.score || 0}
                          onChange={e => setGradingSubmission({ ...gradingSubmission, score: parseInt(e.target.value) })}
                          className="w-28 px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-center text-lg text-slate-900"
                        />
                        <span className="text-slate-300 font-black text-2xl">/</span>
                        <input
                          type="number"
                          required
                          min="1"
                          value={gradingSubmission.totalScore || 100}
                          onChange={e => setGradingSubmission({ ...gradingSubmission, totalScore: parseInt(e.target.value) })}
                          className="w-28 px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-center text-lg text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Professional Feedback</label>
                    <textarea
                      value={gradingSubmission.feedback || ''}
                      onChange={e => setGradingSubmission({ ...gradingSubmission, feedback: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 min-h-[120px]"
                      placeholder="Excellent work! Your critical analysis is improving..."
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setGradingSubmission(null)}
                      className="order-2 sm:order-1 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="order-1 sm:order-2 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                    >
                      Submit Grade
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {assignmentToDelete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-sm">
                <Trash2 size={40} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Delete Assignment?</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-10 leading-relaxed px-4">
                This action is irreversible. All student submissions and grades associated with this task will be permanently removed.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setAssignmentToDelete(null)}
                  className="flex-1 py-4 rounded-2xl border border-slate-200 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAssignment}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white bg-red-600 hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
