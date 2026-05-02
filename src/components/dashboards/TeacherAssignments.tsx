import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, onSnapshot, updateDoc, doc, addDoc, deleteDoc, writeBatch, handleFirestoreError, OperationType } from '../../lib/compatibility';
import { UserProfile, Assignment, AssignmentSubmission, Subject, Class } from '../../types';
import { 
  Plus, 
  Trash2, 
  Clock, 
  ChevronRight, 
  Download, 
  CheckCircle2, 
  X, 
  GraduationCap, 
  BookOpen, 
  Users, 
  Calendar,
  AlertCircle,
  FileText,
  Eye,
  PlusCircle,
  Search,
  MoreVertical,
  Check,
  User,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDisplayString } from '../../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      const batch = writeBatch(db);
      
      // 1. Delete the assignment itself
      batch.delete(doc(db, 'schools', user.schoolId, 'assignments', assignmentToDelete));
      
      // 2. Find and delete all submissions for this assignment
      const submissionsQuery = query(
        collection(db, 'schools', user.schoolId, 'assignmentSubmissions'), 
        where('assignmentId', '==', assignmentToDelete)
      );
      const submissionsSnap = await getDocs(submissionsQuery);
      submissionsSnap.docs.forEach(subDoc => {
        batch.delete(subDoc.ref);
      });

      await batch.commit();
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

  const handleBulkGrade = async (assignmentId: string, score: number, feedback: string) => {
    if (!window.confirm(`Are you sure you want to grade all pending submissions for this assignment as ${score}?`)) return;
    
    const pendingSubmissions = submissions.filter(s => s.status === 'pending');
    if (pendingSubmissions.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      pendingSubmissions.forEach(sub => {
        const docRef = doc(db, 'schools', user.schoolId, 'assignmentSubmissions', sub.id);
        batch.update(docRef, {
          status: 'graded',
          score,
          feedback,
          gradedAt: new Date().toISOString(),
          gradedBy: user.uid
        });
      });
      await batch.commit();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, 'assignmentSubmissions');
    }
  };

  const generateAssignmentPDF = (assignment: Assignment) => {
    const doc = new jsPDF();
    const subject = subjects.find(s => s.id === assignment.subjectId);
    const classObj = classes.find(c => c.id === assignment.classId);
    
    // Header
    doc.setFillColor(2, 6, 23);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(assignment.title.toUpperCase(), 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatDisplayString(subject?.name || '')} | ${formatDisplayString(classObj?.name || '')}`, 105, 35, { align: 'center' });
    
    // Content
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Assignment Description:', 14, 60);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitDesc = doc.splitTextToSize(assignment.description, 180);
    doc.text(splitDesc, 14, 68);
    
    // Questions
    if (assignment.questions && assignment.questions.length > 0) {
      let currentY = 68 + (splitDesc.length * 5) + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Questions:', 14, currentY);
      currentY += 8;
      
      assignment.questions.forEach((q, idx) => {
        if (currentY > 270) { doc.addPage(); currentY = 20; }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${q.text}`, 14, currentY);
        currentY += 6;
        if (q.options) {
          q.options.forEach((opt) => {
            if (currentY > 270) { doc.addPage(); currentY = 20; }
            doc.setFont('helvetica', 'normal');
            doc.text(`   [ ] ${opt}`, 14, currentY);
            currentY += 5;
          });
        }
        currentY += 4;
      });
    }
    
    doc.save(`${assignment.title}_Overview.pdf`);
  };

  const getClassName = (classId: string) => formatDisplayString(classes.find(c => c.id === classId)?.name || 'Unknown Class');
  const getSubjectName = (subjectId: string) => formatDisplayString(subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-semibold tracking-tighter text-slate-900 uppercase">Assignment Management</h3>
          <p className="text-xs font-medium tracking-tight text-slate-500 mt-1 uppercase">Create and manage academic tasks</p>
        </div>
        <button
          id="btn_teacher_create_assignment"
          onClick={() => setShowAddAssignment(true)}
          className="flex-1 sm:flex-none px-4 py-2 bg-blue-500 hover:bg-black text-white rounded-xl font-medium tracking-tight text-sm transition-all shadow-lg shadow-slate-950/20 flex items-center justify-center gap-2 active:scale-95 border border-white/20"
        >
          <Plus size={14} strokeWidth={2.5} /> New Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map(assignment => (
          <motion.div
            key={assignment.id}
            whileHover={{ y: -4 }}
            className="bg-white p-4 rounded-[1.25rem] shadow-sm border border-slate-200/60 flex flex-col gap-4 group hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-3xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="p-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200/60 shadow-sm">
                <FileText size={20} strokeWidth={2.5} />
              </div>
              <button
                id={`btn_teacher_assignment_delete_${assignment.id}`}
                onClick={() => setAssignmentToDelete(assignment.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="relative z-10">
              <h4 className="font-semibold tracking-tighter text-sm text-slate-900 leading-tight uppercase">{formatDisplayString(assignment.title)}</h4>
              <p className="text-[10px] text-slate-500 font-medium tracking-tight mt-1 uppercase">
                {formatDisplayString(getSubjectName(assignment.subjectId))} <span className="mx-1 text-slate-300">•</span> {formatDisplayString(getClassName(assignment.classId))}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-tight text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100 w-fit relative z-10 uppercase">
              <Calendar size={12} strokeWidth={3} />
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </div>
            <div className="pt-4 border-t border-slate-50 relative z-10">
              <button
                id={`btn_teacher_assignment_view_submissions_${assignment.id}`}
                onClick={() => setViewingSubmissions(assignment.id)}
                className="w-full mt-4 py-2.5 bg-slate-50 hover:bg-blue-500 hover:text-white text-blue-500 rounded-xl font-medium tracking-tight text-sm transition-all border border-slate-200 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                View Submissions <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        ))}
        {assignments.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-slate-200/60 border-dashed">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-200/60 shadow-sm">
              <FileText size={40} />
            </div>
            <p className="text-slate-900 font-semibold tracking-tight text-sm">No assignments created yet.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddAssignment && (
          <div className="fixed inset-0 bg-blue-500/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] p-6 w-full max-w-4xl shadow-2xl border border-slate-200/60 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold tracking-tighter text-slate-900 uppercase">New Assignment</h3>
                  <p className="text-xs font-semibold tracking-tight text-slate-500 mt-1 uppercase">Design a new task for your students</p>
                </div>
                <button 
                  onClick={() => setShowAddAssignment(false)} 
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold tracking-widest text-slate-900 ml-1 uppercase">Title</label>
                    <input
                      id="input_teacher_assignment_title"
                      type="text"
                      required
                      value={newAssignment.title}
                      onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all font-semibold tracking-tight text-sm text-slate-900"
                      placeholder="e.g. Weekly English Essay"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold tracking-widest text-slate-900 ml-1 uppercase">Subject</label>
                    <select
                      required
                      value={newAssignment.subjectId}
                      onChange={e => setNewAssignment({ ...newAssignment, subjectId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all font-semibold tracking-tight text-sm text-slate-900"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{formatDisplayString(s.name)} ({getClassName(s.classId)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-semibold tracking-widest text-slate-900 ml-1 uppercase">Description</label>
                    <textarea
                      id="input_teacher_assignment_description"
                      required
                      value={newAssignment.description}
                      onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all font-medium text-sm text-slate-900 min-h-[100px]"
                      placeholder="Instructions for the students..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold tracking-widest text-slate-900 ml-1 uppercase">Due Date</label>
                    <input
                      type="date"
                      required
                      value={newAssignment.dueDate}
                      onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all font-semibold tracking-tight text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200/60">
                  <h4 className="text-sm font-semibold tracking-tighter text-slate-900 uppercase mb-4">Questions ({newAssignment.questions.length})</h4>
                  
                  <div className="space-y-4 mb-8">
                    {newAssignment.questions.map((q, idx) => (
                      <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex justify-between items-start group hover:bg-white hover:shadow-md transition-all">
                        <div>
                          <p className="font-semibold tracking-tighter text-sm text-slate-900 uppercase">Q{idx + 1}: {q.text}</p>
                          <p className="text-[10px] text-slate-500 font-semibold tracking-tight mt-1.5 px-2 py-0.5 bg-slate-100 rounded w-fit border border-slate-200 uppercase">{formatDisplayString(q.type)}</p>
                          {q.options && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {q.options.map((opt, i) => (
                                <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold tracking-tighter text-slate-900 uppercase">{opt}</span>
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

                  <div className="p-6 rounded-[1.5rem] bg-slate-50 border border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-medium tracking-widest text-slate-900 ml-1 uppercase">Question Text</label>
                        <input
                          type="text"
                          value={newQuestion.text}
                          onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all font-semibold tracking-tight text-sm text-slate-900"
                          placeholder="Enter question text..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium tracking-widest text-slate-900 ml-1 uppercase">Type</label>
                        <select
                          value={newQuestion.type}
                          onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value as any })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all font-semibold tracking-tight text-sm text-slate-900"
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
                            id={`input_teacher_assignment_option_${idx}`}
                            type="text"
                            value={opt}
                            onChange={e => {
                              const newOpts = [...newQuestion.options];
                              newOpts[idx] = e.target.value;
                              setNewQuestion({ ...newQuestion, options: newOpts });
                            }}
                            className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all font-semibold tracking-tight text-sm text-slate-900"
                            placeholder={`Option ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      id="btn_teacher_assignment_add_question"
                      type="button"
                      onClick={handleAddQuestion}
                      className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-[10px] font-semibold tracking-tighter uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Plus size={14} strokeWidth={3} /> Add Question to Assignment
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200/60">
                  <button
                    id="btn_teacher_assignment_cancel_create"
                    type="button"
                    onClick={() => setShowAddAssignment(false)}
                    className="order-2 sm:order-1 px-6 py-2.5 rounded-xl font-semibold tracking-tighter text-[10px] text-slate-500 hover:bg-slate-50 transition-all uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn_teacher_assignment_save"
                    type="submit"
                    className="order-1 sm:order-2 px-8 py-2.5 rounded-xl font-semibold tracking-tighter text-[10px] bg-blue-500 text-white hover:bg-black transition-all shadow-xl shadow-slate-950/20 active:scale-95 uppercase"
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
          <div className="fixed inset-0 bg-blue-500/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] p-6 w-full max-w-5xl shadow-2xl border border-slate-200/60 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold tracking-tighter text-slate-900 uppercase">Student Submissions</h3>
                  <p className="text-[10px] font-semibold tracking-tight text-slate-500 mt-1 uppercase">
                    {assignments.find(a => a.id === viewingSubmissions)?.title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {submissions.some(s => s.status === 'pending') && (
                    <button
                      onClick={() => handleBulkGrade(viewingSubmissions, 100, "Excellent work!")}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-semibold text-[10px] uppercase border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-2"
                    >
                      <Award size={14} /> Bulk Grade (100)
                    </button>
                  )}
                  <button
                    onClick={() => generateAssignmentPDF(assignments.find(a => a.id === viewingSubmissions)!)}
                    className="px-4 py-2 bg-slate-50 text-slate-900 rounded-xl font-semibold text-[10px] uppercase border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2"
                  >
                    <FileText size={14} /> Export Summary
                  </button>
                  <button 
                    onClick={() => setViewingSubmissions(null)} 
                    className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {submissions.map(sub => (
                  <div key={sub.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center font-semibold text-lg shadow-lg border-2 border-white">
                        {sub.studentName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold tracking-tighter text-sm text-slate-900 uppercase">{sub.studentName}</h4>
                        <p className="text-[10px] text-slate-500 font-medium tracking-tight mt-0.5 uppercase">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-tighter border shadow-sm uppercase ${
                        sub.status === 'graded' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {sub.status === 'graded' ? `SCORE: ${sub.score} / ${sub.totalScore}` : 'PENDING GRADE'}
                      </div>
                      <button
                        onClick={() => setGradingSubmission(sub)}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-semibold tracking-tighter uppercase hover:bg-slate-50 transition-all shadow-sm"
                      >
                        {sub.status === 'graded' ? 'Review Grade' : 'Grade Now'}
                      </button>
                    </div>
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-200/60 shadow-sm">
                      <User size={40} />
                    </div>
                    <p className="text-slate-900 font-semibold tracking-tight text-sm">No submissions yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gradingSubmission && (
          <div className="fixed inset-0 bg-blue-500/40 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] p-6 w-full max-w-3xl shadow-2xl border border-slate-200/60 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold tracking-tighter text-slate-900 uppercase leading-none">Grade Submission</h3>
                  <p className="text-xs font-semibold tracking-tight text-slate-500 mt-1 uppercase">{gradingSubmission.studentName}</p>
                </div>
                <button 
                  onClick={() => setGradingSubmission(null)} 
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleGradeSubmission} className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold tracking-tighter text-slate-900 uppercase">Student Answers</h4>
                  {(assignments.find(a => a.id === gradingSubmission.assignmentId)?.questions || []).length > 0 ? (
                    (assignments.find(a => a.id === gradingSubmission.assignmentId)?.questions || []).map((q, idx) => {
                      const answer = gradingSubmission.answers.find(a => a.questionId === q.id)?.answer || 'No answer provided';
                      return (
                        <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                          <p className="font-semibold tracking-tighter text-xs text-slate-900 uppercase">Q{idx + 1}: {q.text}</p>
                          <div className="p-4 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 shadow-sm font-medium">
                            <span className="text-[10px] font-semibold text-slate-400 tracking-widest block mb-1.5 uppercase">Student Response</span>
                            {answer}
                          </div>
                          {q.correctAnswer && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 tracking-tighter px-3 py-1.5 bg-emerald-50 rounded-lg w-fit border border-emerald-100 uppercase">
                              <CheckCircle2 size={12} strokeWidth={3} /> Correct: {q.correctAnswer}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
                      <p className="font-semibold tracking-tighter text-xs text-slate-900 uppercase">General Response</p>
                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 shadow-sm font-medium">
                        <span className="text-[10px] font-semibold text-slate-400 tracking-widest block mb-1.5 uppercase">Student Response</span>
                        {gradingSubmission.answers.find(a => a.questionId === 'general')?.answer || 'No answer provided'}
                      </div>
                    </div>
                  )}
                </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
                      <label className="text-[10px] font-semibold tracking-widest text-slate-400 ml-1 uppercase">Academic Performance Grade</label>
                      <div className="w-full bg-blue-500/10 h-1 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-1000"
                          style={{ width: `${(gradingSubmission.score / (gradingSubmission.totalScore || 100)) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            required
                            min="0"
                            value={gradingSubmission.score || 0}
                            onChange={e => setGradingSubmission({ ...gradingSubmission, score: parseInt(e.target.value) })}
                            className="w-24 px-3 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all font-semibold text-center text-3xl text-slate-900 shadow-sm"
                          />
                          <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-tighter">Awarded</span>
                        </div>
                        <span className="text-slate-300 font-semibold text-4xl mb-4">/</span>
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            required
                            min="1"
                            value={gradingSubmission.totalScore || 100}
                            onChange={e => setGradingSubmission({ ...gradingSubmission, totalScore: parseInt(e.target.value) })}
                            className="w-24 px-3 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all font-semibold text-center text-3xl text-slate-900 shadow-sm"
                          />
                          <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-tighter">Max Score</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-widest text-slate-900 ml-1 uppercase">Professional Feedback</label>
                    <textarea
                      value={gradingSubmission.feedback || ''}
                      onChange={e => setGradingSubmission({ ...gradingSubmission, feedback: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all font-semibold text-sm text-slate-900 min-h-[80px]"
                      placeholder="Provide constructive feedback..."
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-50">
                    <button
                      type="button"
                      onClick={() => setGradingSubmission(null)}
                      className="order-2 sm:order-1 px-5 py-2 rounded-xl font-semibold tracking-tighter text-xs text-slate-400 hover:text-slate-900 transition-all uppercase"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="order-1 sm:order-2 px-6 py-2.5 rounded-xl font-semibold tracking-tighter text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 uppercase"
                    >
                      Submit Grade
                    </button>
                  </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {assignmentToDelete && (
          <div className="fixed inset-0 bg-blue-600/40 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl border border-slate-200/60 text-center"
            >
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-sm">
                <Trash2 size={40} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-semibold tracking-tighter text-slate-900 mb-2">Delete Assignment?</h3>
              <p className="text-xs font-semibold tracking-tight text-slate-900 mb-10 leading-relaxed px-4">
                This action is irreversible. All student submissions and grades associated with this task will be permanently removed.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setAssignmentToDelete(null)}
                  className="flex-1 py-4 rounded-2xl border border-slate-200 font-semibold tracking-tight text-sm text-slate-900 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAssignment}
                  className="flex-1 py-4 rounded-2xl font-semibold tracking-tight text-sm text-white bg-red-600 hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95"
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
