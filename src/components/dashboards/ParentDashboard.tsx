import { useState, useEffect } from'react';
import { db, collection, getDocs, query, where, onSnapshot, orderBy, handleFirestoreError, OperationType } from'../../lib/compatibility';
import { UserProfile, Result, Announcement, Invoice, Payment, Term, Session } from'../../types';
import { Bell, TrendingUp, FileText, User, Heart, ArrowLeft, CreditCard, CheckCircle, Clock, ChevronRight } from'lucide-react';
import { motion } from'motion/react';
import { sortByName, sortByFullName } from'../../lib/utils';
import { StudentResultView } from'./StudentResultView';
import ClassTimetable from'./ClassTimetable';
import { ParentFinance } from'./ParentFinance';

import { Link } from 'react-router-dom';
import { LogOut, Layout } from 'lucide-react';

export const ParentDashboard = ({ user, onLogout, school }: { user: UserProfile, onLogout: () => void, school?: School }) => {
  const [activeTab, setActiveTab] = useState<'overview'|'timetable'|'finance'>('overview');
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<{ id: string, name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReportCard, setViewingReportCard] = useState(false);
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [termsMap, setTermsMap] = useState<Record<string, Record<string, Term>>>({});
  const [sessions, setSessions] = useState<Session[]>([]);

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

  useEffect(() => {
    if (!user.schoolId || !activeStudentId) return;

    const unsubSessions = onSnapshot(collection(db, `schools/${user.schoolId}/sessions`), (snap) => {
      const sessData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
      setSessions(sessData);
      
      sessData.forEach(sess => {
        onSnapshot(collection(db, `schools/${user.schoolId}/sessions/${sess.id}/terms`), (termSnap) => {
          const terms = termSnap.docs.map(d => ({ id: d.id, ...d.data() } as Term));
          setTermsMap(prev => ({
            ...prev,
            [sess.id]: terms.reduce((acc, t) => ({ ...acc, [t.id]: t }), {})
          }));
        });
      });
    });

    const qInvoices = query(collection(db, `schools/${user.schoolId}/invoices`), where('studentId', '==', activeStudentId));
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    });

    return () => {
      unsubSessions();
      unsubInvoices();
    };
  }, [user.schoolId, activeStudentId]);

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid' || invoice.amountPaid >= invoice.amount) return false;
    const term = termsMap[invoice.sessionId]?.[invoice.termId];
    if (term?.resumptionDate) {
      const resDate = new Date(term.resumptionDate);
      const oneMonthLater = new Date(resDate);
      oneMonthLater.setMonth(resDate.getMonth() + 1);
      return new Date() > oneMonthLater;
    }
    return new Date() > new Date(invoice.dueDate);
  };

  const totalBalance = invoices.reduce((acc, inv) => {
    if (inv.status === 'paid' || inv.amountPaid >= inv.amount) return acc;
    return acc + (inv.amount - inv.amountPaid);
  }, 0);

  const hasOverdue = invoices.some(inv => isOverdue(inv));
  const allPaid = invoices.length > 0 && totalBalance === 0;

  const activeStudent = students.find(s => s.uid === activeStudentId);

  useEffect(() => {
    if (!user.schoolId) return;

    const qAnnouncements = query(
      collection(db,'schools', user.schoolId,'announcements'),
      orderBy('createdAt','desc')
    );
    
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snap) => {
      const allAnnouncements = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      
      const filtered = allAnnouncements.filter(a => 
        a.isSchoolWide || (activeStudent && (a.classId === activeStudent.classId || a.studentId === activeStudent.uid))
      );
      
      setAnnouncements(filtered);
    });

    return () => unsubAnnouncements();
  }, [user.schoolId, activeStudent]);

  const handleLogout = () => {
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xs">S</div>
          )}
          <span className="font-black uppercase tracking-tighter text-white truncate max-w-[150px]">{school?.name || 'SEEDD'}</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-white/60"><LogOut size={20} /></button>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <Link to="/profile" className="relative group cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-lg border-2 border-white/20 group-hover:scale-105 transition-transform">
                {user.firstName[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-[#020617] flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
                  Welcome, {user.firstName}!
                </h1>
                {school?.logoUrl && (
                  <img src={school.logoUrl} alt={school.name} className="w-6 h-6 rounded-md object-cover opacity-50" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 bg-white/5 px-2 py-0.5 rounded">
                  Parent Portal
                </span>
                <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                  Guardian
                </span>
                {school?.name && (
                  <>
                    <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 truncate max-w-[150px]">
                      {school.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={handleLogout}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 border border-white/10 hover:border-red-500/20 transition-all font-black uppercase tracking-widest text-[10px]"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Student Selector */}
        { students.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-6 mb-8 scrollbar-hide no-scrollbar">
            { students.map(student => (
              <button
                key={ student.uid }
                onClick={() => setActiveStudentId(student.uid)}
                className={`px-6 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap shrink-0 border flex items-center gap-3 ${
                  activeStudentId === student.uid 
                  ?'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                  :'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">
                  {student.firstName[0]}
                </div>
                { student.firstName } { student.lastName }
              </button>
            ))}
          </div>
        )}

        <div className="space-y-8">
          { activeStudent ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 p-8 rounded-[3rem] border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  { activeStudent.photoUrl ? (
                    <img src={ activeStudent.photoUrl } alt={ activeStudent.firstName } className="w-28 h-28 rounded-[2rem] object-cover border-4 border-white/10 shadow-2xl shadow-blue-500/10"referrerPolicy="no-referrer"/>
                  ) : (
                    <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black border-4 border-white/10 shadow-2xl">
                      { activeStudent.firstName?.charAt(0) ||'?'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">{ activeStudent.firstName } { activeStudent.lastName }</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20 shadow-sm">ID: { activeStudent.studentId ||'N/A'}</span>
                      { activeStudent.classId && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 shadow-sm">Class: { getClassName(activeStudent.classId)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setViewingReportCard(!viewingReportCard)}
                    className={`flex-1 md:flex-none px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg flex items-center justify-center gap-2 ${
                      viewingReportCard ? 'bg-white/10 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                    }`}
                  >
                    <FileText size={ 18 } />
                    { viewingReportCard ?'Back to Dashboard':'View Report Card'}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white/5 p-12 rounded-[3rem] border border-white/10 text-center">
              <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-white/20 border border-white/10">
                <User size={ 48 } />
              </div>
              <p className="text-white font-black uppercase tracking-widest text-lg">No student linked to this account.</p>
              <p className="text-white/40 font-black uppercase tracking-widest text-[10px] mt-4">Please contact the school administrator to link your child's account.</p>
            </div>
          )}

          { activeStudent && !viewingReportCard && (
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
              {(['overview','timetable','finance'] as const).map((tab) => (
                <button
                  key={ tab }
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap shrink-0 border ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                      : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-8 flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 border border-blue-500/20"><TrendingUp size={ 20 } /></div>
                Recent Scores
              </h3>
              { results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white/5 rounded-3xl border border-white/5">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 mb-4 border border-white/10">
                    <TrendingUp size={ 32 } />
                  </div>
                  <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">No recent scores available.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  { results.map((res, i) => (
                    <div key={ i } className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/20 hover:bg-white/[0.07] transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-black border border-blue-500/20 group-hover:scale-110 transition-transform">
                          { getSubjectName(res.subjectId).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-widest text-[10px] text-white">{ getSubjectName(res.subjectId)}</p>
                          <p className="text-[8px] text-white/40 font-black uppercase tracking-widest mt-1">{ res.date ? new Date(res.date).toLocaleDateString() :'Recent'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-2xl text-blue-400">{ res.score }<span className="text-sm text-white/40 font-black">/{ res.total }</span></p>
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[8px] uppercase font-black mt-2 tracking-widest border ${
                          res.score / res.total >= 0.5 
                          ?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          :'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          { res.score / res.total >= 0.5 ?'Passed':'Needs Review'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 flex flex-col">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-8 flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/20"><CreditCard size={ 20 } /></div>
                Finance Summary
              </h3>
              
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/5 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-emerald-500/5 blur-[40px] pointer-events-none"></div>
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 relative z-10">Outstanding Balance</p>
                  <p className={`text-4xl font-black relative z-10 ${totalBalance > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                    ₦{totalBalance.toLocaleString()}
                  </p>
                  
                  {allPaid && (
                    <div className="mt-6 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 relative z-10">
                      <CheckCircle size={14} />
                      FULLY PAID
                    </div>
                  )}
                  
                  {hasOverdue && (
                    <div className="mt-6 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20 animate-pulse relative z-10">
                      <Clock size={14} />
                      OVERDUE WARNING
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setActiveTab('finance')}
                  className="w-full py-5 rounded-3xl bg-white text-[#020617] font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2"
                >
                  View Detailed Invoices <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-8 flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400 border border-amber-500/20"><Bell size={ 20 } /></div>
                School Notices
              </h3>
              <div className="space-y-6">
                { announcements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-white/5 rounded-3xl border border-white/5">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 mb-4 border border-white/10">
                      <Bell size={ 32 } />
                    </div>
                    <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">No recent notices.</p>
                  </div>
                ) : (
                  announcements.map((note, i) => (
                    <div key={ i } className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-amber-500/20 hover:bg-white/[0.07] transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-[8px] uppercase font-black px-4 py-1.5 rounded-full border tracking-widest ${
                          note.isSchoolWide 
                          ?'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          :'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          { note.isSchoolWide ?'School-wide':'Class Notice'}
                        </span>
                        <span className="text-[8px] text-white/40 font-black uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5">{ new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-black uppercase tracking-widest text-[12px] text-white mb-3 group-hover:text-amber-400 transition-colors">{ note.title }</h4>
                      <p className="text-[10px] text-white/60 font-black uppercase tracking-widest leading-relaxed line-clamp-3">{ note.content }</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} className="bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 p-10 rounded-[3rem] border border-white/10 shadow-sm relative overflow-hidden flex flex-col min-h-[400px]">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
              <div className="relative z-10 flex flex-col h-full justify-center">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-purple-500/20 border border-white/10">
                    <Heart size={ 32 } />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-white">AI Study Buddy Progress</h3>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-2">Track { activeStudent?.firstName }'s learning journey</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 text-center">
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2">Current Level</p>
                    <p className="text-3xl font-black text-indigo-400">{ activeStudent?.level || 1 }</p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 text-center">
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2">Total XP</p>
                    <p className="text-3xl font-black text-purple-400">{ activeStudent?.xp || 0 }</p>
                  </div>
                </div>
                
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
                  <p className="text-[10px] text-white/60 font-black uppercase tracking-widest leading-relaxed relative z-10">
                    { activeStudent?.firstName } has been actively using the AI Study Buddy to practice concepts and complete quizzes. Encourage them to keep up the great work!
                  </p>
                </div>
              </div>
            </motion.div>
          </div>v>
        </>
      )}
    </div>
  );
};
