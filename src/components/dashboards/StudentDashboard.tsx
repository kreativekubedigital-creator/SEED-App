import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, collection, getDocs, query, where, onSnapshot, doc } from '../../lib/compatibility';
import { UserProfile, Assignment, Subject, Announcement, Result, Challenge, School } from '../../types';
import { 
  Trophy, 
  Coins, 
  Flame, 
  LogOut, 
  BookOpen, 
  PenTool, 
  BrainCircuit, 
  Gamepad2, 
  MessageSquare, 
  ChevronRight, 
  TrendingUp, 
  Award, 
  BookMarked, 
  Bell,
  Calendar,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName } from '../../lib/utils';
import { StudentQuizzes } from './StudentQuizzes';
import { StudentGames } from './StudentGames';
import { AIStudyBuddy } from './AIStudyBuddy';
import { StudentLessons } from './StudentLessons';
import { StudentAssignments } from './StudentAssignments';
import { StudentResultView } from './StudentResultView';
import { getXPForLevel, updateStreak } from '../../services/gamificationService';
import ClassTimetable from './ClassTimetable';

export const StudentDashboard = ({ user, onLogout, school }: { user: UserProfile, onLogout: () => void, school?: School }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'lessons' | 'assignments' | 'quizzes' | 'games' | 'timetable' | 'ai_study_buddy' | 'results'>('overview');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeProgress, setChallengeProgress] = useState<Record<string, number>>({});
  const [classLevel, setClassLevel] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.uid) {
      updateStreak(user.uid).catch(console.error);
    }
  }, [user.uid]);

  useEffect(() => {
    if (!user.schoolId || !user.classId) {
      setLoading(false);
      return;
    }

    const unsubClass = onSnapshot(doc(db, 'schools', user.schoolId, 'classes', user.classId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setClassLevel(data.name || data.level || 'Unknown Class');
      } else {
        setClassLevel('Unassigned');
      }
    });

    const qSubjects = query(collection(db, 'schools', user.schoolId, 'subjects'), where('classId', '==', user.classId));
    const unsubSubjects = onSnapshot(qSubjects, (subjectSnap) => {
      const subjectsData = subjectSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
      setSubjects(sortByName(subjectsData));
    });

    const qAssignments = query(collection(db, 'schools', user.schoolId, 'assignments'), where('classId', '==', user.classId));
    const unsubAssignments = onSnapshot(qAssignments, (assignSnap) => {
      const assignmentsData = assignSnap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
      assignmentsData.sort((a, b) => {
        const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setAssignments(assignmentsData);
      setLoading(false);
    });

    const qAnnouncements = query(collection(db, 'schools', user.schoolId, 'announcements'));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      const filtered = all.filter(a => a.isSchoolWide || a.classId === user.classId || a.studentId === user.uid);
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAnnouncements(filtered.slice(0, 3));
    });

    const qResults = query(collection(db, 'schools', user.schoolId, 'results'), where('studentId', '==', user.uid));
    const unsubResults = onSnapshot(qResults, (snap) => {
      const resultsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Result));
      resultsData.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      setResults(resultsData);
    });

    const qChallenges = query(collection(db, 'schools', user.schoolId, 'challenges'), where('endDate', '>', new Date().toISOString()));
    const unsubChallenges = onSnapshot(qChallenges, (snap) => {
      const challengesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
      challengesData.sort((a, b) => a.title.localeCompare(b.title));
      setChallenges(challengesData);
    });

    return () => {
      unsubClass();
      unsubSubjects();
      unsubAssignments();
      unsubAnnouncements();
      unsubResults();
      unsubChallenges();
    };
  }, [user.schoolId, user.classId, user.uid]);

  // Separate effect for challenge progress to ensure it updates when challenges or user activities change
  useEffect(() => {
    const fetchProgress = async () => {
      if (!challenges || challenges.length === 0) return;
      const progressMap: Record<string, number> = {};
      
      try {
        const activitiesRef = collection(db, 'user_activities');
        for (const challenge of challenges) {
          const qAct = query(
            activitiesRef, 
            where('userId', '==', user.uid),
            where('type', '==', challenge.targetType === 'quiz' ? 'quiz_pass' : challenge.targetType === 'lesson' ? 'lesson_complete' : 'game_win')
          );
          const activitySnap = await getDocs(qAct);
          progressMap[challenge.id] = activitySnap.size;
        }
        setChallengeProgress(progressMap);
      } catch (error) {
        console.error("Error fetching challenge progress:", error);
      }
    };

    fetchProgress();
  }, [challenges, user.uid]);

  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BookMarked },
    { id: 'lessons', label: 'Lessons', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: PenTool },
    { id: 'quizzes', label: 'Quizzes', icon: BrainCircuit },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'ai_study_buddy', label: 'Study Buddy', icon: MessageSquare },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'results', label: 'Results', icon: Award },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-6 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
          ) : (
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-lg">S</div>
          )}
          <span className="font-black uppercase tracking-widest text-[10px] text-slate-900 truncate max-w-[150px]">{school?.name || 'SEEDD'}</span>
        </div>
        <button onClick={onLogout} className="p-3 bg-red-50 text-red-500 rounded-xl transition-all active:scale-95"><LogOut size={20} /></button>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
          <div className="flex items-center gap-6">
            <Link to="/profile" id="student_profile_link" className="relative group cursor-pointer">
              <div className="w-20 h-20 rounded-[2rem] bg-slate-900 flex items-center justify-center text-3xl font-black text-white shadow-2xl border-4 border-white group-hover:scale-105 transition-all">
                {user.firstName[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                  Hello, {user.firstName}!
                </h1>
                {school?.logoUrl && (
                  <img src={school.logoUrl} alt={school.name} className="w-8 h-8 rounded-lg object-cover opacity-20 grayscale" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 px-3 py-1 rounded-full shadow-lg shadow-slate-900/10">
                  {user.registrationNumber || 'Student Portal'}
                </span>
                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {classLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Premium Gamification Stats */}
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none flex items-center gap-3 bg-white p-4 rounded-2xl border border-white shadow-xl shadow-slate-200/40">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm border border-blue-100">
                <Trophy size={20} strokeWidth={3} />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">XP</p>
                <p className="text-sm font-black text-slate-900">{user.xp || 0}</p>
              </div>
            </div>
            <div className="flex-1 lg:flex-none flex items-center gap-3 bg-white p-4 rounded-2xl border border-white shadow-xl shadow-slate-200/40">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm border border-orange-100">
                <Coins size={20} strokeWidth={3} />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Coins</p>
                <p className="text-sm font-black text-slate-900">{user.coins || 0}</p>
              </div>
            </div>
            <div className="flex-1 lg:flex-none flex items-center gap-3 bg-white p-4 rounded-2xl border border-white shadow-xl shadow-slate-200/40">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm border border-rose-100">
                <Flame size={20} strokeWidth={3} />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Streak</p>
                <p className="text-sm font-black text-slate-900">{user.streakCount || 0}</p>
              </div>
            </div>
            <button 
              onClick={onLogout} 
              id="logout_btn"
              className="p-4 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl border border-white shadow-xl shadow-slate-200/40 transition-all active:scale-95 group"
            >
              <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 overflow-x-auto pb-6 mb-16 scrollbar-hide no-scrollbar scroll-smooth">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab_${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap shrink-0 border shadow-sm flex items-center gap-3 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xl shadow-slate-900/20 scale-105 z-10'
                  : 'bg-white text-slate-400 border-white hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <tab.icon size={14} strokeWidth={activeTab === tab.id ? 3 : 2} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content - Removed mode="wait" to prevent height collapse/scroll jumping */}
        <div className="min-h-[60vh] relative">
          <AnimatePresence initial={false}>
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-10"
            >
              {/* Left Column: Progress & Quick Actions */}
              <div className="lg:col-span-1 space-y-10">
                <motion.div className="bg-white/80 backdrop-blur-md p-10 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40 relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/5 rounded-full blur-[80px]"></div>
                  <div className="flex justify-between items-center mb-10 relative z-10">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                        <TrendingUp size={20} strokeWidth={3} />
                      </div>
                      Progress Track
                    </h3>
                  </div>
                  
                  <div className="space-y-10 relative z-10">
                    <div>
                      <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-4">
                        <span className="text-slate-900">Level {user.level || 1}</span>
                        <span className="text-blue-600">{user.xp || 0} / {getXPForLevel((user.level || 1) + 1)} XP</span>
                      </div>
                      <div className="h-4 bg-slate-50 rounded-full overflow-hidden p-1 border border-slate-100 shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((user.xp || 0) / getXPForLevel((user.level || 1) + 1)) * 100)}%` }}
                          className="h-full bg-slate-900 rounded-full shadow-lg"
                        />
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-4 text-center opacity-60">Gain XP by completing lessons and quizzes</p>
                    </div>
                  </div>
                </motion.div>

                <div className="grid grid-cols-2 gap-6">
                  <motion.div 
                    whileHover={{ y: -8, scale: 1.02 }}
                    onClick={() => setActiveTab('quizzes')}
                    className="bg-white p-8 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/40 cursor-pointer group transition-all"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-8 group-hover:scale-110 transition-transform border border-orange-100">
                      <BrainCircuit size={28} strokeWidth={3} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Practice</p>
                    <p className="text-xl font-black uppercase tracking-tighter text-slate-900">Quizzes</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -8, scale: 1.02 }}
                    onClick={() => setActiveTab('games')}
                    className="bg-white p-8 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/40 cursor-pointer group transition-all"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-8 group-hover:scale-110 transition-transform border border-purple-100">
                      <Gamepad2 size={28} strokeWidth={3} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Play</p>
                    <p className="text-xl font-black uppercase tracking-tighter text-slate-900">Games</p>
                  </motion.div>
                </div>
              </div>

              {/* Right Column: Assignments & Challenges */}
              <div className="lg:col-span-2 space-y-10">
                <motion.div className="bg-white/80 backdrop-blur-md p-10 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10">
                        <PenTool size={20} strokeWidth={3} />
                      </div>
                      Active Assignments
                    </h3>
                    <button onClick={() => setActiveTab('assignments')} className="text-[10px] font-black uppercase tracking-widest text-slate-900 hover:underline">View Ledger</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {assignments.filter(a => !(a as any).isSubmitted).slice(0, 4).map((assignment) => (
                      <motion.div 
                        key={assignment.id} 
                        whileHover={{ x: 8, scale: 1.02 }}
                        onClick={() => setActiveTab('assignments')}
                        className="flex items-center justify-between p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-2xl transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-sm border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                            <PenTool size={24} strokeWidth={2.5} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 truncate">{getSubjectName(assignment.subjectId)}</p>
                            <p className="text-sm font-black uppercase tracking-tighter text-slate-900 line-clamp-1">{assignment.title}</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-slate-200 group-hover:text-slate-900 transition-all shrink-0" />
                      </motion.div>
                    ))}
                    {assignments.filter(a => !(a as any).isSubmitted).length === 0 && (
                      <div className="col-span-full py-16 text-center bg-slate-50/50 rounded-[2.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center">
                        <CheckCircle2 size={40} className="text-emerald-500 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assignment Ledger is Empty!</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Challenges & Announcements Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="bg-white p-10 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-sm">
                          <Award size={20} strokeWidth={3} />
                        </div>
                        Live Challenges
                      </h3>
                    </div>
                    <div className="space-y-8">
                      {challenges.map((challenge) => {
                        const progress = Math.min(100, Math.round(((challengeProgress[challenge.id] || 0) / (challenge.targetCount || 1)) * 100));
                        return (
                          <div key={challenge.id} className="group">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                              <span className="text-slate-900 truncate max-w-[70%]">{challenge.title}</span>
                              <span className="text-orange-600">{progress}%</span>
                            </div>
                            <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-slate-900 rounded-full"
                              />
                            </div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-3 flex items-center gap-2">
                              <Coins size={10} /> Reward: {challenge.xpReward} XP
                            </p>
                          </div>
                        );
                      })}
                      {challenges.length === 0 && (
                        <div className="p-10 text-center bg-slate-50 rounded-[2rem] border border-slate-100 border-dashed">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No active challenges</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm">
                          <Bell size={20} strokeWidth={3} />
                        </div>
                        Bulletins
                      </h3>
                      <Link to="/announcements" className="text-[10px] font-black uppercase tracking-widest text-slate-900 hover:underline">History</Link>
                    </div>
                    <div className="space-y-5">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-white text-slate-900 rounded-full border border-slate-100 shadow-sm">
                              {announcement.isSchoolWide ? 'Global' : 'Class'}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                              <Clock size={10} /> {new Date(announcement.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-2 line-clamp-1">{announcement.title}</h4>
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed opacity-70">
                            {announcement.content.replace(/<[^>]*>?/gm, '')}
                          </p>
                        </div>
                      ))}
                      {announcements.length === 0 && (
                        <div className="p-10 text-center bg-slate-50 rounded-[2rem] border border-slate-100 border-dashed">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Bulletins clear</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'lessons' && (
            <motion.div key="lessons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudentLessons user={user} classLevel={classLevel} />
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudentResultView user={user} />
            </motion.div>
          )}

          {activeTab === 'assignments' && (
            <motion.div key="assignments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudentAssignments user={user} subjects={subjects} />
            </motion.div>
          )}

          {activeTab === 'quizzes' && (
            <motion.div key="quizzes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudentQuizzes user={user} subjects={subjects} classLevel={classLevel} />
            </motion.div>
          )}

          {activeTab === 'games' && (
            <motion.div key="games" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudentGames user={user} classLevel={classLevel} />
            </motion.div>
          )}

          {activeTab === 'timetable' && (
            <motion.div key="timetable" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white/80 backdrop-blur-md p-10 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40">
              <ClassTimetable user={user} mode="view" studentClassId={user.classId} />
            </motion.div>
          )}

          {activeTab === 'ai_study_buddy' && (
            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
              <AIStudyBuddy user={user} subjects={subjects} classLevel={classLevel} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  );
};

export default StudentDashboard;
