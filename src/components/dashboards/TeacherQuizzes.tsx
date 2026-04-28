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
      {/* Header & Control Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Quiz Portal</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Design and deploy objective assessments</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-5 w-full lg:w-auto">
          <div className="relative group min-w-[200px]">
            <select
              id="select_teacher_quiz_class_filter"
              value={newQuiz.subjectId ? subjects.find(s => s.id === newQuiz.subjectId)?.classId : ''}
              onChange={(e) => {
                // This is a filter for the list, not the new quiz
              }}
              className="w-full appearance-none pl-6 pr-12 py-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900 cursor-pointer shadow-sm"
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <button
            id="btn_teacher_create_quiz"
            onClick={() => setShowAddQuiz(true)}
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 active:scale-95 transition-all font-black uppercase tracking-widest text-[10px] border border-blue-500"
          >
            <Plus size={18} strokeWidth={3} /> Create New Quiz
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
                <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Create New Quiz</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Design an interactive assessment</p>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quiz Title</label>
                  <input
                    id="input_teacher_quiz_title"
                    type="text"
                    required
                    value={newQuiz.title}
                    onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
                    placeholder="e.g. Midterm Math Quiz"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                  <select
                    id="select_teacher_quiz_subject"
                    required
                    value={newQuiz.subjectId}
                    onChange={e => setNewQuiz({ ...newQuiz, subjectId: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({getClassName(s.classId)})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Time Limit (Mins)</label>
                  <input
                    id="input_teacher_quiz_time_limit"
                    type="number"
                    required
                    min="1"
                    value={newQuiz.timeLimit}
                    onChange={e => setNewQuiz({ ...newQuiz, timeLimit: parseInt(e.target.value) || 10 })}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-6 pt-8 border-t border-slate-100">
                <h5 className="font-black uppercase tracking-widest text-slate-900 mb-6">Questions ({newQuiz.questions.length})</h5>
                {newQuiz.questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 relative group hover:bg-white hover:shadow-md transition-all">
                    {newQuiz.questions.length > 1 && (
                      <button 
                        id={`btn_teacher_quiz_remove_question_${qIndex}`}
                        type="button" 
                        onClick={() => handleRemoveQuestion(qIndex)}
                        className="absolute top-6 right-6 text-slate-300 hover:text-red-500 p-2.5 rounded-xl transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    
                    <div className="mb-8 pr-12 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Question {qIndex + 1}</label>
                      <input
                        id={`input_teacher_quiz_q${qIndex}`}
                        type="text"
                        required
                        value={q.question}
                        onChange={e => handleQuestionChange(qIndex, 'question', e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
                        placeholder="Enter question text"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {q.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-4">
                          <button
                            id={`btn_teacher_quiz_q${qIndex}_opt${oIndex}`}
                            type="button"
                            onClick={() => handleQuestionChange(qIndex, 'correctOption', oIndex)}
                            className={`p-3 rounded-2xl transition-all border shadow-sm ${q.correctOption === oIndex ? 'text-emerald-600 bg-emerald-50 border-emerald-200 scale-110' : 'text-slate-300 bg-white border-slate-200 hover:text-slate-900 hover:border-slate-300'}`}
                          >
                            {q.correctOption === oIndex ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <Circle size={20} strokeWidth={2.5} />}
                          </button>
                          <input
                            id={`input_teacher_quiz_q${qIndex}_opt${oIndex}`}
                            type="text"
                            required
                            value={option}
                            onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                            className={`flex-1 px-5 py-4 rounded-2xl border outline-none transition-all font-black uppercase tracking-widest text-[10px] ${q.correctOption === oIndex ? 'border-emerald-500 bg-emerald-50/30 text-emerald-900 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-900'}`}
                            placeholder={`Option ${oIndex + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full py-4 rounded-2xl bg-white border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus size={16} strokeWidth={3} /> Add Another Question
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddQuiz(false)} 
                  className="order-2 sm:order-1 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="order-1 sm:order-2 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                >
                  Save Quiz
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map(quiz => {
          const subject = subjects.find(s => s.id === quiz.subjectId);
          return (
            <motion.div
              key={quiz.id}
              id={`card_teacher_quiz_${quiz.id}`}
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-6 group hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <span className="inline-block px-4 py-2 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-blue-100 shadow-sm">
                  {getSubjectName(quiz.subjectId)}
                </span>
                <button 
                  id={`btn_teacher_quiz_delete_${quiz.id}`}
                  onClick={() => setQuizToDelete(quiz.id)} 
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="relative z-10">
                <h4 className="font-black uppercase tracking-widest text-lg text-slate-900 leading-tight mb-1">{quiz.title}</h4>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  {subject ? getClassName(subject.classId) : 'N/A'}
                </p>
              </div>
              
              <div className="pt-6 border-t border-slate-50 flex justify-between items-center relative z-10">
                <div className="flex gap-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    {quiz.questions.length} Qs
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    {quiz.timeLimit || 10} Mins
                  </span>
                </div>
                <button 
                  id={`btn_teacher_quiz_view_results_${quiz.id}`}
                  onClick={() => handleViewResults(quiz.id)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98]"
                >
                  <Eye size={14} strokeWidth={3} /> Results
                </button>
              </div>
            </motion.div>
          );
        })}
        {quizzes.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100 shadow-sm">
              <CheckSquare size={40} />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No quizzes created yet.</p>
          </div>
        )}
      </div>

      {/* Delete Quiz Modal */}
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
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Delete Quiz?</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-10 leading-relaxed px-4">
                This action is irreversible. All student results and academic records associated with this quiz will be permanently removed.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setQuizToDelete(null)}
                  className="flex-1 py-4 rounded-2xl border border-slate-200 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteQuiz}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white bg-red-600 hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingQuizResults && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-3xl shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Quiz Results</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">
                    {quizzes.find(q => q.id === viewingQuizResults)?.title}
                  </p>
                </div>
                <button 
                  onClick={() => setViewingQuizResults(null)} 
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
                              <p className="font-black uppercase tracking-widest text-sm text-slate-900">{result.studentName}</p>
                              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">
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
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100 shadow-sm">
                      <CheckSquare size={40} />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No students have taken this quiz yet.</p>
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
