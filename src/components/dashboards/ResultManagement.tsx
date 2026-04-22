import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, addDoc, updateDoc, setDoc, doc, onSnapshot, serverTimestamp, OperationType, handleFirestoreError } from '../../firebase';
import { UserProfile, Class, Subject, Result, Session, Term, GradeScale } from '../../types';
import { Save, Search, ChevronRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, sortByFullName } from '../../lib/utils';

interface ResultManagementProps {
  user: UserProfile;
}

export const ResultManagement = ({ user }: ResultManagementProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [gradeScale, setGradeScale] = useState<GradeScale | null>(null);
  
  const [teacherSubjects, setTeacherSubjects] = useState<Subject[]>([]);
  
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [scores, setScores] = useState<Record<string, Partial<Result>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeRow, setActiveRow] = useState<string | null>(null);

  const defaultGradeScale: GradeScale = {
    id: 'default',
    schoolId: user.schoolId || '',
    grades: [
      { grade: 'A', minScore: 70, maxScore: 100, remark: 'Excellent' },
      { grade: 'B', minScore: 60, maxScore: 69, remark: 'Very Good' },
      { grade: 'C', minScore: 50, maxScore: 59, remark: 'Good' },
      { grade: 'D', minScore: 45, maxScore: 49, remark: 'Fair' },
      { grade: 'E', minScore: 40, maxScore: 44, remark: 'Pass' },
      { grade: 'F', minScore: 0, maxScore: 39, remark: 'Fail' },
    ]
  };

  useEffect(() => {
    if (!user.schoolId) return;

    const unsubSessions = onSnapshot(collection(db, 'schools', user.schoolId, 'sessions'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
      data.sort((a, b) => b.name.localeCompare(a.name));
      setSessions(data);
      const current = data.find(s => s.isCurrent);
      if (current) setSelectedSession(current.id);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/sessions`));

    const unsubClasses = onSnapshot(collection(db, 'schools', user.schoolId, 'classes'), (snap) => {
      setClasses(sortByName(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class))));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/classes`));

    let unsubTeacherSubjects = () => {};
    if (user.role === 'teacher') {
      const q = query(collection(db, 'schools', user.schoolId, 'subjects'), where('teacherId', '==', user.uid));
      unsubTeacherSubjects = onSnapshot(q, (snap) => {
        setTeacherSubjects(sortByName(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject))));
      }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/subjects`));
    }

    const unsubGradeScale = onSnapshot(collection(db, 'schools', user.schoolId, 'gradeScales'), (snap) => {
      if (!snap.empty) {
        setGradeScale({ id: snap.docs[0].id, ...snap.docs[0].data() } as GradeScale);
      } else {
        setGradeScale(defaultGradeScale);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/gradeScales`));

    return () => {
      unsubSessions();
      unsubClasses();
      unsubTeacherSubjects();
      unsubGradeScale();
    };
  }, [user.schoolId, user.role, user.uid]);

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
    if (!selectedClass) {
      setSubjects([]);
      setStudents([]);
      setSelectedSubject('');
      return;
    }

    setSelectedSubject(''); // Reset subject when class changes

    const unsubSubjects = onSnapshot(collection(db, 'schools', user.schoolId, 'subjects'), (snap) => {
      const allSubjects = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
      
      const filteredSubjects = user.role === 'teacher'
        ? allSubjects.filter(s => {
            const matchesSelectedClass = s.classId === selectedClass;
            const isSubjectTeacher = s.teacherId === user.uid;
            const isClassTeacher = user.classId === selectedClass;
            return matchesSelectedClass && (isSubjectTeacher || isClassTeacher);
          })
        : allSubjects.filter(s => s.classId === selectedClass);
      setSubjects(sortByName(filteredSubjects));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/subjects`));

    const unsubStudents = onSnapshot(query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('classId', '==', selectedClass)), (snap) => {
      const studentsData = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)).filter(u => u.role === 'student');
      setStudents(sortByFullName(studentsData));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    return () => {
      unsubSubjects();
      unsubStudents();
    };
  }, [selectedClass, user.uid, user.role, user.classId, user.schoolId, teacherSubjects]);

  useEffect(() => {
    if (!selectedSession || !selectedTerm || !selectedClass || !selectedSubject || students.length === 0) return;

    setLoading(true);
    const qResults = query(
      collection(db, 'schools', user.schoolId, 'results'),
      where('classId', '==', selectedClass)
    );

    const unsubResults = onSnapshot(qResults, (snap) => {
      const existingScores: Record<string, Partial<Result>> = {};
      snap.docs.forEach(d => {
        const data = d.data() as Result;
        // Filter in memory to avoid complex composite indexes
        if (data.sessionId === selectedSession && data.termId === selectedTerm && data.subjectId === selectedSubject) {
          existingScores[data.studentId] = { id: d.id, ...data };
        }
      });
      
      const initialScores: Record<string, Partial<Result>> = {};
      students.forEach(student => {
        initialScores[student.uid] = existingScores[student.uid] || {
          ca1: 0, ca2: 0, ca3: 0, cas: {}, exam: 0, caTotal: 0, finalScore: 0, grade: '', remark: ''
        };
      });
      setScores(initialScores);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/results`);
    });

    return () => unsubResults();
  }, [selectedSession, selectedTerm, selectedClass, selectedSubject, students, user.schoolId]);

  const calculateGrade = (score: number) => {
    const scale = gradeScale || defaultGradeScale;
    if (!scale.grades || !Array.isArray(scale.grades)) {
      return { grade: 'F', remark: 'Fail' };
    }
    const gradeObj = scale.grades.find(g => score >= g.minScore && score <= g.maxScore);
    return gradeObj || { grade: 'F', remark: 'Fail' };
  };

  const handleScoreChange = (studentId: string, field: string, value: string) => {
    const numValue = value === '' ? 0 : Math.max(0, Number(value) || 0);
    const current = scores[studentId] || {
      ca1: 0, ca2: 0, ca3: 0, cas: {}, exam: 0, caTotal: 0, finalScore: 0, grade: '', remark: ''
    };
    
    let updated = { ...current };
    const caConfig = gradeScale?.caConfig || { cas: [{ name: 'CA1', maxScore: 10 }, { name: 'CA2', maxScore: 10 }, { name: 'CA3', maxScore: 20 }], maxExamScore: 60 };

    if (field === 'exam') {
      updated.exam = Math.min(caConfig.maxExamScore, numValue);
    } else if (field.startsWith('ca_')) {
      const caIndex = parseInt(field.split('_')[1]);
      const caDef = caConfig.cas[caIndex];
      if (caDef) {
        updated.cas = { ...updated.cas, [caDef.name]: Math.min(caDef.maxScore, numValue) };
      }
    } else {
      // Legacy
      if (field === 'ca1') updated.ca1 = Math.min(10, numValue);
      if (field === 'ca2') updated.ca2 = Math.min(10, numValue);
      if (field === 'ca3') updated.ca3 = Math.min(20, numValue);
    }
    
    // Calculate CA Total
    let caTotal = 0;
    if (caConfig && updated.cas && Object.keys(updated.cas).length > 0) {
      caTotal = Object.values(updated.cas).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
    } else {
      caTotal = (Number(updated.ca1) || 0) + (Number(updated.ca2) || 0) + (Number(updated.ca3) || 0);
    }

    const finalScore = caTotal + (Number(updated.exam) || 0);
    const { grade, remark } = calculateGrade(finalScore);

    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...updated,
        caTotal,
        finalScore,
        grade,
        remark
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedSession || !selectedTerm || !selectedClass || !selectedSubject) {
      setMessage({ type: 'error', text: 'Please select all required fields.' });
      return;
    }
    setSaving(true);
    setMessage(null);

    try {
      const promises = Object.entries(scores).map(async ([studentId, scoreData]: [string, Partial<Result>]) => {
        const resultData = {
          studentId,
          subjectId: selectedSubject,
          schoolId: user.schoolId,
          classId: selectedClass,
          sessionId: selectedSession,
          termId: selectedTerm,
          teacherId: user.uid,
          ca1: Number(scoreData.ca1) || 0,
          ca2: Number(scoreData.ca2) || 0,
          ca3: Number(scoreData.ca3) || 0,
          cas: scoreData.cas || {},
          exam: Number(scoreData.exam) || 0,
          caTotal: Number(scoreData.caTotal) || 0,
          finalScore: Number(scoreData.finalScore) || 0,
          grade: scoreData.grade || '',
          remark: scoreData.remark || '',
          score: Number(scoreData.finalScore) || 0, // Legacy
          total: 100, // Legacy
          date: new Date().toISOString(),
          createdAt: scoreData.createdAt || new Date().toISOString(),
          updatedAt: serverTimestamp()
        };

        // Use a deterministic ID to prevent duplicates: studentId_subjectId_sessionId_termId
        const resultId = scoreData.id || `${studentId}_${selectedSubject}_${selectedSession}_${selectedTerm}`;
        
        // Use setDoc with merge: true to either create or update
        await setDoc(doc(db, 'schools', user.schoolId, 'results', resultId), resultData, { merge: true });
      });

      await Promise.all(promises);
      setMessage({ type: 'success', text: 'Results saved successfully!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: `Failed to save results: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const caConfig = gradeScale?.caConfig || { cas: [{ name: 'CA1', maxScore: 10 }, { name: 'CA2', maxScore: 10 }, { name: 'CA3', maxScore: 20 }], maxExamScore: 60 };
  const totalCaMax = caConfig.cas.reduce((sum, ca) => sum + ca.maxScore, 0);

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Session</label>
            <select
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-pointer"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-pointer"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-pointer"
            >
              <option value="">Select Class</option>
              {classes
                .filter(c => user.role !== 'teacher' || teacherSubjects.some(s => s.classId === c.id) || c.id === user.classId)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-pointer"
            >
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedSubject && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-medium text-lg text-gray-800">Score Entry</h3>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Save All Results'}
            </button>
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
                <p className="font-medium">Loading students and scores...</p>
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
                        <th className="px-6 py-4">Student</th>
                        {caConfig.cas.map((ca, idx) => (
                          <th key={idx} className="px-4 py-4 w-24 text-center">{ca.name} ({ca.maxScore})</th>
                        ))}
                        <th className="px-4 py-4 w-24 text-center bg-blue-50/50">CA Total ({totalCaMax})</th>
                        <th className="px-4 py-4 w-24 text-center">Exam ({caConfig.maxExamScore})</th>
                        <th className="px-4 py-4 w-24 text-center bg-indigo-50/50">Final ({totalCaMax + caConfig.maxExamScore})</th>
                        <th className="px-4 py-4 w-20 text-center">Grade</th>
                        <th className="px-6 py-4">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.map(student => {
                        const score = scores[student.uid] || {};
                        return (
                          <tr key={student.uid} className={`transition-colors ${activeRow === student.uid ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`} onFocus={() => setActiveRow(student.uid)} onBlur={() => setActiveRow(null)}>
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-800">{student.firstName} {student.lastName}</div>
                              <div className="text-[10px] text-gray-800 font-medium uppercase tracking-wider">{student.registrationNumber || 'No Reg No'}</div>
                            </td>
                            {caConfig.cas.map((ca, idx) => {
                              const val = score.cas?.[ca.name] !== undefined ? score.cas[ca.name] : (idx === 0 ? score.ca1 : idx === 1 ? score.ca2 : idx === 2 ? score.ca3 : 0);
                              return (
                                <td key={idx} className="px-4 py-4">
                                  <input
                                    type="number"
                                    placeholder="-"
                                    value={val === 0 && !score.id && !score.cas?.[ca.name] ? '' : val}
                                    onChange={e => handleScoreChange(student.uid, `ca_${idx}`, e.target.value)}
                                    className="w-full text-center px-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-gray-800 transition-all disabled:opacity-50 disabled:bg-transparent cursor-text placeholder:text-gray-300"
                                  />
                                </td>
                              );
                            })}
                            <td className="px-4 py-4 bg-gray-100/80 text-center font-medium text-gray-800 border-x border-gray-50">
                              {score.caTotal || 0}
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="number"
                                placeholder="-"
                                value={score.exam === 0 && !score.id ? '' : score.exam}
                                onChange={e => handleScoreChange(student.uid, 'exam', e.target.value)}
                                className="w-full text-center px-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-gray-800 transition-all disabled:opacity-50 disabled:bg-transparent cursor-text placeholder:text-gray-300"
                              />
                            </td>
                            <td className="px-4 py-4 bg-blue-50/50 text-center font-medium text-blue-800 border-x border-blue-50/50">
                              {score.finalScore || 0}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-medium text-sm ${
                                score.grade === 'A' ? 'bg-emerald-50 text-emerald-600' :
                                score.grade === 'B' ? 'bg-blue-50 text-blue-600' :
                                score.grade === 'C' ? 'bg-amber-50 text-amber-600' :
                                'bg-red-50 text-red-600'
                              }`}>
                                {score.grade || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-medium text-gray-800 uppercase tracking-wider">{score.remark || '-'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/30">
                  {students.map((student) => {
                    const score = scores[student.uid] || {};
                    return (
                      <div key={student.uid} className={`bg-white rounded-2xl shadow-sm border ${activeRow === student.uid ? 'border-blue-300 bg-blue-50/20 ring-4 ring-blue-500/5' : 'border-gray-200'} p-4 flex flex-col gap-4 transition-all duration-200`} onFocus={() => setActiveRow(student.uid)} onBlur={() => setActiveRow(null)}>
                        <div className="flex items-center gap-3">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-medium text-blue-600 shrink-0">
                              {student.firstName?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm text-gray-800">{student.firstName} {student.lastName}</p>
                            <p className="text-[10px] text-gray-800 font-medium uppercase tracking-wider">{student.registrationNumber || 'No Reg No'}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {caConfig.cas.map((ca, idx) => {
                            const val = score.cas?.[ca.name] !== undefined ? score.cas[ca.name] : (idx === 0 ? score.ca1 : idx === 1 ? score.ca2 : idx === 2 ? score.ca3 : 0);
                            return (
                              <div key={idx} className="flex flex-col">
                                <span className="text-[10px] text-gray-800 text-center mb-1">{ca.name} ({ca.maxScore})</span>
                                <input
                                  type="number"
                                  placeholder="-"
                                  value={val === 0 && !score.id && !score.cas?.[ca.name] ? '' : val}
                                  onChange={e => handleScoreChange(student.uid, `ca_${idx}`, e.target.value)}
                                  className="w-full text-center px-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-gray-800 transition-all disabled:opacity-50 disabled:bg-transparent cursor-text placeholder:text-gray-300"
                                />
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                          <div className="flex flex-col items-center justify-center bg-gray-100/80 rounded-xl p-2">
                            <span className="text-[10px] text-gray-800 mb-1 font-medium">CA Total</span>
                            <span className="font-medium text-gray-800">{score.caTotal || 0}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-800 text-center mb-1">Exam ({caConfig.maxExamScore})</span>
                            <input
                              type="number"
                              placeholder="-"
                              value={score.exam === 0 && !score.id ? '' : score.exam}
                              onChange={e => handleScoreChange(student.uid, 'exam', e.target.value)}
                              className="w-full text-center px-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-gray-800 transition-all disabled:opacity-50 disabled:bg-transparent cursor-text placeholder:text-gray-300"
                            />
                          </div>
                          <div className="flex flex-col items-center justify-center bg-blue-50/80 rounded-xl p-2 border border-blue-100/50">
                            <span className="text-[10px] text-blue-600 mb-1 font-medium">Final</span>
                            <span className="font-medium text-blue-800">{score.finalScore || 0}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-800">Grade</span>
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${
                              score.grade === 'A' ? 'bg-emerald-50 text-emerald-600' :
                              score.grade === 'B' ? 'bg-blue-50 text-blue-600' :
                              score.grade === 'C' ? 'bg-amber-50 text-amber-600' :
                              'bg-red-50 text-red-600'
                            }`}>
                              {score.grade || '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-800">Remark</span>
                            <span className="text-[10px] font-medium text-gray-800 uppercase tracking-wider">{score.remark || '-'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-medium text-sm">{message.text}</p>
        </motion.div>
      )}
    </div>
  );
};
