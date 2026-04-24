import { useState, useEffect } from'react';
import { db, collection, getDocs, query, where, onSnapshot, orderBy, handleFirestoreError, OperationType } from'../../lib/compatibility';
import { UserProfile, Result, Announcement } from'../../types';
import { Bell, TrendingUp, FileText, User, Heart, ArrowLeft } from'lucide-react';
import { motion } from'motion/react';
import { sortByName, sortByFullName } from'../../lib/utils';
import { StudentResultView } from'./StudentResultView';
import ClassTimetable from'./ClassTimetable';
import { ParentFinance } from'./ParentFinance';

export const ParentDashboard = ({ user }: { user: UserProfile }) => {
 const [activeTab, setActiveTab] = useState<'overview'|'timetable'|'finance'>('overview');
 const [students, setStudents] = useState<UserProfile[]>([]);
 const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
 const [results, setResults] = useState<Result[]>([]);
 const [announcements, setAnnouncements] = useState<Announcement[]>([]);
 const [classes, setClasses] = useState<{ id: string, name: string }[]>([]);
 const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([]);
 const [loading, setLoading] = useState(true);
 const [viewingReportCard, setViewingReportCard] = useState(false);

 useEffect(() => {
 if (!user.schoolId) return;
 const unsubClasses = onSnapshot(collection(db,'schools', user.schoolId,'classes'), (snap) => {
 setClasses(sortByName(snap.docs.map(d => ({ id: d.id, name: d.data().name }))));
 }, (error) => handleFirestoreError(error, OperationType.GET,`schools/${ user.schoolId }/classes`));
 const unsubSubjects = onSnapshot(collection(db,'schools', user.schoolId,'subjects'), (snap) => {
 setSubjects(sortByName(snap.docs.map(d => ({ id: d.id, name: d.data().name }))));
 }, (error) => handleFirestoreError(error, OperationType.GET,`schools/${ user.schoolId }/subjects`));
 return () => {
 unsubClasses();
 unsubSubjects();
 };
 }, [user.schoolId]);

 const getClassName = (classId: string) => {
 if (classes.length === 0) return'Loading...';
 return classes.find(c => c.id === classId)?.name ||'N/A';
 };

 const getSubjectName = (subjectId: string) => {
 return subjects.find(s => s.id === subjectId)?.name || subjectId;
 };

 useEffect(() => {
 const studentIds = user.parentStudentIds || (user.parentStudentId ? [user.parentStudentId] : []);
 
 if (!user.schoolId || studentIds.length === 0) {
 setLoading(false);
 return;
 }

 const qStudents = query(
 collection(db,'users'), 
 where('schoolId','==', user.schoolId),
 where('studentId','in', studentIds)
 );
 
 const unsubStudents = onSnapshot(qStudents, (snap) => {
 const fetchedStudents = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
 setStudents(sortByFullName(fetchedStudents));
 if (fetchedStudents.length > 0 && !activeStudentId) {
 setActiveStudentId(fetchedStudents[0].uid);
 }
 setLoading(false);
 });

 return () => {
 unsubStudents();
 };
 }, [user.schoolId, user.parentStudentIds, user.parentStudentId]);

 useEffect(() => {
 if (!activeStudentId) return;

 const qResults = query(collection(db,'schools', user.schoolId,'results'), where('studentId','==', activeStudentId));
 const unsubResults = onSnapshot(qResults, (snap) => {
 const resultsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Result));
 resultsData.sort((a, b) => {
 const dateA = a.date ? new Date(a.date).getTime() : 0;
 const dateB = b.date ? new Date(b.date).getTime() : 0;
 return dateB - dateA;
 });
 setResults(resultsData);
 });

 return () => {
 unsubResults();
 };
 }, [activeStudentId]);

 const activeStudent = students.find(s => s.uid === activeStudentId);

 useEffect(() => {
 if (!user.schoolId) return;

 const qAnnouncements = query(
 collection(db,'schools', user.schoolId,'announcements'),
 orderBy('createdAt','desc')
 );
 
 const unsubAnnouncements = onSnapshot(qAnnouncements, (snap) => {
 const allAnnouncements = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
 
 // Filter based on active student's class
 const filtered = allAnnouncements.filter(a => 
 a.isSchoolWide || (activeStudent && (a.classId === activeStudent.classId || a.studentId === activeStudent.uid))
 );
 
 setAnnouncements(filtered);
 });

 return () => unsubAnnouncements();
 }, [user.schoolId, activeStudent]);

 if (loading) return <div className="p-4 text-center text-slate-900">Loading student data...</div>;

 return (
 <div className="space-y-5">
 { students.length > 1 && (
 <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
 { students.map(student => (
 <button
 key={ student.uid }
 onClick={() => setActiveStudentId(student.uid)}
 className={`px-6 py-3 rounded-2xl font-medium text-sm transition-all whitespace-nowrap shrink-0 ${
 activeStudentId === student.uid 
 ?'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30'
 :'bg-white text-slate-900 hover:bg-white border border-slate-300 shadow-sm hover:shadow-md'
 }`}
 >
 { student.firstName } { student.lastName }
 </button>
 ))}
 </div>
 )}

 { activeStudent ? (
 <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
 <div className="relative z-10 flex items-center gap-4">
 { activeStudent.photoUrl ? (
 <img src={ activeStudent.photoUrl } alt={ activeStudent.firstName } className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 text-xl font-medium border-4 border-white shadow-md">
 { activeStudent.firstName?.charAt(0) ||'?'}
 </div>
 )}
 <div>
 <h3 className="text-xl font-medium text-slate-900 mb-1">{ activeStudent.firstName } { activeStudent.lastName }</h3>
 <div className="flex flex-wrap items-center gap-2 sm:gap-3">
 <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100/50">ID: { activeStudent.studentId ||'N/A'}</span>
 { activeStudent.classId && (
 <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/50">Class: { getClassName(activeStudent.classId)}</span>
 )}
 </div>
 </div>
 </div>
 <div className="relative z-10 flex sm:flex-col gap-2">
 <button
 onClick={() => setViewingReportCard(!viewingReportCard)}
 className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
 >
 <FileText size={ 18 } />
 { viewingReportCard ?'Back to Dashboard':'View Report Card'}
 </button>
 </div>
 </div>
 ) : (
 <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm text-center">
 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-900 border border-slate-100">
 <User size={ 40 } />
 </div>
 <p className="text-slate-900 font-medium text-lg">No student linked to this account.</p>
 <p className="text-slate-900 font-medium mt-2">Please contact the school administrator to link your child's account.</p>
 </div>
 )}

 { activeStudent && !viewingReportCard && (
 <div className="flex flex-wrap bg-white backdrop-blur-md p-1 rounded-xl border border-gray-200/50 bg-slate-50 w-fit">
 {(['overview','timetable','finance'] as const).map((tab) => (
 <button
 key={ tab }
 onClick={() => setActiveTab(tab)}
 className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all duration-300 ${
 activeTab === tab ?'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50':'text-slate-900 hover:text-slate-900 hover:bg-gray-100'
 }`}
 >
 { tab }
 </button>
 ))}
 </div>
 )}

 { viewingReportCard && activeStudent ? (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="mt-6"
 >
 <StudentResultView user={ activeStudent } />
 </motion.div>
 ) : activeTab  === 'timetable'&& activeStudent ? (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="mt-6"
 >
 <ClassTimetable user={ user } mode="view"studentClassId={ activeStudent.classId } />
 </motion.div>
 ) : activeTab  === 'finance'&& activeStudent ? (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="mt-6"
 >
 <ParentFinance user={ user } studentId={ activeStudent.uid } />
 </motion.div>
 ) : (
 <>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
 <h3 className="font-medium text-xl text-slate-900 mb-6 flex items-center gap-3">
 <div className="p-2.5 bg-blue-50 rounded-full border border-blue-100/50 shadow-sm"><TrendingUp size={ 20 } className="text-blue-600"/></div>
 Recent Scores
 </h3>
 { results.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl border border-slate-100">
 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-900 mb-4 shadow-sm border border-slate-100">
 <TrendingUp size={ 20 } />
 </div>
 <p className="text-slate-900 font-medium">No recent scores available.</p>
 <p className="text-slate-900 font-medium text-sm mt-1">Scores will appear here once quizzes are completed.</p>
 </div>
 ) : (
 <div className="space-y-6">
 { results.map((res, i) => (
 <div key={ i } className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-medium border border-blue-100/50 group-hover:scale-110 transition-transform">
 { getSubjectName(res.subjectId).substring(0, 2).toUpperCase()}
 </div>
 <div>
 <p className="font-medium text-slate-900 text-lg">{ getSubjectName(res.subjectId)}</p>
 <p className="text-sm text-slate-900 font-medium mt-0.5">{ res.date ? new Date(res.date).toLocaleDateString() :'Recent'}</p>
 </div>
 </div>
 <div className="text-right">
 <p className="font-medium text-2xl text-blue-600">{ res.score }<span className="text-lg text-slate-900 font-medium">/{ res.total }</span></p>
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase font-medium mt-1 tracking-wider border ${
 res.score / res.total >= 0.5 
 ?'bg-emerald-50 text-emerald-700 border-emerald-200/50'
 :'bg-red-50 text-red-700 border-red-200/50'
 }`}>
 { res.score / res.total >= 0.5 ?'Passed':'Needs Review'}
 </span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
 <h3 className="font-medium text-xl text-slate-900 mb-6 flex items-center gap-3">
 <div className="p-2.5 bg-amber-50 rounded-full border border-amber-100/50 shadow-sm"><Bell size={ 20 } className="text-amber-600"/></div>
 School Notices
 </h3>
 <div className="space-y-6">
 { announcements.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl border border-slate-100">
 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-900 mb-4 shadow-sm border border-slate-100">
 <Bell size={ 20 } />
 </div>
 <p className="text-slate-900 font-medium">No recent notices.</p>
 <p className="text-slate-900 font-medium text-sm mt-1">You're all caught up!</p>
 </div>
 ) : (
 announcements.map((note, i) => (
 <div key={ i } className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all group">
 <div className="flex justify-between items-start mb-3">
 <span className={`text-[10px] uppercase font-medium px-3 py-1 rounded-full border ${
 note.isSchoolWide 
 ?'bg-blue-50 text-blue-700 border-blue-200/50'
 :'bg-indigo-50 text-indigo-700 border-indigo-200/50'
 }`}>
 { note.isSchoolWide ?'School-wide':'Class Notice'}
 </span>
 <span className="text-xs text-slate-900 font-medium bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">{ new Date(note.createdAt).toLocaleDateString()}</span>
 </div>
 <h4 className="font-medium text-slate-900 text-lg mb-2 group-hover:text-amber-700 transition-colors">{ note.title }</h4>
 <p className="text-sm text-slate-900 font-medium leading-relaxed">{ note.content }</p>
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 <motion.div whileHover={{ scale: 1.01 }} className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
 <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
 <div className="relative z-10 flex flex-col h-full justify-center">
 <div className="flex items-center gap-4 mb-6">
 <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-purple-600 shadow-sm border border-white">
 <Heart size={ 28 } />
 </div>
 <div>
 <h3 className="text-xl font-medium text-slate-900">AI Study Buddy Progress</h3>
 <p className="text-sm text-slate-900 font-medium mt-1">Track { activeStudent?.firstName }'s learning journey</p>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-4 mb-6">
 <div className="bg-white p-4 rounded-xl border border-white shadow-sm text-center">
 <p className="text-sm text-slate-900 font-medium mb-1">Current Level</p>
 <p className="text-2xl font-medium text-indigo-700">{ activeStudent?.level || 1 }</p>
 </div>
 <div className="bg-white p-4 rounded-xl border border-white shadow-sm text-center">
 <p className="text-sm text-slate-900 font-medium mb-1">Total XP</p>
 <p className="text-2xl font-medium text-purple-700">{ activeStudent?.xp || 0 }</p>
 </div>
 </div>
 
 <p className="text-slate-900 font-medium text-sm leading-relaxed bg-white p-4 rounded-xl border border-slate-300">
 { activeStudent?.firstName } has been actively using the AI Study Buddy to practice concepts and complete quizzes. Encourage them to keep up the great work!
 </p>
 </div>
 </motion.div>

 <motion.div whileHover={{ scale: 1.01 }} className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6 rounded-2xl border border-slate-100 shadow-sm text-center relative overflow-hidden flex flex-col justify-center">
 <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-200/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
 
 <div className="relative z-10">
 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-teal-500 shadow-sm mx-auto mb-4 border border-white">
 <FileText size={ 32 } className="drop-shadow-sm"/>
 </div>
 <h3 className="text-xl font-medium text-slate-900 mb-3">Support Your Child's Learning</h3>
 <p className="text-slate-900 font-medium max-w-sm mx-auto mb-6 text-sm leading-relaxed">Access parent resources, study guides, and tips on how to help your child excel in their academic journey.</p>
 <button className="bg-teal-600 text-slate-900 hover:bg-teal-700 px-8 py-2.5 rounded-full font-medium hover:scale-105 transition-all flex items-center gap-2 mx-auto shadow-sm">
 View Resources
 </button>
 </div>
 </motion.div>
 </div>
 </>
 )}
 </div>
 );
};
