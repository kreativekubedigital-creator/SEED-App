import React, { useState, useEffect } from 'react';
import { db, collection, query, where, addDoc, doc, updateDoc, onSnapshot, OperationType, handleFirestoreError } from '../../lib/compatibility';
import { UserProfile, Subject, Assignment, AssignmentSubmission } from '../../types';
import { FileText, Calendar, Clock, CheckCircle2, ChevronRight, X, Send, Award, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentAssignmentsProps {
  user: UserProfile;
  subjects: Subject[];
}

export const StudentAssignments = ({ user, subjects }: StudentAssignmentsProps) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user.schoolId || !user.classId) return;

    const qAssignments = query(collection(db, 'schools', user.schoolId, 'assignments'), where('classId', '==', user.classId));
    const unsubAssignments = onSnapshot(qAssignments, (snap) => {
      const assignmentsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
      assignmentsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAssignments(assignmentsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/assignments`));

    const qSubmissions = query(collection(db, 'schools', user.schoolId, 'assignmentSubmissions'), where('studentId', '==', user.uid));
    const unsubSubmissions = onSnapshot(qSubmissions, (snap) => {
      const submissionsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentSubmission));
      setSubmissions(submissionsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/assignmentSubmissions`));

    return () => {
      unsubAssignments();
      unsubSubmissions();
    };
  }, [user.schoolId, user.classId, user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !user.schoolId) return;

    setSubmitting(true);
    try {
      const submissionData = {
        assignmentId: selectedAssignment.id,
        studentId: user.uid,
        studentName: `${user.firstName} ${user.lastName}`,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
        status: 'submitted',
        submittedAt: new Date().toISOString()
      };

      const existingSubmission = getSubmission(selectedAssignment.id);

      if (isEditing && existingSubmission) {
        const submissionRef = doc(db, 'schools', user.schoolId, 'assignmentSubmissions', existingSubmission.id);
        await updateDoc(submissionRef, {
          answers: submissionData.answers,
          submittedAt: submissionData.submittedAt,
          status: 'submitted' // Reset to submitted if it was graded (though rules prevent editing graded ones)
        });
      } else {
        await addDoc(collection(db, 'schools', user.schoolId, 'assignmentSubmissions'), submissionData);
      }

      setSelectedAssignment(null);
      setAnswers({});
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'assignmentSubmissions');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (assignment: Assignment) => {
    const submission = getSubmission(assignment.id);
    if (submission) {
      const initialAnswers: Record<string, string> = {};
      submission.answers.forEach(a => {
        initialAnswers[a.questionId] = a.answer;
      });
      setAnswers(initialAnswers);
      setIsEditing(true);
      setSelectedAssignment(assignment);
    }
  };

  const getSubmission = (assignmentId: string) => submissions.find(s => s.assignmentId === assignmentId);
  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';

  const getAssignmentStatus = (assignment: Assignment) => {
    const submission = getSubmission(assignment.id);
    if (submission) return submission.status;
    
    const isOverdue = new Date(assignment.dueDate) < new Date();
    if (isOverdue) return 'overdue';
    
    // Check if there are any local answers for this assignment
    // (Note: this is currently local to the session)
    if (selectedAssignment?.id === assignment.id && Object.keys(answers).length > 0) {
      return 'in_progress';
    }
    
    return 'pending';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-black uppercase tracking-widest text-slate-900">Assignments</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900/60">Track your homework and view your grades.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {assignments.map((assignment, idx) => {
          const submission = getSubmission(assignment.id);
          const status = getAssignmentStatus(assignment);
          const isOverdue = status === 'overdue';
          const isGraded = status === 'graded';
          const isSubmitted = status === 'submitted';
          const isInProgress = status === 'in_progress';

          const colors = ['bg-orange-100', 'bg-blue-100', 'bg-purple-100', 'bg-pink-100', 'bg-green-100'];
          const colorClass = colors[idx % colors.length];

          return (
            <motion.div
              key={assignment.id}
              whileHover={{ y: -5, scale: 1.02, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`group relative ${colorClass} rounded-3xl border border-white/40 transition-all duration-300 flex flex-col overflow-hidden shadow-sm`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              {/* Status Ribbon/Badge */}
              <div className="absolute top-4 right-4 z-10">
                <div className={`px-3 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-wider border ${
                  isGraded ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  isSubmitted ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  isOverdue ? 'bg-red-50 text-red-700 border-red-200' :
                  isInProgress ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  'bg-white/80 text-slate-900 border-white/50'
                }`}>
                  {isGraded ? `Graded: ${submission?.score}/${submission?.totalScore}` : 
                   isSubmitted ? 'Submitted' : 
                   isOverdue ? 'Overdue' : 
                   isInProgress ? 'In Progress' :
                   'Pending'}
                </div>
              </div>

              <div className="p-3 flex-1 flex flex-col gap-3 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/60 text-slate-900 shadow-sm">
                    <FileText size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-900/50 block">
                      {getSubjectName(assignment.subjectId)}
                    </span>
                    <h4 className="font-black uppercase tracking-widest text-slate-900 text-sm leading-tight">
                      {assignment.title}
                    </h4>
                  </div>
                </div>

                <p className="text-[10px] text-slate-900/70 font-bold uppercase tracking-wide line-clamp-2">
                  {assignment.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-auto pt-3 border-t border-white/20">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-900/60">
                    <Calendar size={12} />
                    {new Date(assignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                  {!submission && !isOverdue && (
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-900/60">
                      <Clock size={12} />
                      {Math.ceil((new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}d left
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  {submission ? (
                    <button
                      onClick={() => setSelectedAssignment(assignment)}
                      className="w-full py-2 rounded-xl bg-white/50 text-slate-900 border border-white/50 text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      View Submission <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedAssignment(assignment)}
                      disabled={isOverdue}
                      className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                        isOverdue 
                          ? 'bg-white/30 text-slate-900/40 cursor-not-allowed border border-white/20' 
                          : 'bg-white text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : 'Answer Now'} <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {assignments.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 border-dashed">
            <p className="text-slate-900 font-black uppercase tracking-widest text-sm">No assignments found</p>
          </div>
        )}
      </div>

      {/* Assignment Detail / Answer Modal */}
      <AnimatePresence>
        {selectedAssignment && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                    {isEditing ? 'Edit Submission' : selectedAssignment.title}
                  </h3>
                  <p className="text-[10px] text-slate-900/40 font-black uppercase tracking-widest mt-1">{getSubjectName(selectedAssignment.subjectId)}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedAssignment(null);
                    setIsEditing(false);
                    setAnswers({});
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-8 p-5 rounded-3xl bg-blue-50 border border-blue-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 relative z-10">Instructions</h4>
                <p className="text-blue-700 font-bold uppercase tracking-wide text-xs relative z-10">{selectedAssignment.description}</p>
              </div>

              {getSubmission(selectedAssignment.id) && !isEditing ? (
                /* View Mode */
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Assignment Submitted</p>
                        <p className="text-xs text-slate-900 font-medium">{new Date(getSubmission(selectedAssignment.id)!.submittedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {getSubmission(selectedAssignment.id)?.status === 'submitted' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={() => startEditing(selectedAssignment)}
                        className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
                      >
                        Edit Answers
                      </motion.button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-slate-900">Your Answers</h4>
                    {(selectedAssignment.questions || []).length > 0 ? (
                      (selectedAssignment.questions || []).map((q, idx) => {
                        const sub = getSubmission(selectedAssignment.id);
                        const answer = sub?.answers.find(a => a.questionId === q.id)?.answer || 'No answer';
                        return (
                          <div key={q.id} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                              <p className="font-medium text-slate-900 text-sm flex gap-2">
                                <span className="text-blue-600">Q{idx + 1}.</span> {q.text}
                              </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-900 font-medium italic">
                              "{answer}"
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                        <p className="font-medium text-slate-900 text-sm">General Response</p>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-900 font-medium italic">
                          "{getSubmission(selectedAssignment.id)?.answers.find(a => a.questionId === 'general')?.answer || 'No answer'}"
                        </div>
                      </div>
                    )}
                  </div>

                  {getSubmission(selectedAssignment.id)?.status === 'graded' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-6 border-t border-slate-100 space-y-4"
                    >
                      <div className="flex items-center gap-4 p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                        <div className="p-4 bg-white text-emerald-600 rounded-2xl shadow-sm">
                          <Award size={32} />
                        </div>
                        <div>
                          <h4 className="font-medium text-emerald-900">Final Grade</h4>
                          <p className="text-3xl font-black text-emerald-600 tracking-tight">
                            {getSubmission(selectedAssignment.id)?.score} <span className="text-lg font-medium text-emerald-400">/ {getSubmission(selectedAssignment.id)?.totalScore}</span>
                          </p>
                        </div>
                      </div>
                      {getSubmission(selectedAssignment.id)?.feedback && (
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex gap-4">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg h-fit">
                            <MessageSquare size={20} />
                          </div>
                          <div>
                            <h5 className="text-xs font-medium text-slate-900 uppercase tracking-widest mb-1">Teacher's Feedback</h5>
                            <p className="text-sm text-slate-900 font-medium leading-relaxed">"{getSubmission(selectedAssignment.id)?.feedback}"</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              ) : (
                /* Answer Mode */
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-500" 
                          style={{ width: `${(Object.keys(answers).length / (selectedAssignment.questions || []).length) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-slate-900">
                        {Object.keys(answers).length} of {(selectedAssignment.questions || []).length} answered
                      </span>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {(selectedAssignment.questions || []).length > 0 ? (
                      (selectedAssignment.questions || []).map((q, idx) => (
                        <div key={q.id} className="space-y-4 p-6 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-md group/q">
                          <label className="block font-medium text-slate-900 text-lg group-hover/q:text-blue-600 transition-colors">
                            <span className="text-blue-600 mr-2">Question {idx + 1}:</span> {q.text}
                          </label>
                          
                          {q.type === 'multiple_choice' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {q.options?.map((opt, i) => (
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                  key={i}
                                  type="button"
                                  onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                  className={`p-4 rounded-2xl border text-left transition-all font-medium text-sm ${
                                    answers[q.id] === opt 
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]' 
                                      : 'bg-white border-gray-200 text-slate-900 hover:border-blue-300 hover:bg-blue-50/30'
                                  }`}
                                >
                                  {opt}
                                </motion.button>
                              ))}
                            </div>
                          ) : (
                            <div className="relative">
                              <textarea
                                required
                                value={answers[q.id] || ''}
                                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all min-h-[150px] bg-white text-slate-900 font-medium placeholder:text-slate-900"
                                placeholder="Type your detailed answer here..."
                              />
                              <div className="absolute bottom-4 right-4 text-[10px] font-medium text-slate-900 uppercase tracking-widest pointer-events-none">
                                {answers[q.id]?.length || 0} characters
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="space-y-4 p-6 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-md group/q">
                        <label className="block font-medium text-slate-900 text-lg group-hover/q:text-blue-600 transition-colors">
                          Your Answer
                        </label>
                        <div className="relative">
                          <textarea
                            required
                            value={answers['general'] || ''}
                            onChange={e => setAnswers({ ...answers, ['general']: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all min-h-[250px] bg-white text-slate-900 font-medium placeholder:text-slate-400"
                            placeholder="Type your response to the assignment instructions here..."
                          />
                          <div className="absolute bottom-4 right-4 text-[10px] font-medium text-slate-900 uppercase tracking-widest pointer-events-none">
                            {answers['general']?.length || 0} characters
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-slate-100">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      type="button"
                      onClick={() => {
                        setSelectedAssignment(null);
                        setIsEditing(false);
                        setAnswers({});
                      }}
                      className="px-8 py-4 rounded-2xl font-medium text-slate-900 hover:bg-gray-100 transition-all"
                    >
                      {isEditing ? 'Cancel Edit' : 'Save for Later'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      type="submit"
                      disabled={submitting || (
                        (selectedAssignment.questions || []).length > 0 
                          ? Object.keys(answers).length < (selectedAssignment.questions || []).length
                          : !answers['general']
                      )}
                      className="px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {submitting ? 'Submitting...' : (
                        <>
                          {isEditing ? 'Update Submission' : 'Complete & Submit'} <Send size={16} />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
