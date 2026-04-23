import { useState, useEffect } from'react';
import { Link } from'react-router-dom';
import { db, collection, getDocs, query, where, onSnapshot, doc, orderBy } from'../../firebase';
import { UserProfile, Assignment, Subject, Class, Announcement, Result, Challenge } from'../../types';
import { BookOpen, FileText, CheckSquare, Trophy, Calendar, Gamepad2, Clock, CheckCircle2, Star, Bell, Flame, TrendingUp, Award, ShoppingBag, Sparkles } from'lucide-react';
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

export const StudentDashboard = ({ user }: { user: UserProfile }) => {
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

 const isFemale = user.gender  === 'female';
 const containerClass = isFemale 
 ?"space-y-5 min-h-screen -mx-4 -mt-8 px-4 pt-8 bg-gradient-to-br from-[#FFD1D1] via-[#FFF3E0] to-[#E0F7FA]"
 :"space-y-5";

 return (
 <div className={ containerClass }>
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div className="flex flex-wrap bg-white backdrop-blur-md p-1 rounded-xl border border-gray-200/50 bg-slate-50">
 {(['overview','lessons','assignments','quizzes','results','games','ai_study_buddy'] as const).map((tab, index) => {
 const colors = [
'bg-orange-100','bg-blue-100','bg-purple-100', 
'bg-pink-100','bg-red-100','bg-green-100','bg-yellow-100'
 ];
 const colorClass = colors[index % colors.length];
 return (
 <button
 key={ tab }
 onClick={() => setActiveTab(tab as any)}
 className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all duration-300 ${
 activeTab === tab ?`${ colorClass } text-slate-900 shadow-md`:'text-slate-900 hover:text-slate-900 hover:bg-slate-50'
 }`}
 >
 { tab.replace(/_/g,'')}
 </button>
 );
 })}
 </div>
 </div>

 { activeTab  === 'overview'&& (
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <motion.div whileHover={{ y: -5, scale: 1.02 }} transition={{ type:"spring", stiffness: 300, damping: 20 }} className="bg-orange-100 p-4 rounded-2xl shadow-sm border border-slate-300 transition-all duration-300 relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
 <div className="flex items-center gap-4 mb-4 relative z-10">
 <div className="p-2.5 bg-white rounded-2xl text-slate-900 shadow-sm"><FileText size={ 20 } strokeWidth={ 2.5 } /></div>
 <span className="text-slate-900 font-medium text-sm uppercase tracking-wider">Active Assignments</span>
 </div>
 <p className="text-xl font-medium text-slate-900 relative z-10">{ assignments.length }</p>
 </motion.div>
 <motion.div whileHover={{ y: -5, scale: 1.02 }} transition={{ type:"spring", stiffness: 300, damping: 20 }} className="bg-blue-100 p-4 rounded-2xl shadow-sm border border-slate-300 cursor-pointer transition-all duration-300 relative overflow-hidden group"onClick={() => setActiveTab('quizzes')}>
 <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
 <div className="flex items-center gap-4 mb-4 relative z-10">
 <div className="p-2.5 bg-white rounded-2xl text-slate-900 shadow-sm"><CheckSquare size={ 20 } strokeWidth={ 2.5 } /></div>
 <span className="text-slate-900 font-medium text-sm uppercase tracking-wider">Quizzes</span>
 </div>
 <p className="text-xl font-medium text-slate-900 relative z-10">View</p>
 </motion.div>
 <motion.div whileHover={{ y: -5, scale: 1.02 }} transition={{ type:"spring", stiffness: 300, damping: 20 }} className="bg-purple-100 p-4 rounded-2xl shadow-sm border border-slate-300 transition-all duration-300 relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
 <div className="flex items-center gap-4 mb-4 relative z-10">
 <div className="p-2.5 bg-white rounded-2xl text-slate-900 shadow-sm"><Flame size={ 20 } strokeWidth={ 2.5 } /></div>
 <span className="text-slate-900 font-medium text-sm uppercase tracking-wider">Daily Streak</span>
 </div>
 <p className="text-xl font-medium text-slate-900 relative z-10">{ user.streakCount || 0 } Days 🔥</p>
 </motion.div>
 <motion.div whileHover={{ y: -5, scale: 1.02 }} transition={{ type:"spring", stiffness: 300, damping: 20 }} className="bg-pink-100 p-4 rounded-2xl shadow-sm border border-slate-300 transition-all duration-300 relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
 <div className="flex items-center gap-4 mb-4 relative z-10">
 <div className="p-2.5 bg-white rounded-2xl text-slate-900 shadow-sm"><Trophy size={ 20 } strokeWidth={ 2.5 } /></div>
 <span className="text-slate-900 font-medium text-sm uppercase tracking-wider">Level { user.level || 1 }</span>
 </div>
 <div className="relative z-10">
 <div className="flex justify-between items-end mb-1">
 <p className="text-xl font-medium text-slate-900">{ user.xp || 0 } XP</p>
 <p className="text-[10px] font-medium text-gray-700 uppercase tracking-wider">Next: { getXPForLevel((user.level || 1) + 1)} XP</p>
 </div>
 <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
 <div 
 className="h-full bg-white transition-all duration-500"
 style={{ width:`${ Math.min(100, ((user.xp || 0) - getXPForLevel(user.level || 1)) / (getXPForLevel((user.level || 1) + 1) - getXPForLevel(user.level || 1)) * 100)}%`}}
 ></div>
 </div>
 </div>
 </motion.div>
 <motion.div whileHover={{ y: -5, scale: 1.02 }} transition={{ type:"spring", stiffness: 300, damping: 20 }} className="bg-red-100 p-4 rounded-2xl shadow-sm border border-slate-300 transition-all duration-300 relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
 <div className="flex items-center gap-4 mb-4 relative z-10">
 <div className="p-2.5 bg-white rounded-2xl text-slate-900 shadow-sm"><Star size={ 20 } strokeWidth={ 2.5 } /></div>
 <span className="text-slate-900 font-medium text-sm uppercase tracking-wider">Coins</span>
 </div>
 <p className="text-xl font-medium text-slate-900 relative z-10">{ user.coins || 0 } 🪙</p>
 </motion.div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 <div className="bg-green-100 p-4 rounded-[24px] shadow-sm border border-slate-300">
 <div className="flex justify-between items-center mb-6">
 <h3 className="font-medium text-xl text-slate-900 flex items-center gap-3">
 <div className="p-2.5 bg-white rounded-xl"><BookOpen size={ 20 } className="text-slate-900"/></div>
 Lessons Hub
 </h3>
 <button onClick={() => setActiveTab('lessons')} className="text-sm text-slate-900 font-medium hover:text-gray-700 transition-colors">View All</button>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} transition={{ type:"spring", stiffness: 400, damping: 17 }} onClick={() => setActiveTab('lessons')} className="p-4 rounded-[24px] bg-white border border-white/30 hover:bg-white transition-all text-left flex flex-col gap-1">
 <span className="font-medium text-slate-900 block truncate">English Language</span>
 <span className="text-sm text-gray-700 font-medium">{ classLevel ?`${ classLevel } Lessons`:'P1 - P6 Lessons'}</span>
 </motion.button>
 <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} transition={{ type:"spring", stiffness: 400, damping: 17 }} onClick={() => setActiveTab('lessons')} className="p-4 rounded-[24px] bg-white border border-white/30 hover:bg-white transition-all text-left flex flex-col gap-1">
 <span className="font-medium text-slate-900 block truncate">Mathematics</span>
 <span className="text-sm text-gray-700 font-medium">{ classLevel ?`${ classLevel } Lessons`:'P1 - P6 Lessons'}</span>
 </motion.button>
 </div>
 </div>

 <div className="bg-yellow-100 p-4 rounded-[24px] shadow-sm border border-slate-300">
 <div className="flex justify-between items-center mb-6">
 <h3 className="font-medium text-xl text-slate-900 flex items-center gap-3">
 <div className="p-2.5 bg-white rounded-xl"><FileText size={ 20 } className="text-slate-900"/></div>
 Recent Assignments
 </h3>
 <button onClick={() => setActiveTab('assignments')} className="text-sm text-slate-900 font-medium hover:text-slate-900 transition-colors">View All</button>
 </div>
 <div className="space-y-3">
 { assignments.slice(0, 3).map(a => {
 const isOverdue = new Date(a.dueDate) < new Date();
 return (
 <motion.div 
 whileHover={{ x: 4, scale: 1.01 }} 
 whileTap={{ scale: 0.99 }}
 transition={{ type:"spring", stiffness: 400, damping: 17 }}
 key={ a.id } 
 onClick={() => setActiveTab('assignments')}
 className={`flex gap-4 items-center p-4 rounded-[24px] bg-white border transition-all cursor-pointer ${
 isOverdue ?'border-red-200 hover:bg-white':'border-slate-300 hover:bg-white'
 }`}
 >
 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
 isOverdue ?'bg-red-100 text-red-600':'bg-white text-slate-900'
 }`}>
 <FileText size={ 20 } />
 </div>
 <div className="flex-1 overflow-hidden">
 <p className="font-medium text-slate-900 text-sm truncate">{ a.title }</p>
 <p className="text-xs text-slate-900 font-medium">{ getSubjectName(a.subjectId)}</p>
 </div>
 <div className={`text-[10px] font-medium uppercase tracking-wider whitespace-nowrap px-3 py-1.5 rounded-full border ${
 isOverdue ?'bg-red-100 text-red-700 border-red-200':'bg-white text-slate-900 border-white'
 }`}>
 { isOverdue ?'Overdue':`Due: ${ new Date(a.dueDate).toLocaleDateString(undefined, { month:'short', day:'numeric'})}`}
 </div>
 </motion.div>
 );
 })}
 { assignments.length === 0 && (
 <div className="flex flex-col items-center justify-center py-8 text-center">
 <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-900 mb-3">
 <CheckCircle2 size={ 20 } />
 </div>
 <p className="text-slate-900 font-medium">All caught up!</p>
 <p className="text-slate-900 text-sm mt-1">No recent assignments.</p>
 </div>
 )}
 </div>
 </div>

 <div className="bg-orange-100 p-4 rounded-[24px] shadow-sm border border-slate-300 lg:col-span-2">
 <div className="flex justify-between items-center mb-6">
 <h3 className="font-medium text-xl text-slate-900 flex items-center gap-3">
 <div className="p-2.5 bg-white rounded-xl"><TrendingUp size={ 20 } className="text-slate-900"/></div>
 Active Challenges
 </h3>
 </div>
 <div className="space-y-3">
 { challenges.map(challenge => {
 const progress = challengeProgress[challenge.id] || 0;
 const percentage = Math.min(100, (progress / challenge.targetCount) * 100);
 return (
 <motion.div whileHover={{ scale: 1.01, x: 4 }} transition={{ type:"spring", stiffness: 400, damping: 17 }} key={ challenge.id } className="p-4 rounded-2xl bg-white border border-white/30 flex items-center justify-between gap-4 cursor-pointer">
 <div className="flex-1">
 <h4 className="font-medium text-slate-900 text-sm">{ challenge.title }</h4>
 <p className="text-[10px] text-gray-700 mt-0.5">{ challenge.description }</p>
 <div className="flex items-center gap-2 mt-2">
 <div className="h-1.5 flex-1 bg-black/10 rounded-full overflow-hidden">
 <div className="h-full bg-white transition-all duration-1000"style={{ width:`${ percentage }%`}}></div>
 </div>
 <span className="text-[10px] font-medium text-slate-900">{ Math.round(percentage)}%</span>
 </div>
 </div>
 <div className="text-right shrink-0">
 <div className="text-[10px] font-medium text-slate-900">+{ challenge.xpReward } XP</div>
 <div className="text-[10px] font-medium text-slate-900">+{ challenge.coinReward } 🪙</div>
 </div>
 </motion.div>
 );
 })}
 { challenges.length === 0 && (
 <div className="py-8 text-center text-gray-700 text-sm font-medium">
 No active challenges. Check back soon!
 </div>
 )}
 </div>
 </div>

 <div className="bg-blue-100 p-4 rounded-[24px] shadow-sm border border-slate-300 lg:col-span-2">
 <div className="flex justify-between items-center mb-6">
 <h3 className="font-medium text-xl text-slate-900 flex items-center gap-3">
 <div className="p-2.5 bg-white rounded-xl"><Bell size={ 20 } className="text-slate-900"/></div>
 Recent Notices
 </h3>
 <Link to="/announcements"className="text-sm text-slate-900 font-medium hover:text-gray-700 transition-colors">View All</Link>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 { announcements.map(a => (
 <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ type:"spring", stiffness: 400, damping: 17 }} key={ a.id } className="p-4 rounded-[24px] bg-white border border-white/30 hover:bg-white transition-all cursor-pointer">
 <div className="flex justify-between items-start mb-2">
 <span className="text-[10px] uppercase tracking-wider font-medium text-blue-900 bg-white px-2 py-1 rounded-md">
 { a.isSchoolWide ?'School-wide':'Class Notice'}
 </span>
 <span className="text-[10px] font-medium text-gray-700">{ new Date(a.createdAt).toLocaleDateString()}</span>
 </div>
 <p className="font-medium text-slate-900 text-sm mb-1">{ a.title }</p>
 <p className="text-xs text-gray-700 line-clamp-2">{ a.content }</p>
 </motion.div>
 ))}
 { announcements.length === 0 && (
 <div className="col-span-full text-center py-8">
 <p className="text-gray-700 text-sm font-medium">No recent notices.</p>
 </div>
 )}
 </div>
 </div>
 </div>

 <motion.div whileHover={{ scale: 1.01, y: -2 }} transition={{ type:"spring", stiffness: 400, damping: 17 }} className="bg-purple-100 hover:bg-purple-200 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg relative overflow-hidden">
 <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mr-20 -mt-20"></div>
 <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-2xl -ml-10 -mb-10"></div>
 <div className="flex items-center gap-4 relative z-10">
 <div className="w-16 h-16 bg-white backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-900 shadow-sm shrink-0">
 <Gamepad2 size={ 20 } />
 </div>
 <div>
 <h3 className="text-lg font-medium text-slate-900 mb-2">Brain Games</h3>
 <p className="text-purple-800 font-medium">Take a break and sharpen your mind with educational puzzles.</p>
 </div>
 </div>
 <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ type:"spring", stiffness: 400, damping: 17 }} onClick={() => setActiveTab('games')} className="bg-white text-purple-600 px-5 py-2.5 rounded-lg font-medium hover:bg-purple-50 transition-all shadow-md whitespace-nowrap relative z-10">
 Play Now
 </motion.button>
 </motion.div>
 </motion.div>
 )}

 { activeTab  === 'lessons'&& (
 <StudentLessons user={ user } classLevel={ classLevel } />
 )}

 { activeTab  === 'results'&& (
 <StudentResultView user={ user } />
 )}

 { activeTab  === 'assignments'&& (
 <StudentAssignments user={ user } subjects={ subjects } />
 )}

 { activeTab  === 'quizzes'&& (
 <StudentQuizzes user={ user } subjects={ subjects } classLevel={ classLevel } />
 )}

 { activeTab  === 'games'&& (
 <StudentGames user={ user } classLevel={ classLevel } />
 )}

 { activeTab  === 'timetable'&& (
 <ClassTimetable user={ user } mode="view"studentClassId={ user.classId } />
 )}

 { activeTab  === 'ai_study_buddy'&& (
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
 <AIStudyBuddy user={ user } subjects={ subjects } classLevel={ classLevel } />
 </motion.div>
 )}
 </div>
 );
};
