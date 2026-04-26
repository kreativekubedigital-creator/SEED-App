import { useState, useEffect } from'react';
import { Link } from'react-router-dom';
import { db, collection, getDocs, query, where, onSnapshot, doc, orderBy } from'../../lib/compatibility';
import { UserProfile, Assignment, Subject, Class, Announcement, Result, Challenge } from'../../types';
import { 
  Trophy, 
  Coins, 
  Flame, 
  LogOut, 
  Layout, 
  BookOpen, 
  PenTool, 
  BrainCircuit, 
  Gamepad2, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Calendar,
  ChevronRight,
  TrendingUp,
  Award,
  BookMarked
} from 'lucide-react';
import { motion, AnimatePresence } from'motion/react';
import { cn, sortByName } from'../../lib/utils';
import { StudentQuizzes } from'./StudentQuizzes';
import { StudentGames } from'./StudentGames';
import { AIStudyBuddy } from'./AIStudyBuddy';
import { StudentLessons } from'./StudentLessons';
import { StudentAssignments } from'./StudentAssignments';
import { StudentResultView } from'./StudentResultView';
import { getXPForLevel, updateStreak } from'../../services/gamificationService';
import ClassTimetable from'./ClassTimetable';

export const StudentDashboard = ({ user, onLogout }: { user: UserProfile, onLogout: () => void }) => {
 const [activeTab, setActiveTab] = useState<'overview'|'lessons'|'assignments'|'quizzes'|'games'|'timetable'|'ai_study_buddy'|'results'>('overview');
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

 // Fetch class level
 const unsubClass = onSnapshot(doc(db,'schools', user.schoolId,'classes', user.classId), (docSnap) => {
 if (docSnap.exists()) {
 const data = docSnap.data();
 setClassLevel(data.name || data.level ||'Unknown Class');
 } else {
 setClassLevel('Unassigned');
 }
 });

 const qSubjects = query(collection(db,'schools', user.schoolId,'subjects'), where('classId','==', user.classId));
 const unsubSubjects = onSnapshot(qSubjects, (subjectSnap) => {
 const subjectsData = subjectSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
 setSubjects(sortByName(subjectsData));
 });

 const qAssignments = query(collection(db,'schools', user.schoolId,'assignments'), where('classId','==', user.classId));
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

 const qAnnouncements = query(
 collection(db,'schools', user.schoolId,'announcements')
 );
 const unsubAnnouncements = onSnapshot(qAnnouncements, (snap) => {
 const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
 const filtered = all.filter(a => a.isSchoolWide || a.classId === user.classId || a.studentId === user.uid);
 filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
 setAnnouncements(filtered.slice(0, 3));
 });

 const qResults = query(collection(db,'schools', user.schoolId,'results'), where('studentId','==', user.uid));
 const unsubResults = onSnapshot(qResults, (snap) => {
 const resultsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Result));
 resultsData.sort((a, b) => {
 const dateA = a.date ? new Date(a.date).getTime() : 0;
 const dateB = b.date ? new Date(b.date).getTime() : 0;
 return dateB - dateA;
 });
 setResults(resultsData);
 });

 const qChallenges = query(collection(db,'schools', user.schoolId,'challenges'), where('endDate','>', new Date().toISOString()));
 const unsubChallenges = onSnapshot(qChallenges, async (snap) => {
 const challengesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
 challengesData.sort((a, b) => a.title.localeCompare(b.title));
 setChallenges(challengesData);
 
 // Calculate progress for each challenge
 const progressMap: Record<string, number> = {};
 for (const challenge of challengesData) {
 const activitiesRef = collection(db,'users', user.uid,'activities');
 const q = query(
 activitiesRef, 
 where('type','==', challenge.targetType  === 'quiz'?'quiz_pass': challenge.targetType  === 'lesson'?'lesson_complete':'game_win')
 );
 const activitySnap = await getDocs(q);
 // Simplified: just counting total activities of that type. 
 // In a real app, we'd filter by date range of the challenge.
 progressMap[challenge.id] = activitySnap.size;
 }
 setChallengeProgress(progressMap);
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

 const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name ||'Unknown Subject';
 const handleLogout = () => onLogout();

 const TABS = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'lessons', label: 'Lessons', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: PenTool },
    { id: 'quizzes', label: 'Quizzes', icon: BrainCircuit },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'ai_study_buddy', label: 'AI Study Buddy', icon: MessageSquare },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'results', label: 'Results', icon: Award },
  ];

  const renderTabButton = (tabId: string, label: string, Icon: any) => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setActiveTab(tabId as any)}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${
        activeTab === tabId 
          ? 'bg-white text-slate-900 shadow-md' 
          : 'text-slate-900/40 hover:text-slate-900 hover:bg-white/40'
      }`}
    >
      <Icon size={14} className={activeTab === tabId ? 'text-blue-600' : ''} />
      {label}
    </motion.button>
  );

 const isFemale = user.gender  === 'female';

 return (
    <div className={`min-h-screen ${isFemale ? 'bg-gradient-to-br from-[#FFD1D1] via-[#FFF3E0] to-[#E0F7FA]' : 'bg-[#020617]'}`}>
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xs">S</div>
          <span className="font-black uppercase tracking-tighter text-slate-900">SEEDD</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-900/60"><LogOut size={20} /></button>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-lg border-2 border-white/20">
                {user.firstName[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                Welcome, {user.firstName} {user.lastName}!
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 bg-slate-900/5 px-2 py-0.5 rounded">
                  {user.registrationNumber || 'Student ID'}
                </span>
                <div className="w-1 h-1 bg-slate-900/20 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                  {classLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Trophy size={18} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-900/40 leading-none">XP Points</p>
                  <p className="text-sm font-black text-slate-900">{user.xp || 0}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 lg:flex-none bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <Coins size={18} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-900/40 leading-none">Coins</p>
                  <p className="text-sm font-black text-slate-900">{user.coins || 0}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 lg:flex-none bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                  <Flame size={18} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-900/40 leading-none">Streak</p>
                  <p className="text-sm font-black text-slate-900">{user.streakCount || 0}</p>
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="hidden lg:flex w-11 h-11 items-center justify-center rounded-2xl bg-slate-900/5 hover:bg-rose-50 text-slate-900/40 hover:text-rose-600 transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-900/5 p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
          {TABS.map(tab => renderTabButton(tab.id, tab.label, tab.icon))}
        </div>

 { activeTab  === 'overview'&& (
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
   <div className="lg:col-span-1 space-y-6">
     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-sm">
       <div className="flex justify-between items-center mb-6">
         <h3 className="text-sm font-black uppercase tracking-widest text-slate-900/40 flex items-center gap-2">
           <TrendingUp size={16} className="text-blue-600" /> Your Progress
         </h3>
         <ChevronRight size={16} className="text-slate-900/20" />
       </div>
       
       <div className="space-y-6">
         <div>
           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
             <span className="text-slate-900/60">Level {user.level || 1}</span>
             <span className="text-blue-600">{user.xp || 0} / {getXPForLevel((user.level || 1) + 1)} XP</span>
           </div>
           <div className="h-2.5 bg-slate-900/5 rounded-full overflow-hidden p-0.5 border border-slate-900/5">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${Math.min(100, ((user.xp || 0) / getXPForLevel((user.level || 1) + 1)) * 100)}%` }}
               className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]"
             />
           </div>
         </div>
       </div>
     </motion.div>

     <div className="grid grid-cols-2 gap-4">
       <motion.div 
         whileHover={{ y: -4 }}
         onClick={() => setActiveTab('quizzes')}
         className="bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm cursor-pointer group transition-all hover:bg-white/60"
       >
         <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
           <BrainCircuit size={20} />
         </div>
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-900/40">Take a</p>
         <p className="text-sm font-black text-slate-900">Quiz</p>
       </motion.div>
       <motion.div 
         whileHover={{ y: -4 }}
         onClick={() => setActiveTab('games')}
         className="bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm cursor-pointer group transition-all hover:bg-white/60"
       >
         <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
           <Gamepad2 size={20} />
         </div>
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-900/40">Play</p>
         <p className="text-sm font-black text-slate-900">Games</p>
       </motion.div>
     </div>
   </div>

   <div className="lg:col-span-2 space-y-6">
     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-sm">
       <div className="flex justify-between items-center mb-6">
         <h3 className="text-sm font-black uppercase tracking-widest text-slate-900/40 flex items-center gap-2">
           <BookMarked size={16} className="text-blue-600" /> Pending Assignments
         </h3>
         <button onClick={() => setActiveTab('assignments')} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">View All</button>
       </div>
       
       <div className="space-y-4">
         {assignments.filter(a => !(a as any).isSubmitted).slice(0, 2).map((assignment) => (
           <div key={assignment.id} className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/20 group hover:bg-white/60 transition-all cursor-pointer" onClick={() => setActiveTab('assignments')}>
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                 <PenTool size={20} />
               </div>
               <div>
                 <p className="text-sm font-black text-slate-900">{assignment.title}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-900/40">{subjects.find(s => s.id === assignment.subjectId)?.name}</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               {assignment.dueDate && (
                 <div className="text-right hidden sm:block">
                   <p className="text-[8px] font-black uppercase tracking-widest text-slate-900/40">Due Date</p>
                   <p className="text-[10px] font-black text-rose-500">{new Date(assignment.dueDate).toLocaleDateString()}</p>
                 </div>
               )}
               <ChevronRight size={18} className="text-slate-900/20 group-hover:text-blue-600 transition-colors" />
             </div>
           </div>
         ))}
         {assignments.filter(a => !(a as any).isSubmitted).length === 0 && (
           <div className="p-8 text-center bg-white/20 rounded-2xl border border-dashed border-white/40">
             <p className="text-xs font-black uppercase tracking-widest text-slate-900/40">All caught up!</p>
           </div>
         )}
       </div>
     </motion.div>

     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-sm">
       <div className="flex justify-between items-center mb-6">
         <h3 className="text-sm font-black uppercase tracking-widest text-slate-900/40 flex items-center gap-2">
           <Award size={16} className="text-orange-500" /> Active Challenges
         </h3>
         <ChevronRight size={16} className="text-slate-900/20" />
       </div>
       
       <div className="space-y-6">
         {challenges.map((challenge) => {
           const progress = Math.min(100, Math.round(((challengeProgress[challenge.id] || 0) / (challenge.targetCount || 1)) * 100));
           return (
             <div key={challenge.id} className="group cursor-default">
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                 <span className="text-slate-900/80 group-hover:text-slate-900 transition-colors">{challenge.title}</span>
                 <span className="text-orange-600">{progress}%</span>
               </div>
               <div className="h-2 bg-slate-900/5 rounded-full overflow-hidden p-0.5 border border-slate-900/5">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.2)]"
                 />
               </div>
               <p className="text-[8px] font-black uppercase tracking-widest text-slate-900/30 mt-2">Reward: {challenge.xpReward} XP</p>
             </div>
           );
         })}
         {challenges.length === 0 && (
           <div className="p-6 text-center bg-white/20 rounded-2xl">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-900/30">No active challenges</p>
           </div>
         )}
       </div>
     </motion.div>
   </div>
 </motion.div>
 )}

 { activeTab  === 'lessons'&& (
 <StudentLessons user={ user } subjects={subjects} classLevel={ classLevel } />
 )}

 { activeTab  === 'results'&& (
 <StudentResultView user={ user } />
 )}

 { activeTab  === 'assignments'&& (
 <StudentAssignments user={ user } subjects={ subjects } />
 )}

 { activeTab === 'quizzes' && (
   <StudentQuizzes user={user} subjects={subjects} classLevel={classLevel} />
 )}

 { activeTab === 'games' && (
   <StudentGames user={user} classLevel={classLevel} />
 )}

 { activeTab === 'timetable' && (
   <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-sm">
     <ClassTimetable user={user} mode="view" studentClassId={user.classId} />
   </div>
 )}

 { activeTab === 'ai_study_buddy' && (
   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
     <AIStudyBuddy user={user} subjects={subjects} classLevel={classLevel} />
   </motion.div>
 )}
 </div>
    </div>
  );
};
