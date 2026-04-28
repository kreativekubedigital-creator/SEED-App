import React, { useState, useEffect } from 'react';
import { db, collection, query, where, addDoc, doc, updateDoc, onSnapshot, OperationType, handleFirestoreError } from '../../lib/compatibility';
import { UserProfile, Subject, Assignment, AssignmentSubmission } from '../../types';
import { FileText, Calendar, Clock, CheckCircle2, ChevronRight, X, Send, Award, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDisplayString } from '../../lib/utils';

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
        studentName: `${formatDisplayString(user.firstName)} ${formatDisplayString(user.lastName)}`,
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
  const getSubjectName = (subjectId: string) => formatDisplayString(subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject');

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {assignments.map((assignment, idx) => {
          const submission = getSubmission(assignment.id);
          const status = getAssignmentStatus(assignment);
          const isOverdue = status === 'overdue';
          const isGraded = status === 'graded';
          const isSubmitted = status === 'submitted';
          const isInProgress = status === 'in_progress';

          const colors = [
            'bg-blue-50 border-blue-100 text-blue-600',
            'bg-emerald-50 border-emerald-100 text-emerald-600',
            'bg-purple-50 border-purple-100 text-purple-600',
            'bg-orange-50 border-orange-100 text-orange-600',
            'bg-pink-50 border-pink-100 text-pink-600'
          ];
          const style = colors[idx % colors.length];
          const [bgColor, borderColor, textColor] = style.split(' ');

          return (
            <motion.div
              key={assignment.id}
              whileHover={{ y: -8, scale: 1.02 }}
              className={`group relative ${bgColor} rounded-[2.5rem] border ${borderColor} p-8 transition-all duration-300 flex flex-col overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 min-h-[320px]`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-125 opacity-0 group-hover:opacity-100"></div>
              
              <div className="flex justify-between items-start mb-10 relative z-10">
                <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                  isGraded ? 'bg-emerald-500 text-white border-emerald-400' :
                  isSubmitted ? 'bg-blue-500 text-white border-blue-400' :
                  isOverdue ? 'bg-rose-500 text-white border-rose-400' :
                  isInProgress ? 'bg-indigo-500 text-white border-indigo-400' :
                  'bg-white text-slate-900 border-slate-100'
                }`}>
                  {isGraded ? `Graded: ${submission?.score}/${submission?.totalScore}` : 
                   isSubmitted ? 'Submitted' : 
                   isOverdue ? 'Overdue' : 
                   isInProgress ? 'In Progress' :
                   'Pending'}
                </div>
                <div className={`p-4 rounded-2xl bg-white shadow-sm ${textColor}`}>
                  <FileText size={24} strokeWidth={2.5} />
                </div>
              </div>

              <div className="flex-1 relative z-10 mb-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">{getSubjectName(assignment.subjectId)}</span>
                <h4 className="font-black uppercase tracking-tighter text-xl text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{formatDisplayString(assignment.title)}</h4>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-4 line-clamp-2">{assignment.description}</p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-900/5 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <Calendar size={14} />
                    {new Date(assignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                
                {submission ? (
                  <button id={`btn_assignment_start_${assignment.id}`} onClick={() => setSelectedAssignment(assignment)} className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10 group-hover:scale-105">View Submission <ChevronRight size={14} /></button>
                ) : (
                  <button
                    onClick={() => setSelectedAssignment(assignment)}
                    disabled={isOverdue}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                      isOverdue 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/20'
                    }`}
                  >
                    {isOverdue ? 'Overdue' : 'Start Task'}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
        {assignments.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white/80 backdrop-blur-md rounded-[2.5rem] border-2 border-slate-100 border-dashed">
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No assignments available</p>
          </div>
        )}
      </div>

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
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{isEditing ? 'Edit Submission' : formatDisplayString(selectedAssignment.title)}</h3>
                  <p className="text-[10px] text-slate-900/40 font-black uppercase tracking-widest mt-1">{getSubjectName(selectedAssignment.subjectId)}</p>
                </div>
                <button id="btn_assignment_close_modal" onClick={() => setSelectedAssignment(null)} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"><X size={20} className="text-slate-600" /></button>
              </div>

              <div className="mb-8 p-5 rounded-3xl bg-blue-50 border border-blue-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 relative z-10">Instructions</h4>
                <p className="text-blue-700 font-bold uppercase tracking-wide text-xs relative z-10">{selectedAssignment.description}</p>
              </div>

              {getSubmission(selectedAssignment.id) && !isEditing ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Assignment Submitted</p>
                        <p className="text-xs text-slate-900 font-medium">{new Date(getSubmission(selectedAssignment.id)!.submittedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {getSubmission(selectedAssignment.id)?.status === 'submitted' && (
                      <button onClick={() => startEditing(selectedAssignment)} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-slate-900 hover:bg-slate-50 transition-all shadow-sm">Edit</button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-slate-900">Your Answers</h4>
                    {(selectedAssignment.questions || []).map((q, idx) => {
                      const sub = getSubmission(selectedAssignment.id);
                      const answer = sub?.answers.find(a => a.questionId === q.id)?.answer || 'No answer';
                      return (
                        <div key={q.id} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                          <p className="font-medium text-slate-900 text-sm"><span className="text-blue-600">Q{idx + 1}.</span> {q.text}</p>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-900 font-medium italic">"{answer}"</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-8">
                    {(selectedAssignment.questions || []).map((q, idx) => (
                      <div key={q.id} className="space-y-4 p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <label className="block font-medium text-slate-900 text-lg">Question {idx + 1}: {q.text}</label>
                        <textarea
                          required
                          value={answers[q.id] || ''}
                          onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 outline-none"
                          placeholder="Type answer..."
                        />
                      </div>
                    ))}
                  </div>
                  <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-black transition-all">
                    {submitting ? 'Submitting...' : 'Complete & Submit'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
