import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trophy, RefreshCw, ArrowLeft, Clock, Move, ChevronRight, Eye } from "lucide-react";
import { addXP, saveMemoryFlipScore, getMemoryFlipLeaderboard } from "../../services/gamificationService";
import { UserProfile } from "../../types";
import { formatDisplayString } from "../../lib/utils";

const modes = {
  easy: { pairs: [3,4,5,6,6,7,7,8,8,9] },
  normal: { pairs: [4,5,6,7,8,9,10,10,11,12] },
  hard: { pairs: [5,6,7,8,9,10,12,12,14,16] }
};

const iconsPool = ["🍎","🍌","🍇","🍉","🍒","🍍","🥝","🍑","🥥","🍋","🍓","🥕","🍆","🌽","🥔","🍔","🍕","🍩"];

// 🔊 SOUND EFFECTS
const flipSound = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg");
const matchSound = new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
const winSound = new Audio("https://actions.google.com/sounds/v1/cartoon/concussive_hit_guitar_boing.ogg");

function shuffleCards(count: number) {
  const selected = iconsPool.sort(() => 0.5 - Math.random()).slice(0, count);
  return [...selected, ...selected]
    .sort(() => Math.random() - 0.5)
    .map((icon, index) => ({
      id: index,
      icon,
      flipped: true, // initially visible
      matched: false
    }));
}

interface MemoryFlipGameProps {
  user: UserProfile;
  onExit: () => void;
}

