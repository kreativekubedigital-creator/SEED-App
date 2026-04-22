import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, addDoc, doc, deleteDoc, onSnapshot, handleFirestoreError, OperationType } from '../../firebase';
import { UserProfile, Quiz, Subject, Class, Result } from '../../types';
import { Plus, Trash2, CheckCircle2, Circle, CheckSquare, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByFullName } from '../../lib/utils';

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
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student'
        };
      });
      resultsData.sort((a, b) => b.score - a.score); // Sort by highest score
      setQuizResults(resultsData);
    } catch (error) {
      console.error("Error fetching quiz results:", error);
    }
  };

  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';
  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'Unknown Class';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800">Quizzes</h3>
        <button
          onClick={() => setShowAddQuiz(true)}
          className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:scale-[1.02] transition-all shadow-md  border border-white/20"
        >
          <Plus size={20} /> Create Quiz
        </button>
      </div>

      {showAddQuiz && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xl mb-8">
          <h4 className="font-medium text-xl text-gray-800 mb-6">Create New Quiz</h4>
          <form onSubmit={handleCreateQuiz} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Quiz Title</label>
                <input
                  type="text"
                  required
                  value={newQuiz.title}
                  onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                  placeholder="e.g. Midterm Math Quiz"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Subject</label>
                <select
                  required
                  value={newQuiz.subjectId}
                  onChange={e => setNewQuiz({ ...newQuiz, subjectId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({getClassName(s.classId)})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Time Limit (Minutes)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newQuiz.timeLimit}
                  onChange={e => setNewQuiz({ ...newQuiz, timeLimit: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            <div className="space-y-5">
              <h5 className="font-medium text-gray-800 border-b border-gray-100 pb-3">Questions</h5>
              {newQuiz.questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-white/50 p-4 rounded-2xl border border-gray-100 relative shadow-sm">
                  {newQuiz.questions.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="absolute top-4 right-6 text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  
                  <div className="mb-6 pr-12 space-y-1.5">
                    <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Question {qIndex + 1}</label>
                    <input
                      type="text"
                      required
                      value={q.question}
                      onChange={e => handleQuestionChange(qIndex, 'question', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                      placeholder="Enter question text"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleQuestionChange(qIndex, 'correctOption', oIndex)}
                          className={`p-2 rounded-full transition-all ${q.correctOption === oIndex ? 'text-emerald-500 bg-emerald-50 scale-110' : 'text-gray-300 hover:text-gray-800 hover:bg-gray-50'}`}
                        >
                          {q.correctOption === oIndex ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                        </button>
                        <input
                          type="text"
                          required
                          value={option}
                          onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                          className={`flex-1 px-4 py-3.5 rounded-xl border outline-none transition-all font-medium text-sm ${q.correctOption === oIndex ? 'border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10' : 'border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                          placeholder={`Option ${oIndex + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-800 font-medium mt-3 ml-12">Select the circle next to the correct option.</p>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="text-blue-600 font-medium flex items-center gap-2 hover:text-blue-700 transition-colors px-4 py-2.5 rounded-xl hover:bg-blue-50"
              >
                <Plus size={20} /> Add Another Question
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
              <button type="button" onClick={() => setShowAddQuiz(false)} className="px-4 py-2 rounded-lg font-medium text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] transition-all shadow-md  border border-white/20">Save Quiz</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map(quiz => {
          const subject = subjects.find(s => s.id === quiz.subjectId);
          return (
            <div key={quiz.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-all">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-block px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-medium uppercase tracking-wider rounded-full shadow-sm border border-blue-100/50">
                    {getSubjectName(quiz.subjectId)}
                  </span>
                  <button onClick={() => setQuizToDelete(quiz.id)} className="text-gray-800 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
                <h4 className="font-medium text-xl text-gray-800 mb-2">{quiz.title}</h4>
                <p className="text-gray-800 font-medium text-sm mb-6">{subject ? getClassName(subject.classId) : ''}</p>
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <div className="flex gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-800 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/50">{quiz.questions.length} Questions</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-800 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/50">{quiz.timeLimit || 10} Mins</span>
                </div>
                <button 
                  onClick={() => handleViewResults(quiz.id)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Eye size={16} /> Results
                </button>
              </div>
            </div>
          );
        })}
        {quizzes.length === 0 && !loading && (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-800 mx-auto mb-4 shadow-sm border border-gray-100/50">
              <CheckSquare size={40} />
            </div>
            <p className="text-gray-800 font-medium text-lg">No quizzes created yet.</p>
          </div>
        )}
      </div>

      {/* Delete Quiz Modal */}
      <AnimatePresence>
        {quizToDelete && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-2xl text-center border border-gray-100"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100/50">
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Delete Quiz?</h3>
              <p className="text-gray-800 font-medium mb-8">This action cannot be undone. Are you sure you want to delete this quiz?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setQuizToDelete(null)}
                  className="flex-1 py-4 rounded-2xl border border-gray-200/50 font-medium text-gray-800 hover:bg-gray-50 hover:text-gray-800 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteQuiz}
                  className="flex-1 py-4 rounded-2xl font-medium text-white bg-red-600 hover:bg-red-700  transition-all shadow-md hover:shadow-lg hover:shadow-red-500/30 border border-white/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* View Results Modal */}
        {viewingQuizResults && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-medium text-gray-800">Quiz Results</h3>
                  <p className="text-sm text-gray-800 font-medium mt-1">
                    {quizzes.find(q => q.id === viewingQuizResults)?.title}
                  </p>
                </div>
                <button onClick={() => setViewingQuizResults(null)} className="p-2 bg-gray-50 text-gray-800 hover:text-gray-800 rounded-full transition-colors border border-gray-200/50">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {quizResults.length > 0 ? (
                  <div className="space-y-3">
                    {quizResults.map((result, idx) => {
                      const percentage = Math.round((result.score / result.total) * 100);
                      const isPassing = percentage >= 50;
                      return (
                        <div key={result.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium text-sm border border-blue-200/50">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{result.studentName}</p>
                              <p className="text-xs text-gray-800 font-medium mt-0.5">
                                Taken: {new Date(result.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-medium ${isPassing ? 'text-emerald-600' : 'text-red-600'}`}>
                              {result.score} / {result.total}
                            </div>
                            <div className="text-xs font-medium text-gray-800">
                              {percentage}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-800 mx-auto mb-4 border border-gray-100">
                      <CheckSquare size={32} />
                    </div>
                    <p className="text-gray-800 font-medium">No students have taken this quiz yet.</p>
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
