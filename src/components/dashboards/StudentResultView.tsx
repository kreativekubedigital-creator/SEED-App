import { useState, useEffect } from 'react';
import { db, collection, doc, query, where, onSnapshot, OperationType, handleFirestoreError } from '../../lib/compatibility';
import { UserProfile, Result, Session, Term, Subject, GradeScale, Class } from '../../types';
import { Trophy, Target, TrendingUp, TrendingDown, BookOpen, Loader2, Award, Star, Printer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, formatDisplayString } from '../../lib/utils';
import { ReportCard } from './ReportCard';

interface StudentResultViewProps {
  user: UserProfile;
}

export const StudentResultView = ({ user }: StudentResultViewProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [gradeScale, setGradeScale] = useState<GradeScale | null>(null);
  
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReportCard, setShowReportCard] = useState(false);

  useEffect(() => {
    if (!user.schoolId) return;

    const unsubSchool = onSnapshot(doc(db, 'schools', user.schoolId), (docSnap) => {
      if (docSnap.exists()) {
        setSchool({ id: docSnap.id, ...docSnap.data() });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}`));

    const unsubSessions = onSnapshot(collection(db, 'schools', user.schoolId, 'sessions'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
      data.sort((a, b) => b.name.localeCompare(a.name));
      setSessions(data);
      const current = data.find(s => s.isCurrent);
      if (current) setSelectedSession(current.id);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/sessions`));

    const unsubSubjects = onSnapshot(collection(db, 'schools', user.schoolId, 'subjects'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
      setSubjects(sortByName(data));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/subjects`));

    const unsubClasses = onSnapshot(collection(db, 'schools', user.schoolId, 'classes'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
      setClasses(sortByName(data));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/classes`));

    const unsubGradeScale = onSnapshot(collection(db, 'schools', user.schoolId, 'gradeScales'), (snap) => {
      if (!snap.empty) {
        setGradeScale({ id: snap.docs[0].id, ...snap.docs[0].data() } as GradeScale);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/gradeScales`));

    return () => {
      unsubSchool();
      unsubSessions();
      unsubSubjects();
      unsubClasses();
      unsubGradeScale();
    };
  }, [user.schoolId]);

  useEffect(() => {
    if (!selectedSession) {
      setTerms([]);
      return;
    }
    const unsubTerms = onSnapshot(collection(db, 'schools', user.schoolId, 'sessions', selectedSession, 'terms'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Term));
      setTerms(sortByName(data));
      const current = data.find(t => t.isCurrent);
      if (current) setSelectedTerm(current.id);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/sessions/${selectedSession}/terms`));
    return () => unsubTerms();
  }, [selectedSession]);

  useEffect(() => {
    if (!selectedSession || !selectedTerm || !user.uid) return;

    setLoading(true);
    const qResults = query(
      collection(db, 'schools', user.schoolId, 'results'),
      where('sessionId', '==', selectedSession),
      where('termId', '==', selectedTerm),
      where('studentId', '==', user.uid)
    );

    const unsubResults = onSnapshot(qResults, (snap) => {
      setResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Result)));
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'results');
    });

    return () => unsubResults();
  }, [selectedSession, selectedTerm, user.uid]);

  const getClassName = (id: string) => formatDisplayString(classes.find(c => c.id === id)?.name || 'Unassigned');
  const getSubjectName = (id: string) => formatDisplayString(subjects.find(s => s.id === id)?.name || 'Unknown Subject');

  const stats = {
    total: results.reduce((acc, curr) => acc + (curr.finalScore || 0), 0),
    average: results.length > 0 ? results.reduce((acc, curr) => acc + (curr.finalScore || 0), 0) / results.length : 0,
    best: results.length > 0 ? results.reduce((prev, curr) => (prev.finalScore > curr.finalScore) ? prev : curr) : null,
    weakest: results.length > 0 ? results.reduce((prev, curr) => (prev.finalScore < curr.finalScore) ? prev : curr) : null,
  };

  const getOverallGrade = (avg: number) => {
    if (!gradeScale) return '-';
    const gradeObj = gradeScale.grades.find(g => avg >= g.minScore && avg <= g.maxScore);
    return gradeObj?.grade || '-';
  };

  const caConfig = gradeScale?.caConfig || { cas: [{ name: 'CA1', maxScore: 10 }, { name: 'CA2', maxScore: 10 }, { name: 'CA3', maxScore: 20 }], maxExamScore: 60 };
  const totalCaMax = caConfig.cas.reduce((sum, ca) => sum + ca.maxScore, 0);

  const containerClass = "space-y-6";

  return (
    <div className={containerClass}>
      <div className="print:hidden space-y-8">
        <div className="bg-white/80 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-white/50 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{formatDisplayString(user.firstName)} {formatDisplayString(user.lastName)}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-black uppercase tracking-widest text-[8px]">
                  {getClassName(user.classId || '')}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Reg No: {user.registrationNumber || 'N/A'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button
                id="btn_student_result_print_report"
                onClick={() => setShowReportCard(true)}
                disabled={results.length === 0}
                className="flex-1 md:flex-none px-6 py-3.5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-500/20 active:scale-95"
              >
                <Printer size={18} />
                Print Report Card
              </button>
              <div className="relative group flex-1 md:flex-none">
                <select
                  id="select_student_result_session"
                  value={selectedSession}
                  onChange={e => setSelectedSession(e.target.value)}
                  className="w-full appearance-none pl-6 pr-12 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900 cursor-pointer shadow-sm"
                >
                  {sessions.map(s => <option key={s.id} value={s.id}>{formatDisplayString(s.name)}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <TrendingDown size={14} className="rotate-0" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-10 p-2 bg-slate-50 rounded-[2rem] w-fit border border-slate-100/50">
            {['1st Term', '2nd Term', '3rd Term'].map((termName, index) => {
              const term = terms.find(t => t.name === termName);
              const activeStyles = [
                'bg-white text-orange-600 shadow-xl shadow-orange-500/10 border-orange-100',
                'bg-white text-blue-600 shadow-xl shadow-blue-500/10 border-blue-100',
                'bg-white text-purple-600 shadow-xl shadow-purple-500/10 border-purple-100'
              ];
              const isActive = selectedTerm === term?.id;
              
              return (
                <motion.button
                  whileHover={term ? { scale: 1.02 } : {}}
                  whileTap={term ? { scale: 0.98 } : {}}
                  key={termName}
                  id={`btn_student_result_term_${index + 1}`}
                  onClick={() => term && setSelectedTerm(term.id)}
                  disabled={!term}
                  className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all border border-transparent ${
                    isActive 
                      ? activeStyles[index % activeStyles.length]
                      : 'text-slate-400 hover:text-slate-900'
                  } disabled:opacity-30`}
                >
                  {termName}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-white/50 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-900">Academic Breakdown</h3>
                {!loading && results.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-black uppercase tracking-widest text-[8px]">
                    {results.length} Subjects
                  </span>
                )}
              </div>
              
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-32 flex flex-col items-center justify-center text-slate-900"
                  >
                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
                    <p className="font-black uppercase tracking-widest text-[10px]">Processing results...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full"
                  >
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                          <tr>
                            <th className="pl-8 pr-4 py-5">Subject Name</th>
                            {caConfig.cas.map((ca, idx) => (
                              <th key={idx} className="px-4 py-5 text-center">{ca.name}</th>
                            ))}
                            <th className="px-4 py-5 text-center">CA</th>
                            <th className="px-4 py-5 text-center">Exam</th>
                            <th className="px-4 py-5 text-center bg-blue-50/30 text-blue-600">Total</th>
                            <th className="px-4 py-5 text-center">Grade</th>
                            <th className="pr-8 pl-4 py-5">Remark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {results.map(result => (
                            <tr key={result.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="pl-8 pr-4 py-6">
                                <div className="font-black uppercase tracking-tighter text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{getSubjectName(result.subjectId)}</div>
                              </td>
                              {caConfig.cas.map((ca, idx) => {
                                const val = result.cas?.[ca.name] !== undefined ? result.cas[ca.name] : (idx === 0 ? result.ca1 : idx === 1 ? result.ca2 : idx === 2 ? result.ca3 : null);
                                return (
                                  <td key={idx} className="px-4 py-6 text-center font-bold text-slate-900">{val !== null && val !== undefined ? val : '-'}</td>
                                );
                              })}
                              <td className="px-4 py-6 text-center font-bold text-slate-900">{result.caTotal || 0}</td>
                              <td className="px-4 py-6 text-center font-bold text-slate-900">{result.exam !== null && result.exam !== undefined ? result.exam : '-'}</td>
                              <td className="px-4 py-6 text-center font-black text-blue-600 bg-blue-50/10">{result.finalScore || 0}</td>
                              <td className="px-4 py-6 text-center">
                                <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest ${
                                  result.grade === 'A' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  result.grade === 'B' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                  result.grade === 'C' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                  'bg-rose-50 text-rose-600 border border-rose-100'
                                }`}>
                                  {result.grade || '-'}
                                </span>
                              </td>
                              <td className="pr-8 pl-4 py-6">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{formatDisplayString(result.remark || '-')}</span>
                              </td>
                            </tr>
                          ))}
                          {results.length === 0 && (
                            <tr>
                              <td colSpan={caConfig.cas.length + 5} className="py-32 text-center">
                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No results found for this term</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/30">
                      {results.map(result => (
                        <div key={result.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col gap-6">
                          <div className="flex items-center justify-between">
                            <div className="font-black uppercase tracking-tighter text-sm text-slate-900">{getSubjectName(result.subjectId)}</div>
                            <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest ${
                              result.grade === 'A' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              result.grade === 'B' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                              result.grade === 'C' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                              {result.grade || '-'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                            {caConfig.cas.map((ca, idx) => {
                              const val = result.cas?.[ca.name] !== undefined ? result.cas[ca.name] : (idx === 0 ? result.ca1 : idx === 1 ? result.ca2 : idx === 2 ? result.ca3 : null);
                              return (
                                <div key={idx} className="flex flex-col">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{ca.name} Score</span>
                                  <span className="font-bold text-slate-900">{val !== null && val !== undefined ? val : '-'}</span>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">CA Total</span>
                              <span className="font-bold text-slate-900">{result.caTotal || 0}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Exam</span>
                              <span className="font-bold text-slate-900">{result.exam !== null && result.exam !== undefined ? result.exam : '-'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-1">Final</span>
                              <span className="font-black text-blue-600">{result.finalScore || 0}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Teacher's Remark</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{formatDisplayString(result.remark || '-')}</span>
                          </div>
                        </div>
                      ))}
                      {results.length === 0 && (
                        <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">No results available</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/50 shadow-sm">
              <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-900 mb-10">Performance Overview</h3>
              <div className="space-y-6">
                <div className="group flex justify-between items-center p-6 rounded-[2rem] bg-blue-50 border border-blue-100/50 transition-all hover:scale-105">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-1">Average Score</p>
                    <p className="text-3xl font-black tracking-tighter text-blue-600">{stats.average.toFixed(1)}%</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-xl shadow-blue-500/10 group-hover:rotate-12 transition-transform">
                    <TrendingUp size={28} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-[2rem] bg-orange-50 border border-orange-100/50">
                    <p className="text-[8px] font-black uppercase tracking-widest text-orange-400 mb-1">Total Points</p>
                    <p className="text-2xl font-black tracking-tighter text-orange-600">{stats.total}</p>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-purple-50 border border-purple-100/50">
                    <p className="text-[8px] font-black uppercase tracking-widest text-purple-400 mb-1">Overall Grade</p>
                    <p className="text-2xl font-black tracking-tighter text-purple-600">{getOverallGrade(stats.average)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-5 rounded-[2rem] bg-white border border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                      <Star size={24} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Best Subject</p>
                      <p className="font-black uppercase tracking-tighter text-sm text-slate-900">{stats.best ? getSubjectName(stats.best.subjectId) : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-5 rounded-[2rem] bg-white border border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                      <Target size={24} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Needs Focus</p>
                      <p className="font-black uppercase tracking-tighter text-sm text-slate-900">{stats.weakest ? getSubjectName(stats.weakest.subjectId) : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform">
                  <Award size={32} />
                </div>
                <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">Excellence Journey</h4>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  Keep up the great work! Your performance in {stats.best ? getSubjectName(stats.best.subjectId) : 'your subjects'} is outstanding.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-600 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
            </div>
          </div>
        </div>
      </div>


      {/* Report Card Modal (Preview) */}
      <AnimatePresence>
        {showReportCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm print:hidden"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-xl font-medium text-slate-900">Student Report Card Preview</h3>
                <div className="flex items-center gap-3">
                  <button
                    id="btn_student_result_modal_print"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Printer size={18} />
                    Print
                  </button>
                  <button
                    id="btn_student_result_modal_close"
                    onClick={() => setShowReportCard(false)}
                    className="p-2 text-slate-900 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto">
                <ReportCard
                  student={user}
                  school={school}
                  session={sessions.find(s => s.id === selectedSession) || null}
                  term={terms.find(t => t.id === selectedTerm) || null}
                  studentClass={classes.find(c => c.id === user.classId) || null}
                  results={results}
                  subjects={subjects}
                  gradeScale={gradeScale}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedicated Print Area */}
      <div className="hidden print:block">
        <ReportCard
          student={user}
          school={school}
          session={sessions.find(s => s.id === selectedSession) || null}
          term={terms.find(t => t.id === selectedTerm) || null}
          studentClass={classes.find(c => c.id === user.classId) || null}
          results={results}
          subjects={subjects}
          gradeScale={gradeScale}
        />
      </div>
    </div>
  );
};
