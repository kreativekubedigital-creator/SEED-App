import { useState, useEffect } from 'react';
import { db, collection, doc, query, where, onSnapshot, OperationType, handleFirestoreError } from '../../firebase';
import { UserProfile, Result, Session, Term, Subject, GradeScale, Class } from '../../types';
import { Trophy, Target, TrendingUp, TrendingDown, BookOpen, Loader2, Award, Star, Printer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName } from '../../lib/utils';
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

  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'Unassigned';
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown Subject';

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

  const isFemale = user.gender === 'female';
  const containerClass = isFemale 
    ? "space-y-5 min-h-screen -mx-4 -mt-8 px-4 pt-8 bg-gradient-to-br from-[#FFD1D1] via-[#FFF3E0] to-[#E0F7FA]" 
    : "space-y-5";

  return (
    <div className={containerClass}>
      <div className="print:hidden space-y-5">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-medium text-gray-800 tracking-tight">{user.firstName} {user.lastName}</h2>
              <p className="text-gray-800 font-medium text-xs uppercase tracking-widest mt-1">
                Class: {getClassName(user.classId || '')} • Reg No: {user.registrationNumber || 'N/A'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportCard(true)}
                disabled={results.length === 0}
                className="px-4 py-2.5 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={18} />
                <span className="hidden sm:inline">Print Report</span>
              </button>
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm text-gray-800 shadow-sm cursor-pointer"
              >
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-8 p-1.5 bg-white/50 rounded-2xl w-fit">
            {['1st Term', '2nd Term', '3rd Term'].map((termName, index) => {
              const term = terms.find(t => t.name === termName);
              const colors = ['bg-orange-100', 'bg-blue-100', 'bg-purple-100'];
              const colorClass = colors[index % colors.length];
              return (
                <motion.button
                  whileHover={term ? { scale: 1.05 } : {}}
                  whileTap={term ? { scale: 0.95 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  key={termName}
                  onClick={() => term && setSelectedTerm(term.id)}
                  disabled={!term}
                  className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedTerm === term?.id 
                      ? `${colorClass} text-gray-800 shadow-sm` 
                      : 'text-gray-800 hover:text-gray-800 disabled:opacity-30'
                  }`}
                >
                  {termName}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-white/50">
                <h3 className="font-medium text-lg text-gray-800">Subject Performance</h3>
              </div>
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-20 flex flex-col items-center justify-center text-gray-800"
                  >
                    <Loader2 className="animate-spin mb-4" size={40} />
                    <p className="font-medium">Fetching results...</p>
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
                        <thead className="bg-gray-50/50 text-[10px] uppercase tracking-widest text-gray-800 font-medium">
                          <tr>
                            <th className="px-6 py-5">Subject</th>
                            {caConfig.cas.map((ca, idx) => (
                              <th key={idx} className="px-4 py-5 text-center">{ca.name}</th>
                            ))}
                            <th className="px-4 py-5 text-center">CA Total</th>
                            <th className="px-4 py-5 text-center">Exam</th>
                            <th className="px-4 py-5 text-center bg-blue-50/50">Final</th>
                            <th className="px-4 py-5 text-center">Grade</th>
                            <th className="px-6 py-5">Remark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {results.map(result => (
                            <tr key={result.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-6 py-5">
                                <div className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{getSubjectName(result.subjectId)}</div>
                              </td>
                              {caConfig.cas.map((ca, idx) => {
                                const val = result.cas?.[ca.name] !== undefined ? result.cas[ca.name] : (idx === 0 ? result.ca1 : idx === 1 ? result.ca2 : idx === 2 ? result.ca3 : null);
                                return (
                                  <td key={idx} className="px-4 py-5 text-center font-medium text-gray-800">{val !== null && val !== undefined ? val : '-'}</td>
                                );
                              })}
                              <td className="px-4 py-5 text-center font-medium text-gray-800">{result.caTotal || 0}</td>
                              <td className="px-4 py-5 text-center font-medium text-gray-800">{result.exam !== null && result.exam !== undefined ? result.exam : '-'}</td>
                              <td className="px-4 py-5 text-center font-medium text-blue-600 bg-blue-50/20">{result.finalScore || 0}</td>
                              <td className="px-4 py-5 text-center">
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-medium text-sm ${
                                  result.grade === 'A' ? 'bg-emerald-50 text-emerald-600' :
                                  result.grade === 'B' ? 'bg-blue-50 text-blue-600' :
                                  result.grade === 'C' ? 'bg-amber-50 text-amber-600' :
                                  'bg-red-50 text-red-600'
                                }`}>
                                  {result.grade || '-'}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <span className="text-[10px] font-medium text-gray-800 uppercase tracking-wider">{result.remark || '-'}</span>
                              </td>
                            </tr>
                          ))}
                          {results.length === 0 && (
                            <tr>
                              <td colSpan={caConfig.cas.length + 5} className="px-6 py-20 text-center text-gray-800 font-medium">
                                No results found for this term.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/30">
                      {results.map(result => (
                        <div key={result.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm text-gray-800">{getSubjectName(result.subjectId)}</div>
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${
                              result.grade === 'A' ? 'bg-emerald-50 text-emerald-600' :
                              result.grade === 'B' ? 'bg-blue-50 text-blue-600' :
                              result.grade === 'C' ? 'bg-amber-50 text-amber-600' :
                              'bg-red-50 text-red-600'
                            }`}>
                              {result.grade || '-'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
                            {caConfig.cas.map((ca, idx) => {
                              const val = result.cas?.[ca.name] !== undefined ? result.cas[ca.name] : (idx === 0 ? result.ca1 : idx === 1 ? result.ca2 : idx === 2 ? result.ca3 : null);
                              return (
                                <div key={idx} className="flex flex-col items-center justify-center">
                                  <span className="text-[10px] text-gray-800 mb-1">{ca.name}</span>
                                  <span className="font-medium text-gray-800">{val !== null && val !== undefined ? val : '-'}</span>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[10px] text-gray-800 mb-1">CA Total</span>
                              <span className="font-medium text-gray-800">{result.caTotal || 0}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[10px] text-gray-800 mb-1">Exam</span>
                              <span className="font-medium text-gray-800">{result.exam !== null && result.exam !== undefined ? result.exam : '-'}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[10px] text-blue-400/80 mb-1">Final</span>
                              <span className="font-medium text-blue-600">{result.finalScore || 0}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                            <span className="text-xs text-gray-800">Remark</span>
                            <span className="text-[10px] font-medium text-gray-800 uppercase tracking-wider">{result.remark || '-'}</span>
                          </div>
                        </div>
                      ))}
                      {results.length === 0 && (
                        <div className="py-8 text-center text-gray-800 text-sm">No results found for this term.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
              <h3 className="font-medium text-lg text-gray-800 mb-6">Summary</h3>
              <div className="space-y-5">
                <div className="flex justify-between items-center p-4 rounded-2xl bg-blue-100 border border-white/50">
                  <div>
                    <p className="text-[10px] font-medium text-gray-700 uppercase tracking-widest">Average Score</p>
                    <p className="text-xl font-medium text-gray-800">{stats.average.toFixed(1)}%</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center text-gray-800 shadow-sm">
                    <TrendingUp size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-orange-100 border border-white/50">
                    <p className="text-[10px] font-medium text-gray-700 uppercase tracking-widest">Total Score</p>
                    <p className="text-xl font-medium text-gray-800">{stats.total}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-100 border border-white/50">
                    <p className="text-[10px] font-medium text-gray-700 uppercase tracking-widest">Overall Grade</p>
                    <p className="text-xl font-medium text-gray-800">{getOverallGrade(stats.average)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-green-100 border border-white/50">
                    <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center text-gray-800">
                      <Star size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-700 uppercase tracking-widest">Best Subject</p>
                      <p className="font-medium text-gray-800">{stats.best ? getSubjectName(stats.best.subjectId) : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-pink-100 border border-white/50">
                    <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center text-gray-800">
                      <Target size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-700 uppercase tracking-widest">Needs Focus</p>
                      <p className="font-medium text-gray-800">{stats.weakest ? getSubjectName(stats.weakest.subjectId) : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-100 p-4 rounded-2xl text-gray-800 shadow-xl shadow-yellow-200/50 relative overflow-hidden">
              <div className="relative z-10">
                <Award className="mb-4 opacity-50" size={40} />
                <h4 className="text-xl font-medium mb-2">Academic Excellence</h4>
                <p className="text-gray-800 text-sm leading-relaxed">
                  Keep up the great work! Your performance in {stats.best ? getSubjectName(stats.best.subjectId) : 'your subjects'} is outstanding.
                </p>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/60 rounded-full blur-2xl" />
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
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-xl font-medium text-gray-800">Student Report Card Preview</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Printer size={18} />
                    Print
                  </button>
                  <button
                    onClick={() => setShowReportCard(false)}
                    className="p-2 text-gray-800 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
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
