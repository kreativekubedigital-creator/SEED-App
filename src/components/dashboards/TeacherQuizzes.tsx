import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, addDoc, doc, deleteDoc, onSnapshot, handleFirestoreError, OperationType } from '../../lib/compatibility';
import { UserProfile, Quiz, Subject, Class, Result } from '../../types';
import { Plus, Trash2, CheckCircle2, Circle, CheckSquare, Eye, X, AlertCircle, Clock, Layout, Award, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByFullName, formatDisplayString } from '../../lib/utils';

export const TeacherQuizzes = ({ user, subjects, classes }: { user: UserProfile, subjects: Subject[], classes: Class[] }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddQuiz, setShowAddQuiz] = useState(false);
  const [viewingQuizResults, setViewingQuizResults] = useState<string | null>(null);
  const [quizResults, setQuizResults] = useState<(Result & { studentName?: string })[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  
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

  const filteredQuizzes = quizzes.filter(quiz => {
    if (!selectedClassFilter) return true;
    const subject = subjects.find(s => s.id === quiz.subjectId);
    return subject?.classId === selectedClassFilter;
  });
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header & Control Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white/50 backdrop-blur-xl p-8 rounded-[3.5rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-4">
            <Layout className="text-blue-600" size={32} />
            Quiz Portal
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2 ml-1">Design and deploy objective assessments</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative group min-w-[220px]">
            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <select
              id="select_teacher_quiz_class_filter"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full appearance-none pl-12 pr-12 py-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900 cursor-pointer shadow-sm"
            >
              <option value="">Filter by Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{formatDisplayString(c.name)}</option>)}
            </select>
          </div>
          
          <button
            id="btn_teacher_create_quiz"
            onClick={() => setShowAddQuiz(true)}
            className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 active:scale-95 transition-all font-black uppercase tracking-widest text-[10px] border border-blue-500"
          >
            <Plus size={18} strokeWidth={3} /> Create New Quiz
          </button>
        </div>
      </div>

      {showAddQuiz && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            className="bg-white rounded-[3.5rem] p-10 w-full max-w-5xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
              <div>
                <h4 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Create New Quiz</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Design an interactive objective assessment</p>
              </div>
              <button 
                id="btn_teacher_quiz_close_modal"
                onClick={() => setShowAddQuiz(false)} 
                className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-[2rem] transition-all border border-slate-100 shadow-sm"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Quiz Title</label>
                  <input
                    id="input_teacher_quiz_title"
                    type="text"
                    required
                    value={newQuiz.title}
                    onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                    className="w-full px-6 py-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900 placeholder:text-slate-300"
                    placeholder="e.g. Midterm Math Quiz"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Subject</label>
                  <select
                    id="select_teacher_quiz_subject"
                    required
                    value={newQuiz.subjectId}
                    onChange={e => setNewQuiz({ ...newQuiz, subjectId: e.target.value })}
                    className="w-full px-6 py-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900 cursor-pointer appearance-none"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{formatDisplayString(s.name)} ({getClassName(s.classId)})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 flex items-center gap-2">
                    <Clock size={12} className="text-blue-500" />
                    Time Limit (Mins)
                  </label>
                  <input
                    id="input_teacher_quiz_time_limit"
                    type="number"
                    required
                    min="1"
                    value={newQuiz.timeLimit}
                    onChange={e => setNewQuiz({ ...newQuiz, timeLimit: parseInt(e.target.value) || 10 })}
                    className="w-full px-6 py-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-8 pt-10 border-t border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h5 className="font-black uppercase tracking-widest text-sm text-slate-900 flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xs shadow-lg shadow-blue-500/20">
                      {newQuiz.questions.length}
                    </span>
                    Questions Configuration
                  </h5>
                </div>

                <div className="space-y-6">
                  {newQuiz.questions.map((q, qIndex) => (
                    <motion.div 
                      key={qIndex}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 relative group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all border-l-4 border-l-blue-500"
                    >
                      {newQuiz.questions.length > 1 && (
                        <button 
                          id={`btn_teacher_quiz_remove_question_${qIndex}`}
                          type="button" 
                          onClick={() => handleRemoveQuestion(qIndex)}
                          className="absolute top-8 right-8 text-slate-300 hover:text-red-500 hover:bg-red-50 p-3 rounded-2xl transition-all border border-transparent hover:border-red-100 shadow-sm hover:shadow-md"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                      
                      <div className="mb-8 pr-16 space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Question {qIndex + 1}</label>
                        <input
                          id={`input_teacher_quiz_q${qIndex}`}
                          type="text"
                          required
                          value={q.question}
                          onChange={e => handleQuestionChange(qIndex, 'question', e.target.value)}
                          className="w-full px-6 py-5 rounded-2xl border border-slate-200 bg-white focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900 placeholder:text-slate-300 shadow-sm"
                          placeholder="What is the capital of France?"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {q.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-4 group/option">
                            <button
                              id={`btn_teacher_quiz_q${qIndex}_opt${oIndex}`}
                              type="button"
                              onClick={() => handleQuestionChange(qIndex, 'correctOption', oIndex)}
                              className={`p-4 rounded-2xl transition-all border shadow-sm ${q.correctOption === oIndex ? 'text-emerald-600 bg-emerald-50 border-emerald-200 scale-105 shadow-emerald-200/50' : 'text-slate-300 bg-white border-slate-200 hover:text-slate-900 hover:border-slate-300 group-hover/option:border-slate-300'}`}
                            >
                              {q.correctOption === oIndex ? <CheckCircle2 size={24} strokeWidth={3} /> : <Circle size={24} strokeWidth={2} />}
                            </button>
                            <input
                              id={`input_teacher_quiz_q${qIndex}_opt${oIndex}`}
                              type="text"
                              required
                              value={option}
                              onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                              className={`flex-1 px-6 py-5 rounded-2xl border outline-none transition-all font-black uppercase tracking-widest text-[10px] ${q.correctOption === oIndex ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-md shadow-emerald-200/20' : 'border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 text-slate-900 shadow-sm'}`}
                              placeholder={`Option ${oIndex + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full py-6 rounded-3xl bg-white border-2 border-dashed border-slate-200 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                >
                  <Plus size={20} strokeWidth={3} /> Add Another Question
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-10 border-t border-slate-100 mt-12">
                <button 
                  type="button" 
                  onClick={() => setShowAddQuiz(false)} 
                  className="order-2 sm:order-1 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                >
                  Discard Changes
                </button>
                <button 
                  type="submit" 
                  className="order-1 sm:order-2 px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/30 active:scale-95 border border-blue-500"
                >
                  Publish Quiz Portal
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredQuizzes.map(quiz => {
          const subject = subjects.find(s => s.id === quiz.subjectId);
          return (
            <motion.div
              key={quiz.id}
              id={`card_teacher_quiz_${quiz.id}`}
              whileHover={{ y: -8 }}
              className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col gap-6 group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100 shadow-sm">
                  {getSubjectName(quiz.subjectId)}
                </span>
                <button 
                  id={`btn_teacher_quiz_delete_${quiz.id}`}
                  onClick={() => setQuizToDelete(quiz.id)} 
                  className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="relative z-10">
                <h4 className="font-black uppercase tracking-tight text-2xl text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors">{formatDisplayString(quiz.title)}</h4>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    {subject ? getClassName(subject.classId) : 'Unassigned Class'}
                  </p>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-50 flex justify-between items-center relative z-10">
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <CheckSquare size={12} className="text-blue-500" />
                    {quiz.questions.length} Qs
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <Clock size={12} className="text-blue-500" />
                    {quiz.timeLimit || 10}m
                  </div>
                </div>
                <button 
                  id={`btn_teacher_quiz_view_results_${quiz.id}`}
                  onClick={() => handleViewResults(quiz.id)}
                  className="p-3 rounded-2xl bg-slate-900 text-white hover:bg-blue-600 transition-all flex items-center justify-center shadow-lg shadow-slate-900/10 active:scale-95 group/btn"
                >
                  <Eye size={18} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform" />
                </button>
              </div>
            </motion.div>
          );
        })}
        {filteredQuizzes.length === 0 && !loading && (
          <div className="col-span-full py-24 text-center bg-white rounded-[3.5rem] border border-slate-100 border-dashed shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mx-auto mb-6 border border-slate-100 shadow-sm">
              <CheckSquare size={44} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-black uppercase tracking-widest text-slate-300">No matching quizzes found</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Try adjusting your filters or create a new assessment</p>
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
              className="bg-white rounded-[3.5rem] p-10 w-full max-w-md shadow-2xl border border-slate-100 text-center"
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
              className="bg-white rounded-[3.5rem] p-8 w-full max-w-3xl shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col"
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
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                Completed: {new Date(result.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between">
                            <div className={`text-xl font-black ${isPassing ? 'text-emerald-600' : 'text-red-600'}`}>
                              {result.score} <span className="text-slate-300 text-sm mx-1">/</span> {result.total}
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mt-1 border shadow-sm ${
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
