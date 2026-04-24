import { useState, useEffect } from 'react';
import { UserProfile, Lesson, LessonResult } from '../../types';
import { BookOpen, Play, CheckCircle2, ChevronRight, Award, Brain, Gamepad2, Sparkles, Microscope, Globe, Monitor, ShieldCheck, XCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ENGLISH_LESSONS, MATH_LESSONS, SCIENCE_LESSONS, SOCIAL_LESSONS, ICT_LESSONS, CIVIC_LESSONS } from '../../constants/lessonContent';
import { getQuestionPool } from '../../constants/questionPools';
import { addXP, updateStreak } from '../../services/gamificationService';
import { db, collection, addDoc, serverTimestamp } from '../../lib/compatibility';

export const StudentLessons = ({ user, classLevel }: { user: UserProfile, classLevel?: string }) => {
  const [selectedSubject, setSelectedSubject] = useState<'English' | 'Math' | 'Science' | 'Social Studies' | 'ICT' | 'Civic Education' | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Partial<Lesson> | null>(null);
  const [step, setStep] = useState<'intro' | 'learn' | 'practice' | 'quiz' | 'reward'>('intro');
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState<Lesson['quiz']>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [bonusXP, setBonusXP] = useState(0);

  const getSubjectLessons = () => {
    switch (selectedSubject) {
      case 'English': return ENGLISH_LESSONS;
      case 'Math': return MATH_LESSONS;
      case 'Science': return SCIENCE_LESSONS;
      case 'Social Studies': return SOCIAL_LESSONS;
      case 'ICT': return ICT_LESSONS;
      case 'Civic Education': return CIVIC_LESSONS;
      default: return [];
    }
  };

  const allLessons = getSubjectLessons();
  
  // Filter lessons by user's class level
  // If classLevel is something like 'primary', we might need to map it to 'Primary 1', etc.
  // But usually classLevel from the DB would be 'Primary 1', 'Primary 2', etc.
  // Let's normalize it.
  const lessons = allLessons.filter(lesson => {
    if (!classLevel) return true; // Show all if unknown
    
    const normalize = (lvl: string) => lvl.toLowerCase().trim().replace('primary', 'p').replace(/\s+/g, '');
    const normalizedClassLevel = normalize(classLevel);
    const normalizedLessonLevel = normalize(lesson.level || '');
    
    return normalizedClassLevel === normalizedLessonLevel || 
           normalizedClassLevel.includes(normalizedLessonLevel) || 
           normalizedLessonLevel.includes(normalizedClassLevel);
  });

  const startLesson = (lesson: Partial<Lesson>) => {
    setSelectedLesson(lesson);
    setStep('intro');
    setQuizIndex(0);
    setScore(0);
    setXpEarned(0);
    setCoinsEarned(0);
    setBonusXP(0);
    setShowFeedback(false);

    // Dynamic Question Selection Logic
    // Try to find a large pool for this level and subject, filtered by topic
    const poolFromRegistry = getQuestionPool(lesson.level || '', selectedSubject || '', lesson.title);
    
    // Fallback to the lesson's own quiz array if no pool is found
    let pool: Lesson['quiz'] = poolFromRegistry || lesson.quiz || [];
    
    // If the pool is empty, we can't start the quiz
    if (pool.length === 0) {
      console.warn("No questions found for this lesson.");
      setSessionQuestions([]);
      return;
    }

    // Shuffle and pick 10 (or all if less than 10)
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(10, pool.length));
    setSessionQuestions(selected);
  };

  const handleNextStep = async () => {
    if (step === 'intro') setStep('learn');
    else if (step === 'learn') setStep('practice');
    else if (step === 'practice') setStep('quiz');
    else if (step === 'quiz') {
      if (quizIndex < sessionQuestions.length - 1) {
        setQuizIndex(quizIndex + 1);
        setShowFeedback(false);
      } else {
        await finishLesson();
      }
    }
  };

  const finishLesson = async () => {
    setIsSaving(true);
    try {
      // Calculate Rewards
      const baseXP = score * 5;
      const baseCoins = score * 2;
      let bonus = 0;
      
      // Perfect Score Bonus
      if (score === sessionQuestions.length && sessionQuestions.length > 0) {
        bonus += 20;
      }
      
      // Streak Bonus (if applicable)
      const currentStreak = await updateStreak(user.uid);
      if (currentStreak && currentStreak > 1) {
        bonus += 10;
      }

      const totalXP = baseXP + bonus;
      const totalCoins = baseCoins;

      setXpEarned(totalXP);
      setCoinsEarned(totalCoins);
      setBonusXP(bonus);
      setPoints(prev => prev + totalXP);

      // Save Result to Firestore
      const resultData: Omit<LessonResult, 'id'> = {
        userId: user.uid,
        lessonId: selectedLesson?.id || 'unknown',
        subject: selectedSubject || 'unknown',
        classLevel: classLevel || 'unknown',
        score: score,
        totalQuestions: sessionQuestions.length,
        xpEarned: totalXP,
        coinsEarned: totalCoins,
        completedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'lessonResults'), {
        ...resultData,
        timestamp: serverTimestamp()
      });

      // Award XP to user profile
      await addXP(user.uid, 'LESSON_COMPLETE', { 
        lessonId: selectedLesson?.id, 
        title: selectedLesson?.title,
        calculatedXp: totalXP,
        calculatedCoins: totalCoins
      });

      setStep('reward');
    } catch (error) {
      console.error("Error finishing lesson:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuizAnswer = (optionIdx: number) => {
    if (showFeedback) return;

    const correct = optionIdx === sessionQuestions[quizIndex].correctOption;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      setScore(prev => prev + 1);
    }
  };

    const isFemale = user.gender === 'female';
  const containerClass = isFemale 
    ? "space-y-5 min-h-screen -mx-4 -mt-8 px-4 pt-8 bg-gradient-to-br from-[#FFD1D1] via-[#FFF3E0] to-[#E0F7FA]" 
    : "space-y-5";

  if (selectedLesson) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-white/20 shadow-sm overflow-hidden min-h-[500px] flex flex-col relative">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 relative z-10">
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedLesson.title}</h3>
              <p className="text-sm text-slate-900 dark:text-slate-100 font-medium mt-1">{selectedSubject} • {selectedLesson.level}</p>
            </div>
            <button 
              onClick={() => setSelectedLesson(null)}
              className="px-5 py-2.5 rounded-full border border-gray-200/50 bg-white dark:bg-slate-900/50 hover:bg-white dark:bg-slate-900 hover:text-slate-900 dark:text-slate-100 transition-all text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:shadow-md"
            >
              Exit Lesson
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full bg-gray-100/50">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-r-full"
              initial={{ width: '0%' }}
              animate={{ 
                width: step === 'intro' ? '20%' : 
                       step === 'learn' ? '40%' : 
                       step === 'practice' ? '60%' : 
                       step === 'quiz' ? '80%' : '100%' 
              }}
            />
          </div>

          {/* Content Area */}
          <div className="flex-grow p-4 md:p-12 flex flex-col items-center justify-center text-center relative z-10">
            <AnimatePresence mode="wait">
              {step === 'intro' && (
                <motion.div 
                  key="intro"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-5"
                >
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto text-blue-600 shadow-inner border border-white">
                    <Play size={48} fill="currentColor" />
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-xl font-medium text-slate-900 dark:text-slate-100">Ready to learn?</h4>
                    <p className="text-lg text-slate-900 dark:text-slate-100 font-medium max-w-md mx-auto leading-relaxed">{selectedLesson.intro}</p>
                  </div>
                  <button 
                    onClick={handleNextStep}
                    className="bg-blue-600 text-white hover:bg-blue-700 px-10 py-2.5 rounded-full font-medium  hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                  >
                    Start Learning <ChevronRight size={20} />
                  </button>
                </motion.div>
              )}

              {step === 'learn' && (
                <motion.div 
                  key="learn"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 w-full max-w-2xl"
                >
                  <div className="p-4 bg-white dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                    <h4 className="text-sm uppercase tracking-widest text-blue-600 font-medium mb-6">The Lesson</h4>
                    <p className="text-2xl md:text-xl font-medium leading-relaxed text-slate-900 dark:text-slate-100">{selectedLesson.content}</p>
                  </div>
                  <button 
                    onClick={handleNextStep}
                    className="bg-blue-600 text-white hover:bg-blue-700 px-10 py-2.5 rounded-full font-medium  hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                  >
                    Got it! <ChevronRight size={20} />
                  </button>
                </motion.div>
              )}

              {step === 'practice' && (
                <motion.div 
                  key="practice"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 w-full max-w-2xl"
                >
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 backdrop-blur-sm text-emerald-700 rounded-full text-sm font-medium border border-emerald-200/50 shadow-sm">
                      <Gamepad2 size={16} /> Practice Time
                    </div>
                    <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100">{selectedLesson.practice?.instruction}</h4>
                  </div>
                  <div className="p-12 bg-white dark:bg-slate-900/80 backdrop-blur-sm border-2 border-dashed border-blue-200/50 rounded-2xl text-4xl font-mono font-medium text-blue-600 shadow-sm">
                    {selectedLesson.practice?.task}
                  </div>
                  <button 
                    onClick={handleNextStep}
                    className="bg-blue-600 text-white hover:bg-blue-700 px-10 py-2.5 rounded-full font-medium  hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                  >
                    I'm Ready for the Quiz <ChevronRight size={20} />
                  </button>
                </motion.div>
              )}

              {step === 'quiz' && (
                <motion.div 
                  key="quiz"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-5 w-full max-w-xl"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 backdrop-blur-sm text-orange-600 rounded-full text-[10px] font-medium uppercase tracking-widest border border-orange-200/50 shadow-sm">Question {quizIndex + 1} / {sessionQuestions.length}</span>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span>Score: {score}</span>
                      </div>
                    </div>
                    <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 leading-snug">{sessionQuestions[quizIndex]?.question}</h4>
                  </div>
                  <div className="grid gap-4">
                    {sessionQuestions[quizIndex]?.options.map((option, idx) => {
                      const isSelected = showFeedback && idx === sessionQuestions[quizIndex].correctOption;
                      const isWrong = showFeedback && !isCorrect && idx !== sessionQuestions[quizIndex].correctOption; // This is a bit simplified
                      
                      return (
                        <button 
                          key={idx}
                          disabled={showFeedback}
                          onClick={() => handleQuizAnswer(idx)}
                          className={`p-4 rounded-2xl border transition-all text-left group flex items-center justify-between backdrop-blur-sm shadow-sm relative overflow-hidden ${
                            showFeedback 
                              ? idx === sessionQuestions[quizIndex].correctOption
                                ? 'border-emerald-500 bg-emerald-50/50'
                                : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 opacity-60'
                              : 'border-white/40 hover:border-blue-400/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 bg-white dark:bg-slate-900/80 hover:shadow-md'
                          }`}
                        >
                          <span className={`font-medium text-lg ${
                            showFeedback && idx === sessionQuestions[quizIndex].correctOption ? 'text-emerald-700' : 'text-slate-900 dark:text-slate-100'
                          }`}>{option}</span>
                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium transition-colors shadow-sm ${
                            showFeedback 
                              ? idx === sessionQuestions[quizIndex].correctOption
                                ? 'border-emerald-500 bg-emerald-500 text-slate-900 dark:text-slate-100'
                                : 'border-gray-200 bg-gray-100 text-slate-900 dark:text-slate-100'
                              : 'border-gray-200/50 bg-white dark:bg-slate-900 group-hover:border-blue-400 group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-900 dark:text-slate-100'
                          }`}>
                            {showFeedback && idx === sessionQuestions[quizIndex].correctOption ? <CheckCircle2 size={20} /> : idx + 1}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {showFeedback && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl border ${isCorrect ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}
                    >
                      <div className="flex items-start gap-3">
                        {isCorrect ? <Sparkles className="mt-1 shrink-0" size={20} /> : <XCircle className="mt-1 shrink-0" size={20} />}
                        <div>
                          <p className="font-medium text-sm mb-1">{isCorrect ? 'Excellent!' : 'Not quite right'}</p>
                          <p className="text-sm opacity-90">{sessionQuestions[quizIndex].explanation || (isCorrect ? 'You got it right!' : 'The correct answer is ' + sessionQuestions[quizIndex].options[sessionQuestions[quizIndex].correctOption])}</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleNextStep}
                        disabled={isSaving}
                        className={`mt-4 w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-white ${
                          isCorrect 
                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                            : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        {isSaving ? 'Saving...' : quizIndex < sessionQuestions.length - 1 ? 'Next Question' : 'Finish Lesson'} <ChevronRight size={18} />
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {step === 'reward' && (
                <motion.div 
                  key="reward"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 relative z-10"
                >
                  <div className="relative">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 text-yellow-400 opacity-20"
                    >
                      <Sparkles size={200} className="mx-auto" />
                    </motion.div>
                    <div className="w-40 h-40 bg-gradient-to-br from-yellow-100 to-amber-200 rounded-full flex items-center justify-center mx-auto text-yellow-600 relative z-10 shadow-xl border-4 border-white">
                      <Award size={80} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xl font-medium text-slate-900 dark:text-slate-100">Amazing Job!</h4>
                    <p className="text-lg text-slate-900 dark:text-slate-100 font-medium">You scored {score} / {sessionQuestions.length}</p>
                    
                    <div className="flex flex-col gap-3 max-w-xs mx-auto mt-6">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-700 font-medium">
                          <Sparkles size={18} /> XP Earned
                        </div>
                        <span className="text-xl font-medium text-blue-700">+{xpEarned}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2 text-amber-700 font-medium">
                          <Award size={18} /> Coins Earned
                        </div>
                        <span className="text-xl font-medium text-amber-700">+{coinsEarned}</span>
                      </div>
                      {bonusXP > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-xs font-medium text-emerald-600 flex items-center justify-center gap-1"
                        >
                          <Sparkles size={14} /> Includes {bonusXP} Bonus XP!
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 mt-8">
                    <button 
                      onClick={() => startLesson(selectedLesson!)}
                      className="bg-white dark:bg-slate-900 text-blue-600 border border-blue-200 hover:bg-blue-50 px-10 py-2.5 rounded-full font-medium transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                      <RefreshCcw size={18} /> Play Again
                    </button>
                    <button 
                      onClick={() => setSelectedLesson(null)}
                      className="bg-blue-600 text-white hover:bg-blue-700 px-10 py-2.5 rounded-full font-medium  hover:scale-105 transition-all mx-auto"
                    >
                      Back to Lessons
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">Revision Hub</h2>
          <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">Master your subjects with interactive lessons.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/40 shadow-sm">
          <Award className="text-yellow-500" size={20} />
          <span className="font-medium text-slate-900 dark:text-slate-100">{points} Points</span>
        </div>
      </div>

      {!selectedSubject ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.button 
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setSelectedSubject('English')}
            className="group relative h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 text-slate-900 p-3 text-left flex flex-col justify-between shadow-sm border border-slate-300"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <BookOpen size={160} />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <BookOpen size={16} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest mb-1">English</h3>
              <p className="text-[10px] font-black text-blue-900/70 uppercase tracking-widest leading-relaxed">Phonics & Grammar</p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/50 w-fit px-4 py-2 rounded-lg backdrop-blur-sm group-hover:bg-white transition-colors">
              Explore <ChevronRight size={14} />
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setSelectedSubject('Math')}
            className="group relative h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-200 text-slate-900 p-3 text-left flex flex-col justify-between shadow-sm border border-slate-300"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Brain size={160} />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <Brain size={16} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest mb-1">Math</h3>
              <p className="text-[10px] font-black text-indigo-900/70 uppercase tracking-widest leading-relaxed">Numbers & Logic</p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/50 w-fit px-4 py-2 rounded-lg backdrop-blur-sm group-hover:bg-white transition-colors">
              Explore <ChevronRight size={14} />
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setSelectedSubject('Science')}
            className="group relative h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-200 text-slate-900 p-3 text-left flex flex-col justify-between shadow-sm border border-slate-300"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Microscope size={160} />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <Microscope size={16} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest mb-1">Science</h3>
              <p className="text-[10px] font-black text-emerald-900/70 uppercase tracking-widest leading-relaxed">Nature & Energy</p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/50 w-fit px-4 py-2 rounded-lg backdrop-blur-sm group-hover:bg-white transition-colors">
              Explore <ChevronRight size={14} />
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setSelectedSubject('Social Studies')}
            className="group relative h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-100 to-red-200 text-slate-900 p-3 text-left flex flex-col justify-between shadow-sm border border-slate-300"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Globe size={160} />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <Globe size={16} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest mb-1">Social</h3>
              <p className="text-[10px] font-black text-orange-900/70 uppercase tracking-widest leading-relaxed">Community & Culture</p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/50 w-fit px-4 py-2 rounded-lg backdrop-blur-sm group-hover:bg-white transition-colors">
              Explore <ChevronRight size={14} />
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setSelectedSubject('ICT')}
            className="group relative h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-100 to-blue-200 text-slate-900 p-3 text-left flex flex-col justify-between shadow-sm border border-slate-300"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Monitor size={160} />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <Monitor size={16} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest mb-1">ICT</h3>
              <p className="text-[10px] font-black text-cyan-900/70 uppercase tracking-widest leading-relaxed">Coding & Digital</p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/50 w-fit px-4 py-2 rounded-lg backdrop-blur-sm group-hover:bg-white transition-colors">
              Explore <ChevronRight size={14} />
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setSelectedSubject('Civic Education')}
            className="group relative h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-200 text-slate-900 p-3 text-left flex flex-col justify-between shadow-sm border border-slate-300"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <ShieldCheck size={160} />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest mb-1">Civic</h3>
              <p className="text-[10px] font-black text-rose-900/70 uppercase tracking-widest leading-relaxed">Rights & Duties</p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/50 w-fit px-4 py-2 rounded-lg backdrop-blur-sm group-hover:bg-white transition-colors">
              Explore <ChevronRight size={14} />
            </div>
          </motion.button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => setSelectedSubject(null)}
              className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-white/40 hover:bg-white dark:bg-slate-900 hover:shadow-md transition-all text-slate-900 dark:text-slate-100 shadow-sm"
            >
              <ChevronRight size={20} className="rotate-180" />
            </motion.button>
            <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100">{selectedSubject} Lessons</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lessons.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm">
                <div className="w-20 h-20 bg-white dark:bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-900 dark:text-slate-100 shadow-sm border border-white">
                  <BookOpen size={40} />
                </div>
                <p className="text-slate-900 dark:text-slate-100 font-medium text-lg">No lessons available for your current class level ({classLevel}).</p>
                <p className="text-slate-900 dark:text-slate-100 font-medium mt-2">Check back later for new content!</p>
              </div>
            ) : (
              lessons.map((lesson, idx) => {
                const colors = ['bg-orange-100', 'bg-blue-100', 'bg-purple-100', 'bg-pink-100', 'bg-green-100'];
                const colorClass = colors[idx % colors.length];
                 return (
                   <motion.div 
                     key={idx}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 20 }}
                     whileHover={{ y: -5, scale: 1.02 }}
                     className={`${colorClass} p-3 rounded-2xl border border-white/40 shadow-sm transition-all group flex flex-col relative overflow-hidden`}
                   >
                     <div className="flex justify-between items-start mb-4 relative z-10">
                       <span className="text-[9px] font-black text-slate-900 bg-white/60 px-3 py-1 rounded-full uppercase tracking-widest border border-white/50 shadow-sm">{lesson.level}</span>
                       <div className="p-2 bg-white/60 text-slate-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100 border border-white/50 shadow-sm">
                         <Play size={14} fill="currentColor" />
                       </div>
                     </div>
                     <h4 className="text-lg font-black uppercase tracking-widest mb-1 text-slate-900 leading-tight relative z-10">{lesson.title}</h4>
                     <p className="text-[10px] text-slate-700 font-bold uppercase tracking-wide mb-6 line-clamp-2 flex-grow relative z-10">{lesson.content}</p>
                     <motion.button 
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       transition={{ type: "spring", stiffness: 400, damping: 17 }}
                       onClick={() => startLesson(lesson)}
                       className="w-full py-2.5 rounded-xl bg-white border border-white/50 text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-all shadow-sm relative z-10"
                     >
                       Start Lesson
                     </motion.button>
                   </motion.div>
                 );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