export const MemoryFlipGame: React.FC<MemoryFlipGameProps> = ({ user, onExit }) => {
  const [mode, setMode] = useState<"easy" | "normal" | "hard">("easy");
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState<any[]>([]);
  const [first, setFirst] = useState<any>(null);
  const [second, setSecond] = useState<any>(null);
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [preview, setPreview] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const totalPairs = modes[mode].pairs[level - 1];

  useEffect(() => {
    getMemoryFlipLeaderboard().then(setLeaderboard).catch(console.error);
  }, []);

  useEffect(() => {
    const newCards = shuffleCards(totalPairs);
    setCards(newCards);
    setPreview(true);
    setMoves(0);
    setMatches(0);
    setTime(0);
    setStarted(false);
    setCompleted(false);

    // preview phase
    const previewTimer = setTimeout(() => {
      setCards(prev => prev.map(c => ({ ...c, flipped: false })));
      setPreview(false);
    }, 2000);

    return () => clearTimeout(previewTimer);
  }, [mode, level, totalPairs]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (started && !completed) {
      timer = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [started, completed]);

  const flipCard = (card: any) => {
    if (lock || preview || card.flipped || card.matched) return;

    flipSound.play().catch(() => {});

    if (!started) setStarted(true);

    const updated = cards.map(c =>
      c.id === card.id ? { ...c, flipped: true } : c
    );
    setCards(updated);

    if (!first) {
      setFirst(card);
    } else {
      setSecond(card);
      setLock(true);
      setMoves(m => m + 1);
    }
  };

  useEffect(() => {
    if (first && second) {
      if (first.icon === second.icon) {
        matchSound.play().catch(() => {});
        setCards(prev =>
          prev.map(c =>
            c.icon === first.icon ? { ...c, matched: true } : c
          )
        );
        setMatches(m => m + 1);
        resetTurn();
      } else {
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === first.id || c.id === second.id
                ? { ...c, flipped: false }
                : c
            )
          );
          resetTurn();
        }, 700);
      }
    }
  }, [second]);

  useEffect(() => {
    if (matches === totalPairs && totalPairs > 0 && !completed) {
      setCompleted(true);
      winSound.play().catch(() => {});

      if (user.uid) {
        const xp = Math.max(60 - moves, 15);
        const coins = Math.max(40 - Math.floor(time / 2), 15);
        
        // Save to backend leaderboard
        saveMemoryFlipScore(user.uid, user.firstName, user.lastName, {
          level,
          mode,
          moves,
          time
        }).then(() => {
          getMemoryFlipLeaderboard().then(setLeaderboard).catch(console.error);
        }).catch(console.error);

        // Award XP and Coins
        addXP(user.uid, 'GAME_WIN', { 
          game: 'Memory Flip', 
          mode,
          level, 
          moves, 
          time,
          calculatedXp: xp,
          calculatedCoins: coins
        }).catch(console.error);
      }
    }
  }, [matches, totalPairs, completed, user.uid, user.firstName, user.lastName, mode, level, moves, time]);

  const resetTurn = () => {
    setFirst(null);
    setSecond(null);
    setLock(false);
  };

  const nextLevel = () => {
    if (level < 10) {
      setLevel(level + 1);
    }
  };

  const replayLevel = () => {
    // re-trigger useEffect by resetting state
    const newCards = shuffleCards(totalPairs);
    setCards(newCards);
    setPreview(true);
    setMoves(0);
    setMatches(0);
    setTime(0);
    setStarted(false);
    setCompleted(false);

    setTimeout(() => {
      setCards(prev => prev.map(c => ({ ...c, flipped: false })));
      setPreview(false);
    }, 2000);
  };

  if (completed) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-2xl border border-white/20 shadow-sm text-center max-w-md mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-amber-200 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm border border-yellow-200/50">
            <Trophy size={40} />
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">Level {level} Completed!</h2>
          <p className="text-gray-800 text-sm font-medium mb-6">Mode: <span className="capitalize">{mode}</span></p>
          
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-blue-50 border border-blue-100/50 p-3 rounded-xl">
              <p className="text-[10px] text-blue-600 font-medium uppercase tracking-widest mb-1">Moves</p>
              <p className="text-lg font-medium text-blue-700">{moves}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100/50 p-3 rounded-xl">
              <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-widest mb-1">Time</p>
              <p className="text-lg font-medium text-emerald-700">{time}s</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button 
              onClick={replayLevel}
              className="flex items-center justify-center gap-2 bg-white text-gray-800 hover:bg-gray-50 px-6 py-2 rounded-xl text-sm font-medium transition-all border border-gray-200"
            >
              <RefreshCw size={16} /> Replay
            </button>
            {level < 10 ? (
              <button 
                onClick={nextLevel}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
              >
                Next Level <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                onClick={onExit}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
              >
                Exit Game
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm max-w-2xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <button onClick={onExit} className="flex items-center gap-1.5 text-gray-800 hover:text-gray-800 transition-colors text-sm font-medium bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg">
          <ArrowLeft size={16} /> Exit
        </button>
        
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
          {(['easy', 'normal', 'hard'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setLevel(1); }}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                mode === m ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50' : 'text-gray-800 hover:text-gray-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="text-sm font-medium text-gray-800 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
          Level <span className="text-gray-800">{level}</span>/10
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-gray-800">
            <Move size={14} className="text-gray-800" />
            <span className="text-xs font-medium">{moves}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-800">
            <Clock size={14} className="text-gray-800" />
            <span className="text-xs font-medium">{time}s</span>
          </div>
        </div>
      </div>

      {preview && (
        <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 py-2 px-4 rounded-xl mb-6 border border-blue-100/50 animate-pulse">
          <Eye size={16} />
          <span className="text-sm font-medium">Memorize the cards...</span>
        </div>
      )}

      <div 
        className="grid gap-2 sm:gap-3 mx-auto"
        style={{ 
          gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(cards.length))}, minmax(0, 1fr))`,
          maxWidth: Math.ceil(Math.sqrt(cards.length)) * 80 + 'px'
        }}
      >
        {cards.map(card => (
          <div
            key={card.id}
            onClick={() => flipCard(card)}
            className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 cursor-pointer"
            style={{ perspective: 1000 }}
          >
            <motion.div
              className="w-full h-full relative preserve-3d transition-all duration-500"
              animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front of card (hidden when flipped) */}
              <div 
                className="absolute w-full h-full bg-blue-50 border border-blue-100 rounded-xl backface-hidden flex items-center justify-center shadow-sm hover:bg-blue-100 transition-colors"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-blue-200/50"></div>
              </div>
              
              {/* Back of card (visible when flipped) */}
              <div 
                className={`absolute w-full h-full rounded-xl backface-hidden flex items-center justify-center text-2xl sm:text-3xl shadow-sm border ${
                  card.matched ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'
                }`}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                {card.icon}
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      {/* 🏆 LEADERBOARD */}
      {leaderboard.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-800 mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-yellow-500" /> Global Top Scores
          </h4>
          <div className="space-y-2">
            {leaderboard.map((s, i) => (
              <div key={s.id || i} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-800' : i === 2 ? 'text-amber-600' : 'text-gray-800'}`}>
                    #{i + 1}
                  </span>
                  <span className="font-medium text-gray-800">
                    {formatDisplayString(s.firstName)} {formatDisplayString(s.lastName)} <span className="text-gray-800 font-medium text-xs ml-1">Lvl {s.level} ({s.mode})</span>
                  </span>
                </div>
                <div className="flex items-center gap-4 text-gray-800 font-medium text-xs">
                  <span>{s.moves} moves</span>
                  <span>{s.time}s</span>
                  <span className="text-blue-600 font-medium">{s.score} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
