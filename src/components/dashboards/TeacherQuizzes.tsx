import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, addDoc, doc, deleteDoc, onSnapshot, handleFirestoreError, OperationType } from '../../lib/compatibility';
import { UserProfile, Quiz, Subject, Class, Result } from '../../types';
import { Plus, Trash2, CheckCircle2, Circle, CheckSquare, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByFullName, formatDisplayString } from '../../lib/utils';

export const TeacherQuizzes = ({ user, subjects, classes }: { user: UserProfile, subjects: Subject[], classes: Class[] }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddQuiz, setShowAddQuiz] = useState(false);
  const [viewingQuizResults, setViewingQuizResults] = useState<string | null>(null);
  const [quizResults, setQuizResults] = useState<(Result & { studentName?: string })[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    subjectId: '',
    timeLimit: 10,
    questions: [{ question: '', options: ['', '', '', ''], correctOption: 0 }]
  });

  useEffect(() => {
    if (!user.schoolId || !user.uid) {
      setLoading(false);
      return;
    }

    const qQuizzes = query(collection(db, 'schools', user.schoolId, 'quizzes'));
    const unsubQuizzes = onSnapshot(qQuizzes, (snap) => {
      // Filter quizzes by subjects the teacher teaches
      const subjectIds = subjects.map(s => s.id);
      const teacherQuizzes = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Quiz))
        .filter(q => subjectIds.includes(q.subjectId));
      
      teacherQuizzes.sort((a, b) => {
        const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setQuizzes(teacherQuizzes);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/quizzes`);
    });

    // Fetch students for displaying names in results
    const qStudents = query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(sortByFullName(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile))));
    });

    return () => {
      unsubQuizzes();
      unsubStudents();
    };
  }, [user.schoolId, user.uid, subjects]);

  const handleAddQuestion = () => {
    setNewQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, { question: '', options: ['', '', '', ''], correctOption: 0 }]
    }));
  };

  const handleRemoveQuestion = (index: number) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    setNewQuiz(prev => {
      const newQuestions = [...prev.questions];
      newQuestions[index] = { ...newQuestions[index], [field]: value };
      return { ...prev, questions: newQuestions };
    });
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    setNewQuiz(prev => {
      const newQuestions = [...prev.questions];
      newQuestions[qIndex].options[oIndex] = value;
      return { ...prev, questions: newQuestions };
    });
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuiz.title || !newQuiz.subjectId || newQuiz.questions.length === 0) return;

    const subject = subjects.find(s => s.id === newQuiz.subjectId);
    if (!subject) return;

    // Validate questions
    for (const q of newQuiz.questions) {
      if (!q.question || q.options.some(o => !o)) {
        alert("Please fill in all questions and options.");
        return;
      }
    }

    try {
      const quizData = {
        ...newQuiz,
        schoolId: user.schoolId,
        classId: subject.classId,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'schools', user.schoolId, 'quizzes'), quizData);
      setShowAddQuiz(false);
      setNewQuiz({
        title: '',
        subjectId: '',
        timeLimit: 10,
        questions: [{ question: '', options: ['', '', '', ''], correctOption: 0 }]
      });
    } catch (error) {
      console.error("Error adding quiz:", error);
    }
  };

  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      await deleteDoc(doc(db, 'schools', user.schoolId, 'quizzes', quizToDelete));
    } catch (error) {
      console.error("Error deleting quiz:", error);
    } finally {
      setQuizToDelete(null);
    }
  };

  const handleViewResults = async (quizId: string) => {
    setViewingQuizResults(quizId);
    try {
      const qResults = query(collection(db, 'schools', user.schoolId!, 'results'), where('quizId', '==', quizId));
      const snap = await getDocs(qResults);
      const resultsData = snap.docs.map(d => {
        const data = d.data() as Result;
        const student = students.find(s => s.uid === data.studentId);
        return {
          id: d.id,
          ...data,
          studentName: student ? `${formatDisplayString(student.firstName)} ${formatDisplayString(student.lastName)}` : 'Unknown Student'
        };
      });
      resultsData.sort((a, b) => b.score - a.score); // Sort by highest score
      setQuizResults(resultsData);
    } catch (error) {
      console.error("Error fetching quiz results:", error);
    }
  };

  const getSubjectName = (subjectId: string) => formatDisplayString(subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject');
  const getClassName = (classId: string) => formatDisplayString(classes.find(c => c.id === classId)?.name || 'Unknown Class');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-blue-700">Assessment Center</h3>
          <p className="text-xs font-bold tracking-tight text-slate-950 mt-1">Design and analyze student quizzes</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-5 w-full lg:w-auto">
          <div className="relative group min-w-[200px]">
            <select
              className="w-full appearance-none px-5 py-3 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 focus:border-blue-500 outline-none transition-all font-bold tracking-tight text-xs text-blue-800 cursor-pointer shadow-sm"
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{formatDisplayString(c.name)}</option>)}
            </select>
          </div>
          
          <button
          id="btn_teacher_create_quiz"
          onClick={() => setShowAddQuiz(true)}
          className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-2xl font-bold tracking-tight text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> Create Quiz
        </button>
        </div>
      </div>

      {showAddQuiz && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[2.5rem] p-8 w-full max-w-4xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
          >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-blue-700">New Quiz</h3>
                  <p className="text-xs font-bold tracking-tight text-slate-950 mt-1">Design a new assessment for your students</p>
                </div>
              <button 
                id="btn_teacher_quiz_close_modal"
                onClick={() => setShowAddQuiz(false)} 
                className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-tight text-slate-500 ml-1">Title</label>
                    <input
                      id="input_teacher_quiz_title"
                      type="text"
                      required
                      value={newQuiz.title}
                      onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold tracking-tight text-xs text-slate-900"
                      placeholder="e.g. Unit 1 Mastery Test"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-tight text-slate-500 ml-1">Subject</label>
                    <select
                      required
                      value={newQuiz.subjectId}
                      onChange={e => setNewQuiz({ ...newQuiz, subjectId: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold tracking-tight text-xs text-slate-900"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{formatDisplayString(s.name)} ({getClassName(s.classId)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-tight text-slate-500 ml-1">Time Limit (Minutes)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newQuiz.timeLimit}
                      onChange={e => setNewQuiz({ ...newQuiz, timeLimit: parseInt(e.target.value) })}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold tracking-tight text-xs text-slate-900"
                    />
                  </div>
              </div>

                <div className="pt-8 border-t border-slate-100">
                  <h4 className="text-lg font-bold tracking-tight text-slate-900 mb-6">Questions ({newQuiz.questions.length})</h4>
                  
                  <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-tight text-slate-500 ml-1">Question Text</label>
                        <input
                          type="text"
                          value={newQuestion.text}
                          onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold tracking-tight text-xs text-slate-900"
                          placeholder="Enter question text..."
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {newQuestion.options.map((opt, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={e => {
                                const newOpts = [...newQuestion.options];
                                newOpts[idx] = e.target.value;
                                setNewQuestion({ ...newQuestion, options: newOpts });
                              }}
                              className="flex-1 px-5 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold tracking-tight text-[10px] text-slate-900"
                              placeholder={`Option ${idx + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: opt })}
                              className={`px-3 rounded-xl transition-all border ${
                                newQuestion.correctAnswer === opt && opt !== '' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-300 border-slate-100'
                              }`}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      id="btn_teacher_quiz_add_question"
                      type="button"
                      onClick={handleAddQuestion}
                      className="w-full mt-6 py-4 rounded-2xl bg-white border border-blue-200 text-blue-600 text-[10px] font-bold tracking-tight hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Plus size={16} strokeWidth={3} /> Add Question to Quiz
                    </button>
              </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-slate-100">
                  <button
                    id="btn_teacher_quiz_cancel_create"
                    type="button"
                    onClick={() => setShowAddQuiz(false)}
                    className="order-2 sm:order-1 px-8 py-4 rounded-2xl font-bold tracking-tight text-[11px] text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn_teacher_quiz_save"
                    type="submit"
                    className="order-1 sm:order-2 px-10 py-4 rounded-2xl font-bold tracking-tight text-[11px] bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                  >
                    Create Quiz
                  </button>
                </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map(quiz => {
          return (
            <motion.div
              key={quiz.id}
              whileHover={{ y: -4 }}
              className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col gap-5 group hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start relative z-10">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm">
                  <Brain size={20} strokeWidth={2.5} />
                </div>
                <div className="flex gap-2">
                  <button
                    id={`btn_teacher_quiz_delete_${quiz.id}`}
                    onClick={() => setQuizToDelete(quiz.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="relative z-10">
              <h4 className="font-bold tracking-tight text-base text-slate-900 leading-tight">{formatDisplayString(quiz.title)}</h4>
              <p className="text-[9px] text-slate-500 font-bold tracking-tight mt-1">
                {formatDisplayString(getSubjectName(quiz.subjectId))} <span className="mx-1 text-slate-200">•</span> {formatDisplayString(getClassName(quiz.classId))}
              </p>
            </div>
              <div className="flex items-center gap-4 relative z-10">
              <div className="flex items-center gap-2 text-[8px] font-bold tracking-tight text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                <Clock size={12} strokeWidth={3} />
                {quiz.timeLimit} mins
              </div>
              <div className="flex items-center gap-2 text-[8px] font-bold tracking-tight text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                <FileQuestion size={12} strokeWidth={3} />
                {quiz.questions.length} questions
              </div>
            </div>
              <div className="pt-5 border-t border-slate-50 relative z-10">
                <button
                id={`btn_teacher_quiz_view_results_${quiz.id}`}
                onClick={() => setViewingResults(quiz.id)}
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-[10px] font-bold tracking-tight hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98]"
              >
                View Performance <ChevronRight size={12} strokeWidth={3} />
              </button>
              </div>
            </motion.div>
          );
        })}
        {quizzes.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100 shadow-sm">
              <PlusCircle size={40} />
            </div>
            <p className="text-slate-500 font-bold tracking-tight text-[10px]">No quizzes created yet.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {quizToDelete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-sm">
                <Trash2 size={40} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold tracking-tighter text-slate-900 mb-2">Delete Quiz?</h3>
              <p className="text-[10px] font-bold tracking-tight text-slate-500 mb-10 leading-relaxed px-4">
                This action is irreversible. All student performance data and records associated with this quiz will be permanently removed.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setQuizToDelete(null)}
                  className="flex-1 py-4 rounded-2xl border border-slate-200 font-bold tracking-tight text-[11px] text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteQuiz}
                  className="flex-1 py-4 rounded-2xl font-bold tracking-tight text-[11px] text-white bg-red-600 hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingResults && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-3xl shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tighter text-slate-900">Quiz Performance</h3>
                  <p className="text-[10px] font-bold tracking-tight text-blue-600 mt-1">
                    {quizzes.find(q => q.id === viewingResults)?.title}
                  </p>
                </div>
                <button 
                  onClick={() => setViewingResults(null)} 
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {quizResults.length > 0 ? (
                  <div className="space-y-4 pb-4">
                    {quizResults.map((result, idx) => {
                      const percentage = Math.round((result.score / result.total) * 100);
                      const isPassing = percentage >= 50;
                      return (
                        <div key={result.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-3xl border border-slate-100 bg-slate-50 group hover:bg-white hover:shadow-md transition-all gap-6">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 border-white">
                              {result.studentName?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold tracking-tight text-xs text-slate-900">{result.studentName}</p>
                              <p className="text-[10px] font-bold tracking-tight text-slate-500 mt-1">
                                Completed: {new Date(result.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between">
                            <div className={`text-xl font-black ${isPassing ? 'text-emerald-600' : 'text-red-600'}`}>
                              {result.score} <span className="text-slate-300 text-sm mx-1">/</span> {result.total}
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest mt-1 border shadow-sm ${
                              isPassing ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'
                            }`}>
                              {percentage}% • {isPassing ? 'PASSED' : 'FAILED'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100 shadow-sm">
                      <Users size={40} />
                    </div>
                    <p className="text-slate-500 font-bold tracking-tight text-[10px]">No results yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
