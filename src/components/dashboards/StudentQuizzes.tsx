import { useState, useEffect, useMemo } from 'react';
import { db, collection, getDocs, query, where, addDoc } from '../../lib/compatibility';
import { UserProfile, Quiz, Result, Subject } from '../../types';
import { CheckCircle2, Circle, Trophy, ArrowRight, ArrowLeft, BookOpen, BrainCircuit, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { REVISION_QUIZZES } from '../../constants/quizContent';
import { addXP } from '../../services/gamificationService';

export const StudentQuizzes = ({ user, subjects, classLevel }: { user: UserProfile, subjects: Subject[], classLevel?: string }) => {
  const [dbQuizzes, setDbQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | any>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<{ score: number, total: number } | null>(null);
  const [quizType, setQuizType] = useState<'revision' | 'class'>('revision');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const revisionQuizzes = useMemo(() => {
    if (!classLevel) return [];
    
    const normalize = (lvl: string) => lvl.toLowerCase().trim().replace('primary', 'p').replace(/\s+/g, '');
    const normalizedClassLevel = normalize(classLevel);

    return REVISION_QUIZZES.filter(q => {
      const normalizedQuizLevel = normalize((q as any).level || '');
      return normalizedClassLevel === normalizedQuizLevel || 
             normalizedClassLevel.includes(normalizedQuizLevel) || 
             normalizedQuizLevel.includes(normalizedClassLevel);
    }).map((q, idx) => ({
      ...q,
      id: `rev-${classLevel}-${idx}`,
      isRevision: true
    })) as Quiz[];
  }, [classLevel]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.classId) {
          const qQuizzes = query(collection(db, 'schools', user.schoolId, 'quizzes'), where('classId', '==', user.classId));
          const quizSnap = await getDocs(qQuizzes);
          const quizzesData = quizSnap.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
          quizzesData.sort((a, b) => {
            const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
            const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
            return dateB - dateA;
          });
          setDbQuizzes(quizzesData);
        }

        const qResults = query(collection(db, 'schools', user.schoolId, 'results'), where('studentId', '==', user.uid));
        const resultSnap = await getDocs(qResults);
        const resultsData = resultSnap.docs.map(d => ({ id: d.id, ...d.data() } as Result));
        resultsData.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
        setResults(resultsData);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.classId, user.uid]);

  const displayedQuizzes = quizType === 'revision' ? revisionQuizzes : dbQuizzes;

  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';

  const handleStartQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestion(0);
    setAnswers({});
    setScore(null);
    setTimeLeft(quiz.timeLimit ? quiz.timeLimit * 60 : 10 * 60); // Default 10 mins
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeQuiz && !score && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timeLeft === 0 && !score && !submitting) {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [activeQuiz, score, timeLeft, submitting]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!activeQuiz) return;
    setSubmitting(true);

    let calculatedScore = 0;
    activeQuiz.questions.forEach((q: any, index: number) => {
      if (answers[index] === q.correctOption) {
        calculatedScore++;
      }
    });

    try {
      const newResult = {
        studentId: user.uid,
        subjectId: activeQuiz.subjectId,
        quizId: activeQuiz.id,
        score: calculatedScore,
        total: activeQuiz.questions.length,
        date: new Date().toISOString(),
        isRevision: activeQuiz.isRevision || false
      };

      if (!activeQuiz.isRevision) {
        const docRef = await addDoc(collection(db, 'schools', user.schoolId, 'results'), newResult);
        setResults(prev => [...prev, { id: docRef.id, ...newResult } as Result]);
      } else {
        // For revision quizzes, we just show the score and maybe save locally or just in state for this session
        setResults(prev => [...prev, { id: `temp-${Date.now()}`, ...newResult } as Result]);
      }
      
      // Award XP if passed (>= 50%)
      if (calculatedScore / activeQuiz.questions.length >= 0.5) {
        addXP(user.uid, 'QUIZ_PASS', { quizId: activeQuiz.id, title: activeQuiz.title }).catch(console.error);
      }
      
      setScore({ score: calculatedScore, total: activeQuiz.questions.length });
    } catch (error) {
      console.error("Error submitting quiz:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-900 font-black uppercase tracking-widest text-[10px]">Loading quizzes...</div>;
  }

  const containerClass = "space-y-6";

  if (activeQuiz) {
    if (score) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-sm text-center max-w-2xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-200/5 rounded-full blur-2xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200/50">
              <Trophy size={48} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-3">Quiz Completed!</h2>
            <p className="text-slate-900/40 font-black uppercase tracking-widest mb-8 text-[10px]">You have successfully completed {activeQuiz.title}.</p>
            
            <div className="text-6xl font-black text-blue-600 mb-10 drop-shadow-sm">
              {score.score} <span className="text-3xl text-slate-900/40 font-black">/ {score.total}</span>
            </div>
            
            <button 
              onClick={() => setActiveQuiz(null)}
              className="bg-blue-600 text-white hover:bg-blue-700 px-10 py-2.5 rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all"
            >
              Back to Quizzes
            </button>
          </div>
        </motion.div>
      );
    }

    const question = activeQuiz.questions[currentQuestion];

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 md:p-4 rounded-2xl border border-slate-100 shadow-sm max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-lg font-medium text-slate-900">{activeQuiz.title}</h2>
            <p className="text-slate-900 font-medium mt-1">{getSubjectName(activeQuiz.subjectId)}</p>
          </div>
          <div className="flex items-center gap-4">
            {timeLeft !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium border ${
                timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200/50 animate-pulse' : 'bg-slate-50 text-slate-900 border-gray-200/50'
              }`}>
                <Clock size={16} />
                {formatTime(timeLeft)}
              </div>
            )}
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-5 py-2.5 rounded-full border border-blue-200/50 shadow-sm">
              Question {currentQuestion + 1} of {activeQuiz.questions.length}
            </div>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-lg font-medium text-slate-900 mb-8 leading-snug">{question.question}</h3>
          <div className="space-y-6">
            {question.options.map((option, index) => (
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                key={index}
                onClick={() => handleAnswer(index)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group ${
                  answers[currentQuestion] === index 
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md scale-[1.02]' 
                    : 'border-slate-100 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 bg-white shadow-sm hover:shadow-md'
                }`}
              >
                {answers[currentQuestion] === index ? (
                  <CheckCircle2 className="text-blue-600 shrink-0" size={20} />
                ) : (
                  <Circle className="text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" size={20} />
                )}
                <span className={`font-medium text-lg ${answers[currentQuestion] === index ? 'text-blue-900' : 'text-slate-900 group-hover:text-slate-900'}`}>{option}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-8 border-t border-slate-100">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-900 hover:bg-gray-100 hover:text-slate-900 disabled:opacity-50 transition-all"
          >
            <ArrowLeft size={20} /> Previous
          </motion.button>
          
          {currentQuestion === activeQuiz.questions.length - 1 ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length !== activeQuiz.questions.length}
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-8 py-3.5 rounded-xl font-medium hover:shadow-md disabled:opacity-50 transition-all shadow-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'} <CheckCircle2 size={20} />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => setCurrentQuestion(prev => Math.min(activeQuiz.questions.length - 1, prev + 1))}
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-md transition-all shadow-sm"
            >
              Next <ArrowRight size={20} />
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black uppercase tracking-widest text-slate-900">Quiz Hub</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-900/60 mt-1">Test your knowledge and earn points!</p>
        </div>
        <div className="flex bg-white/80 backdrop-blur-md p-1 rounded-xl border border-slate-100 bg-slate-50">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => setQuizType('revision')}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              quizType === 'revision' ? 'bg-purple-100 text-slate-900 shadow-md' : 'text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BookOpen size={18} /> Revision Quizzes
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => setQuizType('class')}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              quizType === 'class' ? 'bg-orange-100 text-slate-900 shadow-md' : 'text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BrainCircuit size={18} /> Class Quizzes
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedQuizzes.map((quiz, index) => {
          const result = results.find(r => r.quizId === quiz.id);
          const colors = ['bg-pink-100', 'bg-blue-100', 'bg-purple-100', 'bg-orange-100', 'bg-green-100'];
          const colorClass = colors[index % colors.length];
          return (
            <motion.div whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} key={quiz.id} className={`${colorClass} p-3 rounded-2xl border border-white/50 shadow-sm transition-all flex flex-col group relative overflow-hidden`}>
              <div className="flex-1 relative z-10">
                <span className={`inline-block px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full mb-3 border bg-white/60 text-slate-900 border-white/50`}>
                  {getSubjectName(quiz.subjectId)}
                </span>
                <h4 className="font-black uppercase tracking-widest text-lg text-slate-900 mb-1 leading-tight">{quiz.title}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900/50 mb-4">{quiz.questions.length} Questions</p>
              </div>
              {result ? (
                <div className="pt-4 border-t border-white/30 flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-900/50 uppercase tracking-widest">Score</span>
                    <span className={`font-black text-lg px-3 py-1 rounded-xl border bg-white/60 text-slate-900 border-white/50`}>
                      {result.score}/{result.total}
                    </span>
                  </div>
                  {quizType === 'revision' && (
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      onClick={() => handleStartQuiz(quiz)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white/40 hover:bg-white/60 px-3 py-1.5 rounded-lg transition-colors border border-white/30"
                    >
                      Retake
                    </motion.button>
                  )}
                </div>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  onClick={() => handleStartQuiz(quiz)}
                  className="w-full py-2.5 bg-white border border-white/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-all shadow-sm relative z-10"
                >
                  Start Quiz
                </motion.button>
              )}
            </motion.div>
          );
        })}
        {displayedQuizzes.length === 0 && (
          <div className="col-span-full p-16 text-center bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-900 shadow-sm border border-slate-100">
              {quizType === 'revision' ? <BookOpen size={40} /> : <BrainCircuit size={40} />}
            </div>
            <p className="text-slate-900 font-black uppercase tracking-widest text-sm">No {quizType} quizzes available</p>
            <p className="text-slate-500 font-medium mt-2 text-[10px] uppercase tracking-widest">Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
};
