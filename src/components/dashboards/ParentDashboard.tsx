import { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, orderBy, handleFirestoreError, OperationType } from '../../lib/compatibility';
import { UserProfile, Result, Announcement, Invoice, Term, Session, School } from '../../types';
import { Bell, TrendingUp, FileText, User, Heart, CreditCard, CheckCircle, Clock, ChevronRight, LogOut, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, sortByFullName, formatDisplayString } from '../../lib/utils';
import { StudentResultView } from './StudentResultView';
import ClassTimetable from './ClassTimetable';
import { ParentFinance } from './ParentFinance';
import { Link } from 'react-router-dom';

export const ParentDashboard = ({ user, onLogout, school }: { user: UserProfile, onLogout: () => void, school?: School }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timetable' | 'finance'>('overview');
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
    const unsubClasses = onSnapshot(collection(db, 'schools', user.schoolId, 'classes'), (snap) => {
      setClasses(sortByName(snap.docs.map(d => ({ id: d.id, name: d.data().name }))));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/classes`));
    const unsubSubjects = onSnapshot(collection(db, 'schools', user.schoolId, 'subjects'), (snap) => {
      setSubjects(sortByName(snap.docs.map(d => ({ id: d.id, name: d.data().name }))));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/subjects`));
    return () => {
      unsubClasses();
      unsubSubjects();
    };
  }, [user.schoolId]);

  const getClassName = (classId: string) => {
    if (classes.length === 0) return 'Loading...';
    const name = classes.find(c => c.id === classId)?.name || 'N/A';
    return formatDisplayString(name);
  };

  const getSubjectName = (subjectId: string) => {
    const name = subjects.find(s => s.id === subjectId)?.name || subjectId;
    return formatDisplayString(name);
  };

  useEffect(() => {
    const studentIds = user.parentStudentIds || (user.parentStudentId ? [user.parentStudentId] : []);
    
    if (!user.schoolId || studentIds.length === 0) {
      setLoading(false);
      return;
    }

    const qStudents = query(
      collection(db, 'users'), 
      where('schoolId', '==', user.schoolId),
      where('studentId', 'in', studentIds)
    );
    
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const fetchedStudents = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setStudents(sortByFullName(fetchedStudents));
      if (fetchedStudents.length > 0 && !activeStudentId) {
        setActiveStudentId(fetchedStudents[0].uid);
      }
      setLoading(false);
    });

    return () => unsubStudents();
  }, [user.schoolId, user.parentStudentIds, user.parentStudentId]);

  useEffect(() => {
    if (!activeStudentId || !user.schoolId) return;

    const qResults = query(collection(db, 'schools', user.schoolId, 'results'), where('studentId', '==', activeStudentId));
    const unsubResults = onSnapshot(qResults, (snap) => {
      const resultsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Result));
      resultsData.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      setResults(resultsData);
    });

    return () => unsubResults();
  }, [activeStudentId, user.schoolId]);

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
      collection(db, 'schools', user.schoolId, 'announcements'),
      orderBy('createdAt', 'desc')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Mobile Top Header */}
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
            <Link to="/profile" className="relative group cursor-pointer">
              <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center text-3xl font-black text-slate-900 shadow-2xl border-4 border-white group-hover:scale-105 transition-all overflow-hidden">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.firstName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                    {formatDisplayString(user.firstName).charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                  Welcome, {formatDisplayString(user.firstName)}!
                </h1>
                {school?.logoUrl && (
                  <img src={school.logoUrl} alt={school.name} className="w-8 h-8 rounded-lg object-cover opacity-20 grayscale" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 px-3 py-1 rounded-full shadow-lg shadow-slate-900/10">
                  Guardian Portal
                </span>
                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Parent Account
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button
              onClick={onLogout}
              id="btn_parent_logout"
              className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border border-white shadow-xl shadow-slate-200/20 hover:shadow-red-500/10 transition-all font-black uppercase tracking-widest text-[10px] group"
            >
              <LogOut size={16} className="group-hover:translate-x-1 transition-transform" /> Logout
            </button>
          </div>
        </div>

        {/* Student Selector */}
        {students.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-8 mb-12 scrollbar-hide no-scrollbar scroll-smooth">
            {students.map(student => (
              <button
                key={student.uid}
                id={`btn_parent_student_select_${student.uid}`}
                onClick={() => { setActiveStudentId(student.uid); setViewingReportCard(false); }}
                className={`px-10 py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap shrink-0 border flex items-center gap-5 ${
                  activeStudentId === student.uid 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xl shadow-slate-900/20 scale-105 z-10'
                  : 'bg-white text-slate-400 border-white hover:bg-slate-50 hover:text-slate-900 shadow-xl shadow-slate-200/20'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border-2 ${activeStudentId === student.uid ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-100'}`}>
                  {formatDisplayString(student.firstName).charAt(0)}
                </div>
                {formatDisplayString(student.firstName)} {formatDisplayString(student.lastName)}
              </button>
            ))}
          </div>
        )}

        {/* Student Profile Overview */}
        <div className="space-y-12">
          {activeStudent ? (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-md p-12 rounded-[3rem] border border-white relative overflow-hidden shadow-2xl shadow-slate-200/40">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-900/[0.01] rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none"></div>
              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="flex flex-col md:flex-row items-center gap-10">
                  {activeStudent.photoUrl ? (
                    <div className="relative">
                      <img src={activeStudent.photoUrl} alt={activeStudent.firstName} className="w-40 h-40 rounded-[2.5rem] object-cover border-4 border-white shadow-2xl shadow-slate-200" referrerPolicy="no-referrer"/>
                      <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full border-4 border-white shadow-lg">
                        Lv. {activeStudent.level || 1}
                      </div>
                    </div>
                  ) : (
                    <div className="w-40 h-40 bg-slate-50 text-slate-900 rounded-[2.5rem] flex items-center justify-center text-5xl font-black border-4 border-white shadow-2xl shadow-slate-200">
                      {formatDisplayString(activeStudent.firstName)?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="text-center md:text-left">
                    <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900 mb-4">{formatDisplayString(activeStudent.firstName)} {formatDisplayString(activeStudent.lastName)}</h3>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-5 py-2 rounded-full border border-slate-200">Student ID: {activeStudent.studentId || 'N/A'}</span>
                      {activeStudent.classId && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 px-5 py-2 rounded-full shadow-lg shadow-slate-900/10">{getClassName(activeStudent.classId)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <button
                      id="btn_parent_view_report_card"
                      onClick={() => setViewingReportCard(!viewingReportCard)}
                      className={`flex-1 lg:flex-none px-12 py-6 rounded-[2rem] font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl flex items-center justify-center gap-4 border-4 ${
                        viewingReportCard 
                        ? 'bg-white border-slate-100 text-slate-500 shadow-slate-200/50' 
                        : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 active:scale-95'
                      }`}
                    >
                      <FileText size={20} strokeWidth={2.5} />
                      {viewingReportCard ? 'Back to Overview' : 'Full Academic Report'}
                    </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white p-24 rounded-[3rem] border border-white text-center shadow-2xl shadow-slate-200/40">
              <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-slate-200 border border-slate-100 shadow-inner">
                <User size={56} strokeWidth={2.5} />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-4">Account Synchronization</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 max-w-md mx-auto leading-relaxed">Please contact the institutional administration to synchronize your student's profile with this guardian account.</p>
            </div>
          )}

          {activeStudent && !viewingReportCard && (
            <div className="flex items-center gap-3 overflow-x-auto pb-6 scrollbar-hide no-scrollbar">
              {(['overview', 'timetable', 'finance'] as const).map((tab) => (
                <button
                  key={tab}
                  id={`tab_parent_${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap shrink-0 border ${
                    activeTab === tab
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xl shadow-slate-900/20 scale-105'
                      : 'bg-white text-slate-400 border-white hover:bg-slate-50 hover:text-slate-900 shadow-xl shadow-slate-200/20'
                  }`}
                >
                  {tab === 'overview' ? 'Performance' : tab === 'timetable' ? 'Timetable' : 'Financials'}
                </button>
              ))}
            </div>
          )}

          {viewingReportCard && activeStudent ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
              <StudentResultView user={activeStudent} />
            </motion.div>
          ) : activeTab === 'timetable' && activeStudent ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
              <ClassTimetable user={user} mode="view" studentClassId={activeStudent.classId} />
            </motion.div>
          ) : activeTab === 'finance' && activeStudent ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
              <ParentFinance user={user} studentId={activeStudent.uid} />
            </motion.div>
          ) : activeStudent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Academic Snap */}
                <div className="bg-white p-12 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40">
                  <div className="flex justify-between items-center mb-12">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-4">
                      <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100"><TrendingUp size={20} strokeWidth={3} /></div>
                      Academic Progress
                    </h3>
                  </div>
                  {results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-slate-50/50 rounded-[2.5rem] border border-slate-100 border-dashed">
                      <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-slate-200 mb-8 shadow-sm">
                        <TrendingUp size={36} />
                      </div>
                      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No records detected.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {results.slice(0, 5).map((res, i) => (
                        <div key={i} className="flex items-center justify-between p-7 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:border-white hover:bg-white hover:shadow-2xl transition-all group">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-white flex items-center justify-center text-blue-600 font-black text-xs border-2 border-slate-50 shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                              {getSubjectName(res.subjectId).substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black uppercase tracking-widest text-[11px] text-slate-900 mb-2">{getSubjectName(res.subjectId)}</p>
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> {res.date ? new Date(res.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'PENDING'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-3xl text-slate-900 leading-none">{res.score}<span className="text-xs text-slate-300 font-black ml-1">/{res.total}</span></p>
                            <span className={`inline-flex items-center px-5 py-2 rounded-full text-[8px] uppercase font-black mt-3 tracking-widest border shadow-sm ${
                              res.score / res.total >= 0.5 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-red-50 text-red-600 border-red-100'
                            }`}>
                              {res.score / res.total >= 0.5 ? 'Passed' : 'Requires Review'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Financial Snap */}
                <div className="bg-white p-12 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40 flex flex-col">
                  <div className="flex justify-between items-center mb-12">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-4">
                      <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100"><CreditCard size={20} strokeWidth={3} /></div>
                      Fee Assessment
                    </h3>
                  </div>
                  
                  <div className="space-y-12 flex-1 flex flex-col justify-center">
                    <div className="p-16 rounded-[3rem] bg-slate-50 border border-slate-100 text-center relative overflow-hidden shadow-inner">
                      <div className="absolute inset-0 bg-emerald-500/[0.02] blur-3xl"></div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4 relative z-10">Outstanding Balance</p>
                      <p className={`text-6xl font-black relative z-10 tracking-tighter leading-none ${totalBalance > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                        ₦{totalBalance.toLocaleString()}
                      </p>
                      
                      {allPaid && (
                        <div className="mt-10 inline-flex items-center gap-3 px-10 py-4 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm relative z-10">
                          <CheckCircle size={18} strokeWidth={3} /> Verified: All Settled
                        </div>
                      )}
                      
                      {hasOverdue && (
                        <div className="mt-10 inline-flex items-center gap-3 px-10 py-4 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest border border-red-100 shadow-sm animate-pulse relative z-10">
                          <Clock size={18} strokeWidth={3} /> Action: Payment Overdue
                        </div>
                      )}
                    </div>

                    <button 
                      id="btn_parent_view_invoice_ledger"
                      onClick={() => setActiveTab('finance')}
                      className="w-full py-7 rounded-[2.5rem] bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/10 flex items-center justify-center gap-4 active:scale-95"
                    >
                      View Invoice Ledger <ChevronRight size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Announcements & AI Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-12 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/40">
                  <div className="flex justify-between items-center mb-12">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-4">
                      <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100"><Bell size={20} strokeWidth={3} /></div>
                      Institutional Updates
                    </h3>
                  </div>
                  <div className="space-y-6">
                    {announcements.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center bg-slate-50/50 rounded-[2.5rem] border border-slate-100 border-dashed">
                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-slate-200 mb-8 shadow-sm">
                          <Bell size={36} />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Inbox clear.</p>
                      </div>
                    ) : (
                      announcements.slice(0, 3).map((note, i) => (
                        <div key={i} className="p-10 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 hover:border-white hover:bg-white hover:shadow-2xl transition-all group">
                          <div className="flex justify-between items-center mb-8">
                            <span className={`text-[8px] uppercase font-black px-5 py-2 rounded-full border tracking-widest shadow-sm ${
                              note.isSchoolWide 
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                              {note.isSchoolWide ? 'Global' : 'Specific'}
                            </span>
                            <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">{new Date(note.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                          </div>
                          <h4 className="font-black uppercase tracking-widest text-sm text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">{formatDisplayString(note.title)}</h4>
                          <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest leading-relaxed line-clamp-3 opacity-70">{note.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-16 rounded-[4rem] relative overflow-hidden flex flex-col min-h-[500px] shadow-2xl shadow-slate-200/40 border border-white">
                  <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col h-full justify-center">
                    <div className="flex items-center gap-10 mb-16">
                      <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-xl border border-indigo-100">
                        <Heart size={48} strokeWidth={2.5} fill="currentColor" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">AI Companion</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-3">Machine Learning Intelligence</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 mb-16">
                      <div className="bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 text-center shadow-sm">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Mastery Grade</p>
                        <p className="text-5xl font-black text-slate-900 tracking-tighter">Level {activeStudent?.level || 1}</p>
                      </div>
                      <div className="bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 text-center shadow-sm">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Total XP</p>
                        <p className="text-5xl font-black text-slate-900 tracking-tighter">{activeStudent?.xp || 0}</p>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-600 p-10 rounded-[3rem] border border-indigo-500 relative overflow-hidden shadow-2xl shadow-indigo-200">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                      <p className="text-[11px] text-white font-black uppercase tracking-widest leading-relaxed relative z-10 italic">
                        "{formatDisplayString(activeStudent?.firstName)} continues to show exceptional analytical capacity. Our algorithms recommend additional focus on abstract problem solving to bridge the level gap."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
