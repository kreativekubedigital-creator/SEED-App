import React, { useState, useEffect, useRef } from 'react';
import { db, collection, query, where, getDocs, doc, getDoc, OperationType, handleFirestoreError } from '../../firebase';
import { UserProfile, School, Session, Term, Class, Result, Subject, GradeScale } from '../../types';
import { ReportCard } from './ReportCard';
import { Loader2, Printer, Search, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, sortByFullName } from '../../lib/utils';

interface ClassReportCardsProps {
  school: School;
}

export const ClassReportCards: React.FC<ClassReportCardsProps> = ({ school }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeScale, setGradeScale] = useState<GradeScale | null>(null);

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [results, setResults] = useState<Record<string, Result[]>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [previewStudent, setPreviewStudent] = useState<UserProfile | null>(null);
  const [showAllPreview, setShowAllPreview] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [sessionsSnap, classesSnap, subjectsSnap, gradeScaleSnap] = await Promise.all([
          getDocs(collection(db, 'schools', school.id, 'sessions')),
          getDocs(collection(db, 'schools', school.id, 'classes')),
          getDocs(collection(db, 'schools', school.id, 'subjects')),
          getDocs(collection(db, 'schools', school.id, 'gradeScales'))
        ]);

        const sessionsData = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
        sessionsData.sort((a, b) => b.name.localeCompare(a.name)); // Sort sessions descending (usually newer first)
        setSessions(sessionsData);
        const currentSession = sessionsData.find(s => s.isCurrent);
        if (currentSession) setSelectedSession(currentSession.id);

        const classesData = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
        setClasses(sortByName(classesData));

        const subjectsData = subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
        setSubjects(sortByName(subjectsData));

        if (!gradeScaleSnap.empty) {
          setGradeScale({ id: gradeScaleSnap.docs[0].id, ...gradeScaleSnap.docs[0].data() } as GradeScale);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'initial_data');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitialData();
  }, [school.id]);

  useEffect(() => {
    if (!selectedSession) {
      setTerms([]);
      return;
    }
    const fetchTerms = async () => {
      try {
        const termsSnap = await getDocs(collection(db, 'schools', school.id, 'sessions', selectedSession, 'terms'));
        const termsData = termsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Term));
        setTerms(sortByName(termsData));
        const currentTerm = termsData.find(t => t.isCurrent);
        if (currentTerm) setSelectedTerm(currentTerm.id);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'terms');
      }
    };
    fetchTerms();
  }, [selectedSession, school.id]);

  const handleGenerateReports = async () => {
    if (!selectedSession || !selectedTerm || !selectedClass) return;

    setLoading(true);
    try {
      // Fetch students in class
      const qStudents = query(
        collection(db, 'users'),
        where('schoolId', '==', school.id),
        where('role', '==', 'student'),
        where('classId', '==', selectedClass)
      );
      const studentsSnap = await getDocs(qStudents);
      const studentsData = studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setStudents(sortByFullName(studentsData));

      // Fetch results for this class, session, term
      const qResults = query(
        collection(db, 'schools', school.id, 'results'),
        where('sessionId', '==', selectedSession),
        where('termId', '==', selectedTerm),
        where('classId', '==', selectedClass)
      );
      const resultsSnap = await getDocs(qResults);
      
      const resultsByStudent: Record<string, Result[]> = {};
      studentsData.forEach(s => { resultsByStudent[s.uid] = []; });

      resultsSnap.docs.forEach(d => {
        const res = { id: d.id, ...d.data() } as Result;
        if (!resultsByStudent[res.studentId]) {
          resultsByStudent[res.studentId] = [];
        }
        resultsByStudent[res.studentId].push(res);
      });

      setResults(resultsByStudent);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'reports_data');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const sessionObj = sessions.find(s => s.id === selectedSession) || null;
  const termObj = terms.find(t => t.id === selectedTerm) || null;
  const classObj = classes.find(c => c.id === selectedClass) || null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
        <h2 className="text-xl font-medium text-gray-800 mb-6">Generate Report Cards</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Session</label>
            <select
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm text-gray-800 cursor-pointer"
            >
              <option value="">Select Session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Term</label>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              disabled={!selectedSession}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm text-gray-800 cursor-pointer disabled:opacity-50"
            >
              <option value="">Select Term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm text-gray-800 cursor-pointer"
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateReports}
              disabled={!selectedSession || !selectedTerm || !selectedClass || loading}
              className="w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Generate
            </button>
          </div>
        </div>
      </div>

      {students.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Report Cards Ready</h3>
                <p className="text-xs text-gray-800 font-medium">{students.length} students found in {classObj?.name}</p>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={() => setShowAllPreview(true)}
                className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-medium text-sm hover:bg-blue-100 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Search size={18} />
                Preview All
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Printer size={18} />
                Print All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
            {students.map(student => (
              <div key={student.uid} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3 overflow-hidden">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-800 shrink-0 border border-gray-100">
                      {student.firstName.charAt(0)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-medium text-gray-800 truncate">{student.firstName} {student.lastName}</p>
                    <p className="text-[10px] text-gray-800 font-medium uppercase tracking-wider truncate">{student.registrationNumber || 'No Reg No'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewStudent(student)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  title="Preview Report Card"
                >
                  <Search size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Preview Modal */}
      <AnimatePresence>
        {previewStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm print:hidden">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-xl font-medium text-gray-800">Preview: {previewStudent.firstName} {previewStudent.lastName}</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      // To print just one, we can use a trick or just let them print all
                      // For now, let's just print all or add a single print mode
                      window.print();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Printer size={18} />
                    Print
                  </button>
                  <button
                    onClick={() => setPreviewStudent(null)}
                    className="p-2 text-gray-800 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto">
                <ReportCard
                  student={previewStudent}
                  school={school}
                  session={sessionObj}
                  term={termObj}
                  studentClass={classObj}
                  results={results[previewStudent.uid] || []}
                  subjects={subjects}
                  gradeScale={gradeScale}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview All Modal */}
      <AnimatePresence>
        {showAllPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm print:hidden">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-xl font-medium text-gray-800">Preview All Report Cards</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Printer size={18} />
                    Print All
                  </button>
                  <button
                    onClick={() => setShowAllPreview(false)}
                    className="p-2 text-gray-800 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto space-y-8 bg-gray-50">
                {students.map(student => (
                  <div key={student.uid} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <ReportCard
                      student={student}
                      school={school}
                      session={sessionObj}
                      term={termObj}
                      studentClass={classObj}
                      results={results[student.uid] || []}
                      subjects={subjects}
                      gradeScale={gradeScale}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Area */}
      <div className="hidden print:block space-y-0">
        {students.map((student, index) => (
          <div key={student.uid} className="print:break-after-page print:h-screen print:w-full print:flex print:flex-col print:justify-center">
            <ReportCard
              student={student}
              school={school}
              session={sessionObj}
              term={termObj}
              studentClass={classObj}
              results={results[student.uid] || []}
              subjects={subjects}
              gradeScale={gradeScale}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
