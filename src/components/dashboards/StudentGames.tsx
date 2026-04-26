import { useState, useEffect } from 'react';
import { db, doc, getDoc, updateDoc, increment, collection, onSnapshot } from '../../lib/compatibility';
import { UserProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, BookA, Trophy, RefreshCw, Play, Beaker, Star, ArrowLeft, TrendingUp, ShoppingBag, Award, Sparkles, Flame } from 'lucide-react';
import { addXP, getLeaderboard, purchaseItem } from '../../services/gamificationService';
import { MemoryFlipGame } from '../games/MemoryFlipGame';
import { cn } from '../../lib/utils';

type GameType = 'math' | 'word' | 'science' | 'memory' | null;

interface StudentGamesProps {
  user: UserProfile;
  classLevel?: string;
}

export const StudentGames = ({ user, classLevel: initialClassLevel }: StudentGamesProps) => {
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [classLevel, setClassLevel] = useState<string>(initialClassLevel || 'Primary 1');
  const [pointsEarned, setPointsEarned] = useState(0);

  const [gameTab, setGameTab] = useState<'play' | 'leaderboard' | 'rewards' | 'badges'>('play');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    if (gameTab === 'leaderboard' && user.schoolId) {
      getLeaderboard(user.schoolId).then(setLeaderboard).catch(console.error);
    }
  }, [gameTab, user.schoolId]);

  useEffect(() => {
    if (user.uid) {
      const unsubBadges = onSnapshot(collection(db, 'users', user.uid, 'badges'), (snap) => {
        setBadges(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubBadges();
    }
  }, [user.uid]);

  const handlePurchase = async (item: any) => {
    if (!user.uid) return;
    try {
      await purchaseItem(user.uid, item.id, item.price);
      alert(`Successfully purchased ${item.name}!`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Math Game State
  const [mathQuestion, setMathQuestion] = useState({ num1: 0, num2: 0, op: '+', answer: 0 });
  const [mathOptions, setMathOptions] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  // Word Game State
  const [wordQuestion, setWordQuestion] = useState({ word: '', missingIndex: 0, options: [] as string[] });
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  // Science Game State
  const [scienceQuestion, setScienceQuestion] = useState({ question: '', options: [] as string[], answer: '' });
  const [selectedScienceOption, setSelectedScienceOption] = useState<string | null>(null);

  const isSecondary = classLevel.toLowerCase().includes('secondary') || classLevel.toLowerCase().includes('jss');
  const levelNum = parseInt(classLevel.match(/\d+/)?.[0] || '1');

  const containerClass = "space-y-6";

  const generateMathQuestion = () => {
    let ops = ['+', '-'];
    if (levelNum > 2) ops.push('*');
    if (levelNum > 4 || isSecondary) ops.push('/');
    
    const op = ops[Math.floor(Math.random() * ops.length)];
    
    let range = levelNum * 10;
    if (isSecondary) range = 100;

    let num1 = Math.floor(Math.random() * range) + 1;
    let num2 = Math.floor(Math.random() * (levelNum * 5)) + 1;

    if (op === '-') {
      if (num1 < num2) [num1, num2] = [num2, num1];
    } else if (op === '/') {
      num1 = num1 * num2; // Ensure clean division
    }

    let answer = 0;
    if (op === '+') answer = num1 + num2;
    if (op === '-') answer = num1 - num2;
    if (op === '*') answer = num1 * num2;
    if (op === '/') answer = num1 / num2;

    const options = [answer];
    while (options.length < 4) {
      const offset = Math.floor(Math.random() * 10) + 1;
      const wrongAnswer = Math.random() > 0.5 ? answer + offset : answer - offset;
      if (!options.includes(wrongAnswer) && wrongAnswer >= 0) {
        options.push(wrongAnswer);
      }
    }

    setMathQuestion({ num1, num2, op, answer });
    setMathOptions(options.sort(() => Math.random() - 0.5));
    setSelectedAnswer(null);
  };

  const generateWordQuestion = () => {
    const primaryWords = ['APPLE', 'BANANA', 'ORANGE', 'SCHOOL', 'TEACHER', 'STUDENT', 'PENCIL', 'BOOK', 'COMPUTER', 'SCIENCE', 'GARDEN', 'FLOWER', 'ANIMAL', 'RIVER', 'MOUNTAIN'];
    const secondaryWords = ['PHOTOSYNTHESIS', 'EQUATION', 'LITERATURE', 'GEOGRAPHY', 'CHEMISTRY', 'BIOLOGY', 'PHYSICS', 'ALGEBRA', 'GEOMETRY', 'HISTORY', 'METAPHOR', 'OSMOSIS', 'DEMOCRACY', 'EVOLUTION', 'GRAVITY'];
    
    const words = isSecondary ? secondaryWords : primaryWords;
    const word = words[Math.floor(Math.random() * words.length)];
    const missingIndex = Math.floor(Math.random() * word.length);
    const missingLetter = word[missingIndex];

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const options = [missingLetter];
    while (options.length < 4) {
      const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
      if (!options.includes(randomLetter)) {
        options.push(randomLetter);
      }
    }

    setWordQuestion({ word, missingIndex, options: options.sort(() => Math.random() - 0.5) });
    setSelectedLetter(null);
  };

  const generateScienceQuestion = () => {
    const primaryScience = [
      { q: "What do plants need to grow?", a: "Sunlight", o: ["Rocks", "Ice", "Darkness"] },
      { q: "Which planet is known as the Red Planet?", a: "Mars", o: ["Venus", "Jupiter", "Saturn"] },
      { q: "What is the boiling point of water?", a: "100°C", o: ["0°C", "50°C", "200°C"] },
      { q: "Which animal is a mammal?", a: "Whale", o: ["Shark", "Snake", "Eagle"] },
      { q: "What part of the plant is underground?", a: "Roots", o: ["Leaves", "Stem", "Flowers"] },
      { q: "Which of these is a source of light?", a: "The Sun", o: ["The Moon", "A Mirror", "A Rock"] },
      { q: "What do we use to breathe?", a: "Lungs", o: ["Heart", "Stomach", "Brain"] },
      { q: "Which sense do we use to hear?", a: "Hearing", o: ["Sight", "Touch", "Smell"] },
      { q: "What is the solid form of water?", a: "Ice", o: ["Steam", "Rain", "Mist"] },
      { q: "Which animal lays eggs?", a: "Chicken", o: ["Dog", "Cat", "Lion"] }
    ];

    const secondaryScience = [
      { q: "What is the powerhouse of the cell?", a: "Mitochondria", o: ["Nucleus", "Ribosome", "Vacuole"] },
      { q: "What is the chemical symbol for Gold?", a: "Au", o: ["Ag", "Fe", "Pb"] },
      { q: "What is the speed of light?", a: "300,000 km/s", o: ["150,000 km/s", "500,000 km/s", "1,000,000 km/s"] },
      { q: "Which gas do plants absorb during photosynthesis?", a: "Carbon Dioxide", o: ["Oxygen", "Nitrogen", "Hydrogen"] },
      { q: "What is the unit of force?", a: "Newton", o: ["Joule", "Watt", "Pascal"] },
      { q: "What is the atomic number of Hydrogen?", a: "1", o: ["2", "3", "4"] },
      { q: "Which planet has the most moons?", a: "Saturn", o: ["Jupiter", "Mars", "Earth"] },
      { q: "What is the most abundant gas in Earth's atmosphere?", a: "Nitrogen", o: ["Oxygen", "Carbon Dioxide", "Argon"] },
      { q: "Who proposed the theory of relativity?", a: "Einstein", o: ["Newton", "Darwin", "Galileo"] },
      { q: "What is the pH of pure water?", a: "7", o: ["0", "14", "1"] }
    ];

    const questions = isSecondary ? secondaryScience : primaryScience;
    const qData = questions[Math.floor(Math.random() * questions.length)];
    
    setScienceQuestion({
      question: qData.q,
      answer: qData.a,
      options: [qData.a, ...qData.o].sort(() => Math.random() - 0.5)
    });
    setSelectedScienceOption(null);
  };

  const startGame = (type: GameType) => {
    setActiveGame(type);
    setScore(0);
    setQuestionCount(0);
    setGameOver(false);
    setPointsEarned(0);
    if (type === 'math') generateMathQuestion();
    if (type === 'word') generateWordQuestion();
    if (type === 'science') generateScienceQuestion();
  };

  const handleFinishGame = async (finalScore: number) => {
    const points = finalScore * 5; // 5 points per correct answer
    setPointsEarned(points);
    setGameOver(true);

    if (user.uid) {
      try {
        // Award XP
        if (finalScore >= 5) {
          addXP(user.uid, 'GAME_WIN', { gameType: activeGame, score: finalScore }).catch(console.error);
        }
      } catch (error) {
        console.error("Error updating points:", error);
      }
    }
  };

  const handleMathAnswer = (option: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
    
    setTimeout(() => {
      const isCorrect = option === mathQuestion.answer;
      if (isCorrect) setScore(s => s + 1);
      
      if (questionCount >= 9) {
        handleFinishGame(isCorrect ? score + 1 : score);
      } else {
        setQuestionCount(c => c + 1);
        generateMathQuestion();
      }
    }, 1000);
  };

  const handleWordAnswer = (option: string) => {
    if (selectedLetter !== null) return;
    setSelectedLetter(option);
    
    setTimeout(() => {
      const isCorrect = option === wordQuestion.word[wordQuestion.missingIndex];
      if (isCorrect) setScore(s => s + 1);
      
      if (questionCount >= 9) {
        handleFinishGame(isCorrect ? score + 1 : score);
      } else {
        setQuestionCount(c => c + 1);
        generateWordQuestion();
      }
    }, 1000);
  };

  const handleScienceAnswer = (option: string) => {
    if (selectedScienceOption !== null) return;
    setSelectedScienceOption(option);
    
    setTimeout(() => {
      const isCorrect = option === scienceQuestion.answer;
      if (isCorrect) setScore(s => s + 1);
      
      if (questionCount >= 9) {
        handleFinishGame(isCorrect ? score + 1 : score);
      } else {
        setQuestionCount(c => c + 1);
        generateScienceQuestion();
      }
    }, 1000);
  };

  if (activeGame && gameOver) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-white/20 shadow-sm text-center max-w-2xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-200/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <div className="relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-100 to-amber-200 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-yellow-200/50">
            <Trophy size={48} />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-slate-100 mb-3">Game Over!</h2>
          <p className="text-slate-900/60 dark:text-slate-400 font-black uppercase tracking-widest mb-8 text-[10px]">Great job exercising your brain.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-blue-50 border border-blue-100/50 p-4 rounded-2xl">
              <p className="text-sm text-blue-700 font-medium uppercase tracking-widest mb-2">Final Score</p>
              <p className="text-xl font-medium text-blue-600 drop-shadow-sm">{score} <span className="text-2xl text-blue-400">/ 10</span></p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100/50 p-4 rounded-2xl">
              <p className="text-sm text-emerald-700 font-medium uppercase tracking-widest mb-2">Points Earned</p>
              <p className="text-xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 drop-shadow-sm">+{pointsEarned}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => startGame(activeGame)}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-8 py-2.5 rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all"
            >
              <RefreshCw size={20} /> Play Again
            </button>
            <button 
              onClick={() => setActiveGame(null)}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-8 py-2.5 rounded-full font-medium hover:bg-slate-50 dark:bg-slate-800 transition-all border border-gray-200 shadow-sm hover:shadow-md"
            >
              Choose Another Game
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (activeGame === 'memory') {
    return <MemoryFlipGame user={user} onExit={() => setActiveGame(null)} />;
  }

  if (activeGame === 'math') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 p-4 md:p-4 rounded-2xl border border-white/20 shadow-sm max-w-2xl mx-auto text-center">
        <div className="flex justify-between items-center mb-12">
          <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:text-slate-100 transition-colors font-medium bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-white/40 shadow-sm px-3.5 py-1.5 rounded-full">
            <ArrowLeft size={20} /> Exit
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-orange-500 font-medium bg-orange-50/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-orange-100/50">
              <Star size={18} fill="currentColor" /> {score * 5}
            </div>
            <span className="text-sm bg-blue-50/80 backdrop-blur-sm text-blue-600 px-3.5 py-1.5 rounded-full font-medium border border-blue-100/50">
              Question {questionCount + 1}/10
            </span>
          </div>
        </div>

        <div className="text-6xl md:text-7xl font-medium mb-16 tracking-tight text-slate-900 dark:text-slate-100 drop-shadow-sm">
          {mathQuestion.num1} <span className="text-blue-600">{mathQuestion.op}</span> {mathQuestion.num2} = ?
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-4">
          {mathOptions.map((option, i) => {
            let btnClass = "p-4 rounded-2xl text-xl font-medium border transition-all ";
            if (selectedAnswer === null) {
              btnClass += "border-white/40 hover:border-blue-400/50 hover:bg-white dark:bg-slate-900/80 hover:text-blue-600 hover:shadow-md bg-white dark:bg-slate-900/60 backdrop-blur-sm text-slate-900 dark:text-slate-100 shadow-sm";
            } else if (option === mathQuestion.answer) {
              btnClass += "border-emerald-500 bg-emerald-50/80 text-emerald-600 shadow-sm";
            } else if (option === selectedAnswer) {
              btnClass += "border-red-500 bg-red-50/80 text-red-600 shadow-sm";
            } else {
              btnClass += "border-white/20 opacity-50 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100";
            }

            return (
              <motion.button
                whileHover={selectedAnswer === null ? { scale: 1.02 } : {}}
                whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                key={i}
                disabled={selectedAnswer !== null}
                onClick={() => handleMathAnswer(option)}
                className={btnClass}
              >
                {option}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  if (activeGame === 'word') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 p-4 md:p-4 rounded-2xl border border-white/20 shadow-sm max-w-2xl mx-auto text-center">
        <div className="flex justify-between items-center mb-12">
          <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:text-slate-100 transition-colors font-medium bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-white/40 shadow-sm px-3.5 py-1.5 rounded-full">
            <ArrowLeft size={20} /> Exit
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-orange-500 font-medium bg-orange-50/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-orange-100/50">
              <Star size={18} fill="currentColor" /> {score * 5}
            </div>
            <span className="text-sm bg-purple-50/80 backdrop-blur-sm text-purple-600 px-3.5 py-1.5 rounded-full font-medium border border-purple-100/50">
              Question {questionCount + 1}/10
            </span>
          </div>
        </div>

        <div className="text-5xl md:text-6xl font-medium mb-16 tracking-widest text-slate-900 dark:text-slate-100 flex justify-center gap-3 md:gap-4 flex-wrap drop-shadow-sm">
          {wordQuestion.word.split('').map((char, i) => (
            <span key={i} className={`inline-block w-14 md:w-16 h-20 md:h-24 border-b-4 flex items-center justify-center rounded-t-xl ${i === wordQuestion.missingIndex ? 'border-purple-500 text-purple-600 bg-purple-50/80 backdrop-blur-sm' : 'border-gray-200/50 bg-white dark:bg-slate-900/60 backdrop-blur-sm shadow-sm'}`}>
              {i === wordQuestion.missingIndex ? (selectedLetter || '?') : char}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-4">
          {wordQuestion.options.map((option, i) => {
            let btnClass = "p-4 rounded-2xl text-xl font-medium border transition-all ";
            if (selectedLetter === null) {
              btnClass += "border-white/40 hover:border-purple-400/50 hover:bg-white dark:bg-slate-900/80 hover:text-purple-600 hover:shadow-md bg-white dark:bg-slate-900/60 backdrop-blur-sm text-slate-900 dark:text-slate-100 shadow-sm";
            } else if (option === wordQuestion.word[wordQuestion.missingIndex]) {
              btnClass += "border-emerald-500 bg-emerald-50/80 text-emerald-600 shadow-sm";
            } else if (option === selectedLetter) {
              btnClass += "border-red-500 bg-red-50/80 text-red-600 shadow-sm";
            } else {
              btnClass += "border-white/20 opacity-50 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100";
            }

            return (
              <motion.button
                whileHover={selectedLetter === null ? { scale: 1.02 } : {}}
                whileTap={selectedLetter === null ? { scale: 0.98 } : {}}
                key={i}
                disabled={selectedLetter !== null}
                onClick={() => handleWordAnswer(option)}
                className={btnClass}
              >
                {option}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  if (activeGame === 'science') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 p-4 md:p-4 rounded-2xl border border-white/20 shadow-sm max-w-2xl mx-auto text-center">
        <div className="flex justify-between items-center mb-12">
          <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:text-slate-100 transition-colors font-medium bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-white/40 shadow-sm px-3.5 py-1.5 rounded-full">
            <ArrowLeft size={20} /> Exit
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-orange-500 font-medium bg-orange-50/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-orange-100/50">
              <Star size={18} fill="currentColor" /> {score * 5}
            </div>
            <span className="text-sm bg-emerald-50/80 backdrop-blur-sm text-emerald-600 px-3.5 py-1.5 rounded-full font-medium border border-emerald-100/50">
              Question {questionCount + 1}/10
            </span>
          </div>
        </div>

        <div className="text-xl font-medium mb-12 text-slate-900 dark:text-slate-100 leading-snug">
          {scienceQuestion.question}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {scienceQuestion.options.map((option, i) => {
            let btnClass = "p-4 rounded-2xl text-xl font-medium border transition-all text-left flex items-center justify-between ";
            if (selectedScienceOption === null) {
              btnClass += "border-white/40 hover:border-emerald-400/50 hover:bg-white dark:bg-slate-900/80 hover:text-emerald-700 hover:shadow-md bg-white dark:bg-slate-900/60 backdrop-blur-sm text-slate-900 dark:text-slate-100 shadow-sm";
            } else if (option === scienceQuestion.answer) {
              btnClass += "border-emerald-500 bg-emerald-50/80 text-emerald-600 shadow-sm";
            } else if (option === selectedScienceOption) {
              btnClass += "border-red-500 bg-red-50/80 text-red-600 shadow-sm";
            } else {
              btnClass += "border-white/20 opacity-50 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100";
            }

            return (
              <motion.button
                whileHover={selectedScienceOption === null ? { scale: 1.01 } : {}}
                whileTap={selectedScienceOption === null ? { scale: 0.99 } : {}}
                key={i}
                disabled={selectedScienceOption !== null}
                onClick={() => handleScienceAnswer(option)}
                className={btnClass}
              >
                <span>{option}</span>
                {selectedScienceOption !== null && option === scienceQuestion.answer && (
                  <Star size={20} fill="currentColor" className="text-yellow-400 drop-shadow-sm" />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap bg-white dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-gray-200/50 bg-slate-50 dark:bg-slate-800/50 w-fit">
        {(['play', 'leaderboard', 'rewards', 'badges'] as const).map((tab, index) => {
          const colors = ['bg-orange-100', 'bg-blue-100', 'bg-purple-100', 'bg-pink-100'];
          const colorClass = colors[index % colors.length];
          return (
            <button
              key={tab}
              onClick={() => setGameTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                gameTab === tab ? `${colorClass} text-slate-900 shadow-md` : 'text-slate-900/40 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {gameTab === 'play' && (
        <>
          <div className="bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400 p-4 rounded-2xl text-slate-900 dark:text-slate-100 overflow-hidden relative shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white dark:bg-slate-900/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>
            
            <div className="relative z-10 text-center">
              <h2 className="text-5xl font-black uppercase tracking-tighter mb-6 drop-shadow-sm">Brain Games</h2>
              <p className="text-xl text-blue-900 max-w-2xl mx-auto leading-relaxed font-medium">
                Sharpen your mind, reinforce your learning, and earn points for your profile. 
                Games are tailored to your level: <span className="font-medium text-slate-900 dark:text-slate-100 underline decoration-blue-200/50 underline-offset-4">{classLevel}</span>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-orange-100 p-4 rounded-2xl border border-white/40 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col relative overflow-hidden" 
              onClick={() => startGame('math')}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900/40 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="w-20 h-20 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 shadow-sm group-hover:shadow-md group-hover:scale-110 border border-white/50 relative z-10">
                <Calculator size={40} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-3 group-hover:text-slate-900 dark:text-slate-100 transition-colors relative z-10">Math Ninja</h3>
              <p className="text-gray-700 font-medium mb-8 flex-1 leading-relaxed relative z-10">Quick-fire arithmetic challenges. Addition, subtraction, and more based on your grade.</p>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-sm font-medium text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200/50">Math</span>
                <button className="w-10 h-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-full flex items-center justify-center group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-800/50 group-hover:border-transparent">
                  <Play size={20} fill="currentColor" className="ml-1" />
                </button>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-blue-100 p-4 rounded-2xl border border-white/40 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col relative overflow-hidden" 
              onClick={() => startGame('word')}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900/40 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="w-20 h-20 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 shadow-sm group-hover:shadow-md group-hover:scale-110 border border-white/50 relative z-10">
                <BookA size={40} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-3 group-hover:text-slate-900 dark:text-slate-100 transition-colors relative z-10">Word Wizard</h3>
              <p className="text-gray-700 font-medium mb-8 flex-1 leading-relaxed relative z-10">Vocabulary and spelling puzzles. Find the missing letters in academic and common words.</p>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900/60 px-4 py-1.5 rounded-full border border-white/50">English</span>
                <button className="w-10 h-10 bg-white dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 rounded-full flex items-center justify-center hover:bg-white dark:bg-slate-900/60 transition-all shadow-sm border border-white/50">
                  <Play size={20} fill="currentColor" className="ml-1" />
                </button>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-purple-100 p-4 rounded-2xl border border-white/40 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col relative overflow-hidden" 
              onClick={() => startGame('science')}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900/40 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="w-20 h-20 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 shadow-sm group-hover:shadow-md group-hover:scale-110 border border-white/50 relative z-10">
                <Beaker size={40} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-3 group-hover:text-slate-900 dark:text-slate-100 transition-colors relative z-10">Science Explorer</h3>
              <p className="text-gray-700 font-medium mb-8 flex-1 leading-relaxed relative z-10">Discover the wonders of science. Biology, Chemistry, and Physics concepts made fun.</p>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900/60 px-4 py-1.5 rounded-full border border-white/50">Science</span>
                <button className="w-10 h-10 bg-white dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 rounded-full flex items-center justify-center hover:bg-white dark:bg-slate-900/60 transition-all shadow-sm border border-white/50">
                  <Play size={20} fill="currentColor" className="ml-1" />
                </button>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-pink-100 p-4 rounded-2xl border border-white/40 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col relative overflow-hidden" 
              onClick={() => startGame('memory')}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900/40 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="w-20 h-20 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 shadow-sm group-hover:shadow-md group-hover:scale-110 border border-white/50 relative z-10">
                <Star size={40} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-3 group-hover:text-slate-900 dark:text-slate-100 transition-colors relative z-10">Memory Flip</h3>
              <p className="text-gray-700 font-medium mb-8 flex-1 leading-relaxed relative z-10">Train your memory and focus with this classic card matching game. Earn XP and Coins!</p>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900/60 px-4 py-1.5 rounded-full border border-white/50">Focus</span>
                <button className="w-10 h-10 bg-white dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 rounded-full flex items-center justify-center hover:bg-white dark:bg-slate-900/60 transition-all shadow-sm border border-white/50">
                  <Play size={20} fill="currentColor" className="ml-1" />
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {gameTab === 'leaderboard' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} />
              School Leaderboard
            </h3>
          </div>
          <div className="bg-white dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-white/50 bg-white dark:bg-slate-900/50">
              <div className="grid grid-cols-12 text-xs font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                <div className="col-span-1">Rank</div>
                <div className="col-span-7">Student</div>
                <div className="col-span-2 text-right">Level</div>
                <div className="col-span-2 text-right">XP</div>
              </div>
            </div>
            <div className="divide-y divide-white/50">
              {leaderboard.map((u, i) => (
                <div key={u.id} className={cn(
                  "grid grid-cols-12 items-center p-4 transition-colors",
                  u.uid === user.uid ? "bg-blue-50/50" : "hover:bg-white dark:bg-slate-900/50"
                )}>
                  <div className="col-span-1 font-medium text-slate-900 dark:text-slate-100">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="col-span-7 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{u.firstName} {u.lastName}</p>
                      <p className="text-[10px] text-slate-900 dark:text-slate-100 uppercase tracking-wider">{u.registrationNumber || 'Student'}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-right font-medium text-slate-900 dark:text-slate-100 text-sm">{u.level || 1}</div>
                  <div className="col-span-2 text-right font-medium text-blue-600 text-sm">{u.xp || 0}</div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="p-12 text-center text-slate-900 dark:text-slate-100">
                  No data available yet.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {gameTab === 'rewards' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShoppingBag className="text-purple-600" size={20} />
              Rewards Store
            </h3>
            <div className="bg-purple-50 px-4 py-2 rounded-xl border border-purple-100 flex items-center gap-2">
              <span className="text-sm font-medium text-purple-700">{user.coins || 0} 🪙</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'gold_frame', name: 'Golden Avatar Frame', price: 500, icon: Award, colorClass: 'bg-yellow-100 text-slate-900 dark:text-slate-100', description: 'A shiny gold border for your avatar.' },
              { id: 'premium_theme', name: 'Premium Theme', price: 1000, icon: Sparkles, colorClass: 'bg-purple-100 text-slate-900 dark:text-slate-100', description: 'Unlock a premium dark mode interface.' },
              { id: 'early_access', name: 'Early Access Badge', price: 250, icon: Star, colorClass: 'bg-blue-100 text-slate-900 dark:text-slate-100', description: 'Show off your early supporter status.' },
              { id: 'streak_freeze', name: 'Streak Freeze', price: 200, icon: Flame, colorClass: 'bg-orange-100 text-slate-900 dark:text-slate-100', description: 'Protect your streak for one missed day.' },
              { id: 'xp_booster', name: 'XP Booster', price: 300, icon: TrendingUp, colorClass: 'bg-green-100 text-slate-900 dark:text-slate-100', description: 'Earn 2x XP for the next 24 hours.' },
              { id: 'mystery_box', name: 'Mystery Box', price: 400, icon: ShoppingBag, colorClass: 'bg-pink-100 text-slate-900 dark:text-slate-100', description: 'Win a random rare reward!' },
            ].map(item => {
              const isPurchased = user.purchasedItems?.includes(item.id);
              return (
                <div key={item.id} className="bg-white dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-3xl border border-white/50 shadow-sm flex flex-col gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", item.colorClass)}>
                    <item.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">{item.name}</h4>
                    <p className="text-xs text-slate-900 dark:text-slate-100 mt-1">{item.description}</p>
                  </div>
                  <button 
                    disabled={isPurchased || (user.coins || 0) < item.price}
                    onClick={() => handlePurchase(item)}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                      isPurchased 
                        ? "bg-green-50 text-green-600 cursor-default" 
                        : (user.coins || 0) >= item.price
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95"
                          : "bg-gray-100 text-slate-900 dark:text-slate-100 cursor-not-allowed"
                    )}
                  >
                    {isPurchased ? 'Owned' : `${item.price} 🪙 Buy Now`}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {gameTab === 'badges' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="text-yellow-600" size={20} />
              Achievements & Badges
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {badges.map((badge, index) => {
              const colors = ['bg-orange-100', 'bg-blue-100', 'bg-purple-100', 'bg-pink-100', 'bg-green-100'];
              const colorClass = colors[index % colors.length];
              return (
                <motion.div 
                  key={badge.id} 
                  whileHover={{ y: -5 }}
                  className={`${colorClass} p-6 rounded-3xl border border-white/50 shadow-sm flex flex-col items-center text-center gap-3 relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white dark:bg-slate-900/40 rounded-full blur-2xl -mr-8 -mt-8"></div>
                  <div className="text-5xl mb-2 relative z-10">{badge.icon}</div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm relative z-10">{badge.title}</h4>
                  <p className="text-[10px] text-gray-700 leading-tight relative z-10">{badge.description}</p>
                  <div className="mt-auto pt-3 text-[8px] text-gray-600 uppercase tracking-widest relative z-10">
                    Earned {new Date(badge.earnedAt?.toDate()).toLocaleDateString()}
                  </div>
                </motion.div>
              );
            })}
            {badges.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/50">
                <div className="w-20 h-20 bg-white dark:bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-900 dark:text-slate-100 border border-white/50">
                  <Award size={40} />
                </div>
                <p className="text-slate-900 dark:text-slate-100 font-medium">You haven't earned any badges yet. Keep studying!</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
