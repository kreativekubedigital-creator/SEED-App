import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, addDoc, doc, deleteDoc, onSnapshot, writeBatch, handleFirestoreError, OperationType } from '../../lib/compatibility';
import { UserProfile, Quiz, Subject, Class, Result } from '../../types';
import { Plus, Trash2, CheckCircle2, Circle, CheckSquare, Eye, X, PlusCircle, FileQuestion, ChevronRight, Clock, User } from 'lucide-react';
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

  const [selectedClass, setSelectedClass] = useState<string>('');

  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      // Initialize with 'all' instead of a specific class to give an overview by default
      setSelectedClass('all');
    }
  }, [classes, selectedClass]);

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
    if (!quizToDelete || !user.schoolId) return;
    try {
      const batch = writeBatch(db);
      
      // 1. Delete the quiz itself
      batch.delete(doc(db, 'schools', user.schoolId, 'quizzes', quizToDelete));
      
      // 2. Find and delete all results for this quiz
      const resultsQuery = query(
        collection(db, 'schools', user.schoolId, 'results'), 
        where('quizId', '==', quizToDelete)
      );
      const resultsSnap = await getDocs(resultsQuery);
      resultsSnap.docs.forEach(resDoc => {
        batch.delete(resDoc.ref);
      });

      await batch.commit();
      setQuizzes(quizzes.filter(q => q.id !== quizToDelete));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quizzes/${quizToDelete}`);
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-xl font-medium tracking-tighter text-slate-900 uppercase leading-none">Assessment Center</h3>
          <p className="text-[10px] font-medium tracking-tight text-slate-500 mt-1 uppercase">Design and analyze student quizzes</p>
        </div>
        
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative group min-w-[160px]">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full appearance-none px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 outline-none transition-all font-medium tracking-tighter text-[10px] text-slate-900 cursor-pointer shadow-sm uppercase"
            >
              <option value="all">ALL CLASSES</option>
              {classes.map(c => <option key={c.id} value={c.id}>{formatDisplayString(c.name)}</option>)}
            </select>
          </div>
          
          <button
            id="btn_teacher_create_quiz"
            onClick={() => setShowAddQuiz(true)}
            className="whitespace-nowrap bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 px-4 py-2 rounded-xl font-medium tracking-tighter text-[10px] flex items-center justify-center gap-2 active:scale-95 uppercase"
          >
            <Plus size={12} strokeWidth={4} /> Create Quiz
          </button>
        </div>
      </div>

      {showAddQuiz && (
        <div className="fixed inset-0 bg-blue-500/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[2rem] p-6 w-full max-w-4xl shadow-2xl border border-slate-200/60 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-medium tracking-tighter text-slate-900 uppercase leading-none">New Quiz</h3>
                <p className="text-[10px] font-medium tracking-tight text-slate-500 mt-1 uppercase">Design a new assessment for your students</p>
              </div>
              <button 
                id="btn_teacher_quiz_close_modal"
                onClick={() => setShowAddQuiz(false)} 
                className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-blue-500 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-medium tracking-widest text-slate-400 ml-1 uppercase">Quiz Title</label>
                  <input
                    id="input_teacher_quiz_title"
                    type="text"
                    required
                    value={newQuiz.title}
                    onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium tracking-tighter text-sm text-slate-900 uppercase"
                    placeholder="e.g. UNIT 1 MASTERY TEST"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-medium tracking-widest text-slate-400 ml-1 uppercase">Subject & Class</label>
                  <select
                    required
                    value={newQuiz.subjectId}
                    onChange={e => setNewQuiz({ ...newQuiz, subjectId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium tracking-tighter text-sm text-slate-900 uppercase"
                  >
                    <option value="">SELECT SUBJECT</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{formatDisplayString(s.name)} ({getClassName(s.classId)})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-medium tracking-widest text-slate-400 ml-1 uppercase">Time Limit (Minutes)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newQuiz.timeLimit}
                    onChange={e => setNewQuiz({ ...newQuiz, timeLimit: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium tracking-tighter text-sm text-slate-900"
                  />
                </div>
              </div>

                <div className="pt-6 border-t border-slate-200/60">
                  <h4 className="text-[10px] font-medium tracking-widest text-slate-900 mb-4 uppercase">Quiz Questions ({newQuiz.questions.length})</h4>
                  
                  <div className="space-y-6">
                    {newQuiz.questions.map((q, qIdx) => (
                      <div key={qIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-4 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-medium tracking-widest text-slate-400 uppercase">Question {qIdx + 1}</span>
                          {newQuiz.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(qIdx)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-medium tracking-widest text-slate-900 ml-1 uppercase">Question Prompt</label>
                          <input
                            type="text"
                            required
                            value={q.question}
                            onChange={e => handleQuestionChange(qIdx, 'question', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium tracking-tighter text-sm text-slate-900 uppercase"
                            placeholder="ENTER QUESTION..."
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex gap-2">
                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={e => handleOptionChange(qIdx, oIdx, e.target.value)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium tracking-tighter text-xs text-slate-900 uppercase"
                                placeholder={`OPTION ${oIdx + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleQuestionChange(qIdx, 'correctOption', oIdx)}
                                className={`px-3 rounded-xl transition-all border ${
                                  q.correctOption === oIdx ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20' : 'bg-white text-slate-300 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <CheckCircle2 size={14} strokeWidth={3} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <button
                      id="btn_teacher_quiz_add_question"
                      type="button"
                      onClick={handleAddQuestion}
                      className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-blue-500 text-[10px] font-medium tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm uppercase"
                    >
                      <Plus size={16} strokeWidth={4} /> Add Question to Quiz
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-slate-200/60">
                  <button
                    id="btn_teacher_quiz_cancel_create"
                    type="button"
                    onClick={() => setShowAddQuiz(false)}
                    className="order-2 sm:order-1 px-8 py-3 rounded-xl font-medium tracking-tighter text-[10px] text-slate-400 hover:text-blue-500 transition-all uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn_teacher_quiz_save"
                    type="submit"
                    className="order-1 sm:order-2 px-10 py-3 rounded-xl font-medium tracking-tighter text-[10px] bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95 uppercase"
                  >
                    Create Quiz
                  </button>
                </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.filter(q => selectedClass === 'all' || q.classId === selectedClass).map(quiz => {
          return (
            <motion.div
              key={quiz.id}
              whileHover={{ y: -2 }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col gap-4 group hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <h4 className="font-medium tracking-tighter text-sm text-slate-900 leading-none uppercase">{formatDisplayString(quiz.title)}</h4>
                  <p className="text-[10px] text-slate-400 font-medium tracking-tighter mt-1 uppercase">
                    {formatDisplayString(getSubjectName(quiz.subjectId))} • {formatDisplayString(getClassName(quiz.classId))}
                  </p>
                </div>
                <button
                  id={`btn_teacher_quiz_delete_${quiz.id}`}
                  onClick={() => setQuizToDelete(quiz.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[9px] font-medium tracking-widest text-blue-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 uppercase">
                  <Clock size={10} strokeWidth={4} /> {quiz.timeLimit} MINS
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-medium tracking-widest text-blue-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 uppercase">
                  <FileQuestion size={10} strokeWidth={4} /> {quiz.questions.length} QUESTIONS
                </div>
              </div>

              <button
                id={`btn_teacher_quiz_view_results_${quiz.id}`}
                onClick={() => handleViewResults(quiz.id)}
                className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-[10px] font-medium tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98] uppercase"
              >
                View Performance <ChevronRight size={10} strokeWidth={4} />
              </button>
            </motion.div>
          );
        })}
        {quizzes.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200/60 border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-3 border border-slate-200/60 shadow-sm">
              <PlusCircle size={32} />
            </div>
            <p className="text-blue-500 font-medium tracking-tighter text-xs uppercase">No quizzes created yet.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {quizToDelete && (
          <div className="fixed inset-0 bg-blue-500/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-slate-200/60 text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-sm">
                <Trash2 size={32} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-medium tracking-tighter text-blue-500 uppercase mb-2">Delete Quiz?</h3>
              <p className="text-[10px] font-medium tracking-tight text-slate-500 mb-8 leading-relaxed px-4 uppercase">
                This action is irreversible. All student performance data and records associated with this quiz will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setQuizToDelete(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 font-medium tracking-tighter text-[10px] text-blue-500 hover:bg-slate-50 transition-all uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteQuiz}
                  className="flex-1 py-3 rounded-xl font-medium tracking-tighter text-[10px] text-white bg-red-600 hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95 uppercase"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingQuizResults && (
          <div className="fixed inset-0 bg-blue-500/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-6 w-full max-w-2xl shadow-2xl border border-slate-200/60 max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-medium tracking-tighter text-slate-900 uppercase leading-none">Quiz Performance</h3>
                  <p className="text-[10px] font-medium tracking-tight text-slate-500 mt-1 uppercase">
                    {quizzes.find(q => q.id === viewingQuizResults)?.title}
                  </p>
                </div>
                <button 
                  onClick={() => setViewingQuizResults(null)} 
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {quizResults.length > 0 ? (
                  <div className="space-y-3 pb-4">
                    {quizResults.map((result, idx) => {
                      const percentage = Math.round((result.score / result.total) * 100);
                      const isPassing = percentage >= 50;
                      return (
                        <div key={result.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border border-slate-200/60 bg-slate-50 group hover:bg-white hover:shadow-md transition-all gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center font-medium text-lg shadow-lg border-2 border-white">
                              {result.studentName?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium tracking-tighter text-sm text-slate-900 uppercase">{result.studentName}</p>
                              <p className="text-[10px] font-medium tracking-tight text-slate-400 mt-0.5 uppercase">
                                COMPLETED: {new Date(result.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between">
                             <div className={`text-3xl font-medium tracking-tighter ${isPassing ? 'text-emerald-500' : 'text-red-500'}`}>
                              {result.score}<span className="text-slate-300 text-lg mx-1">/</span>{result.total}
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[9px] font-medium uppercase tracking-widest mt-1 border shadow-sm ${
                              isPassing ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'
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
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-200/60 shadow-sm">
                      <User size={32} />
                    </div>
                    <p className="text-blue-500 font-medium tracking-tighter text-xs uppercase">No results yet.</p>
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
