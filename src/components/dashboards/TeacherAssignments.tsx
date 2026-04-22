import React, { useState, useEffect } from 'react';
import { db, collection, query, where, addDoc, doc, deleteDoc, onSnapshot, updateDoc, OperationType, handleFirestoreError } from '../../firebase';
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
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-medium text-gray-800">Assignment Management</h3>
        <button
          onClick={() => setShowAddAssignment(true)}
          className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all shadow-md"
        >
          <Plus size={20} /> Create Assignment
        </button>
      </div>

      {/* Assignment List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.map(assignment => (
          <motion.div
            key={assignment.id}
            whileHover={{ y: -4 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <FileText size={20} />
              </div>
              <button
                onClick={() => setAssignmentToDelete(assignment.id)}
                className="p-2 text-gray-800 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 text-lg">{assignment.title}</h4>
              <p className="text-sm text-gray-800 font-medium">{getSubjectName(assignment.subjectId)} • {getClassName(assignment.classId)}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-800 font-medium">
              <Calendar size={16} className="text-gray-800" />
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </div>
            <div className="pt-4 border-t border-gray-50 flex gap-2">
              <button
                onClick={() => setViewingSubmissions(assignment.id)}
                className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
              >
                Submissions <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        ))}
        {assignments.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-gray-100 border-dashed">
            <p className="text-gray-800 font-medium">No assignments created yet.</p>
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      <AnimatePresence>
        {showAddAssignment && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-medium text-gray-800">New Assignment</h3>
                <button onClick={() => setShowAddAssignment(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-widest text-gray-800">Title</label>
                    <input
                      type="text"
                      required
                      value={newAssignment.title}
                      onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g. Weekly English Essay"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-widest text-gray-800">Subject</label>
                    <select
                      required
                      value={newAssignment.subjectId}
                      onChange={e => setNewAssignment({ ...newAssignment, subjectId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({getClassName(s.classId)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-medium uppercase tracking-widest text-gray-800">Description</label>
                    <textarea
                      required
                      value={newAssignment.description}
                      onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all min-h-[100px]"
                      placeholder="Instructions for the students..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-widest text-gray-800">Due Date</label>
                    <input
                      type="date"
                      required
                      value={newAssignment.dueDate}
                      onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Questions Section */}
                <div className="pt-6 border-t border-gray-100">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">Questions ({newAssignment.questions.length})</h4>
                  
                  <div className="space-y-4 mb-6">
                    {newAssignment.questions.map((q, idx) => (
                      <div key={q.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">Q{idx + 1}: {q.text}</p>
                          <p className="text-xs text-gray-800 font-medium uppercase tracking-wider mt-1">{q.type.replace('_', ' ')}</p>
                          {q.options && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {q.options.map((opt, i) => (
                                <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-800">{opt}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="p-2 text-gray-800 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Question Form */}
                  <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-medium uppercase tracking-widest text-gray-800">Question Text</label>
                        <input
                          type="text"
                          value={newQuestion.text}
                          onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                          placeholder="Enter question..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-widest text-gray-800">Type</label>
                        <select
                          value={newQuestion.type}
                          onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value as any })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="short_answer">Short Answer</option>
                          <option value="multiple_choice">Multiple Choice</option>
                        </select>
                      </div>
                    </div>

                    {newQuestion.type === 'multiple_choice' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {newQuestion.options.map((opt, idx) => (
                          <input
                            key={idx}
                            type="text"
                            value={opt}
                            onChange={e => {
                              const newOpts = [...newQuestion.options];
                              newOpts[idx] = e.target.value;
                              setNewQuestion({ ...newQuestion, options: newOpts });
                            }}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm"
                            placeholder={`Option ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="w-full py-3 rounded-xl bg-white border border-blue-200 text-blue-600 font-medium hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} /> Add Question to Assignment
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddAssignment(false)}
                    className="px-6 py-3 rounded-xl font-medium text-gray-800 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Assignment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submissions View Modal */}
      <AnimatePresence>
        {viewingSubmissions && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-medium text-gray-800">Student Submissions</h3>
                  <p className="text-gray-800 font-medium">{assignments.find(a => a.id === viewingSubmissions)?.title}</p>
                </div>
                <button onClick={() => setViewingSubmissions(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {submissions.map(sub => (
                  <div key={sub.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-medium text-lg">
                        {sub.studentName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{sub.studentName}</h4>
                        <p className="text-xs text-gray-800 font-medium">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className={`px-3 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                        sub.status === 'graded' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                      }`}>
                        {sub.status === 'graded' ? `Graded: ${sub.score}/${sub.totalScore}` : 'Pending Grade'}
                      </div>
                      <button
                        onClick={() => setGradingSubmission(sub)}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-50 transition-all"
                      >
                        {sub.status === 'graded' ? 'Review Grade' : 'Grade Now'}
                      </button>
                    </div>
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-gray-800 font-medium">No submissions yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grading Modal */}
      <AnimatePresence>
        {gradingSubmission && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-medium text-gray-800">Grade Submission</h3>
                  <p className="text-gray-800 font-medium">{gradingSubmission.studentName}</p>
                </div>
                <button onClick={() => setGradingSubmission(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Answers */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-800">Student Answers</h4>
                  {(assignments.find(a => a.id === gradingSubmission.assignmentId)?.questions || []).length > 0 ? (
                    (assignments.find(a => a.id === gradingSubmission.assignmentId)?.questions || []).map((q, idx) => {
                      const answer = gradingSubmission.answers.find(a => a.questionId === q.id)?.answer || 'No answer provided';
                      return (
                        <div key={q.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                          <p className="font-medium text-gray-800 text-sm">Q{idx + 1}: {q.text}</p>
                          <div className="p-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-800">
                            <span className="text-xs font-medium text-gray-800 uppercase tracking-widest block mb-1">Student Answer:</span>
                            {answer}
                          </div>
                          {q.correctAnswer && (
                            <p className="text-xs font-medium text-emerald-600">Correct Answer: {q.correctAnswer}</p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                      <p className="font-medium text-gray-800 text-sm">General Response</p>
                      <div className="p-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-800">
                        <span className="text-xs font-medium text-gray-800 uppercase tracking-widest block mb-1">Student Answer:</span>
                        {gradingSubmission.answers.find(a => a.questionId === 'general')?.answer || 'No answer provided'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grading Form */}
                <form onSubmit={handleGradeSubmission} className="pt-6 border-t border-gray-100 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-widest text-gray-800">Score</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          required
                          min="0"
                          value={gradingSubmission.score || 0}
                          onChange={e => setGradingSubmission({ ...gradingSubmission, score: parseInt(e.target.value) })}
                          className="w-24 px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-center"
                        />
                        <span className="text-gray-800 font-medium">/</span>
                        <input
                          type="number"
                          required
                          min="1"
                          value={gradingSubmission.totalScore || 100}
                          onChange={e => setGradingSubmission({ ...gradingSubmission, totalScore: parseInt(e.target.value) })}
                          className="w-24 px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-center"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-widest text-gray-800">Feedback</label>
                    <textarea
                      value={gradingSubmission.feedback || ''}
                      onChange={e => setGradingSubmission({ ...gradingSubmission, feedback: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all min-h-[100px]"
                      placeholder="Great work! Keep it up..."
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setGradingSubmission(null)}
                      className="px-6 py-3 rounded-xl font-medium text-gray-800 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg"
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

      {/* Delete Assignment Modal */}
      <AnimatePresence>
        {assignmentToDelete && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">Delete Assignment?</h3>
              <p className="text-gray-800 font-medium mb-8">This action cannot be undone. All student submissions will also be lost.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAssignmentToDelete(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-gray-800 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAssignment}
                  className="flex-1 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
