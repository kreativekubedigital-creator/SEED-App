import { useState, useEffect, useMemo } from 'react';
import { db, collection, query, where, addDoc, updateDoc, doc, onSnapshot, OperationType, handleFirestoreError, writeBatch } from '../../firebase';
import { UserProfile, Class, Subject, Result, Session, Term, GradeScale } from '../../types';
import { Save, Search, ChevronRight, AlertCircle, CheckCircle2, Loader2, Send, RotateCcw, MessageSquare, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, sortByFullName } from '../../lib/utils';

interface TeacherResultWorkspaceProps {
  user: UserProfile;
}

export const TeacherResultWorkspace = ({ user }: TeacherResultWorkspaceProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [gradeScale, setGradeScale] = useState<GradeScale | null>(null);
  
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [scores, setScores] = useState<Record<string, Partial<Result>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeRow, setActiveRow] = useState<string | null>(null);
  
  const [bulkCa1, setBulkCa1] = useState('');
  const [showBulkOptions, setShowBulkOptions] = useState(false);

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
      if (current && !selectedSession) setSelectedSession(current.id);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/sessions`));

    const unsubClasses = onSnapshot(collection(db, 'schools', user.schoolId, 'classes'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
      setClasses(sortByName(data));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/classes`));

    const unsubSubjects = onSnapshot(collection(db, 'schools', user.schoolId, 'subjects'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
      setAllSubjects(sortByName(data));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/subjects`));

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
      unsubSubjects();
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
      if (current && !selectedTerm) setSelectedTerm(current.id);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/sessions/${selectedSession}/terms`));
    return () => unsubTerms();
  }, [selectedSession, user.schoolId]);

  const availableClasses = useMemo(() => {
    if (user.role !== 'teacher') return classes;
    return classes.filter(c => 
      c.id === user.classId || allSubjects.some(s => s.classId === c.id && s.teacherId === user.uid)
    );
  }, [classes, allSubjects, user.classId, user.uid, user.role]);

  const availableSubjects = useMemo(() => {
    if (!selectedClass) return [];
    if (user.role !== 'teacher') return allSubjects.filter(s => s.classId === selectedClass);
    return allSubjects.filter(s => 
      s.classId === selectedClass && (s.teacherId === user.uid || user.classId === selectedClass)
    );
  }, [allSubjects, selectedClass, user.uid, user.classId, user.role]);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSelectedSubject('');
      return;
    }

    if (!availableSubjects.find(s => s.id === selectedSubject)) {
      setSelectedSubject('');
    }

    const unsubStudents = onSnapshot(query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('classId', '==', selectedClass)), (snap) => {
      const data = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)).filter(u => u.role === 'student');
      setStudents(sortByFullName(data));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    return () => {
      unsubStudents();
    };
  }, [selectedClass, user.schoolId, availableSubjects]);

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
        if (data.sessionId === selectedSession && data.termId === selectedTerm && data.subjectId === selectedSubject) {
          existingScores[data.studentId] = { id: d.id, ...data };
        }
      });
      
      const initialScores: Record<string, Partial<Result>> = {};
      students.forEach(student => {
        initialScores[student.uid] = existingScores[student.uid] || {
          ca1: null, ca2: null, ca3: null, cas: {}, exam: null, caTotal: 0, finalScore: 0, grade: '', remark: '', status: 'draft'
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
    const numValue = value === '' ? null : Math.max(0, Number(value) || 0);
    
    const current = scores[studentId] || {
      ca1: null, ca2: null, ca3: null, cas: {}, exam: null, caTotal: 0, finalScore: 0, grade: '', remark: '', status: 'draft'
    };
    
    let updated = { ...current };
    const caConfig = gradeScale?.caConfig || { cas: [{ name: 'CA1', maxScore: 10 }, { name: 'CA2', maxScore: 10 }, { name: 'CA3', maxScore: 20 }], maxExamScore: 60 };

    if (field === 'exam') {
      updated.exam = numValue !== null ? Math.min(caConfig.maxExamScore, numValue) : null;
    } else if (field.startsWith('ca_')) {
      const caIndex = parseInt(field.split('_')[1]);
      const caDef = caConfig.cas[caIndex];
      if (caDef) {
        updated.cas = { ...updated.cas, [caDef.name]: numValue !== null ? Math.min(caDef.maxScore, numValue) : null };
      }
    } else {
      // Legacy
      if (field === 'ca1') updated.ca1 = numValue !== null ? Math.min(10, numValue) : null;
      if (field === 'ca2') updated.ca2 = numValue !== null ? Math.min(10, numValue) : null;
      if (field === 'ca3') updated.ca3 = numValue !== null ? Math.min(20, numValue) : null;
    }
    
    // Calculate CA Total
    let caTotal = 0;
    if (caConfig && updated.cas && Object.keys(updated.cas).length > 0) {
      caTotal = Object.values(updated.cas).reduce((sum: number, val: any) => sum + (val || 0), 0);
    } else {
      caTotal = (Number(updated.ca1) || 0) + (Number(updated.ca2) || 0) + (Number(updated.ca3) || 0);
    }

    const finalScore = caTotal + (Number(updated.exam) || 0);
    
    // Only calculate grade if exam score is inputted
    let grade = '';
    let remark = '';
    if (updated.exam !== null && updated.exam !== undefined) {
      const calculated = calculateGrade(finalScore);
      grade = calculated.grade;
      remark = calculated.remark;
    }

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

  const applyBulkCa = (caIndex: number, maxScore: number) => {
    const val = Math.min(maxScore, Math.max(0, Number(bulkCa1) || 0));
    const newScores = { ...scores };
    const caConfig = gradeScale?.caConfig || { cas: [{ name: 'CA1', maxScore: 10 }, { name: 'CA2', maxScore: 10 }, { name: 'CA3', maxScore: 20 }], maxExamScore: 60 };
    const caDef = caConfig.cas[caIndex];
    if (!caDef) return;
    
    Object.keys(newScores).forEach(studentId => {
      const current = newScores[studentId];
      if (current.status === 'draft' || current.status === 'rejected' || !current.status) {
        const updated = { ...current, cas: { ...current.cas, [caDef.name]: val } };
        
        let caTotal = 0;
        if (updated.cas) {
          caTotal = Object.values(updated.cas).reduce((sum: number, v: any) => sum + (v || 0), 0);
        }
        
        const finalScore = caTotal + (Number(updated.exam) || 0);
        
        // Only calculate grade if exam score is inputted
        let grade = '';
        let remark = '';
        if (updated.exam !== null && updated.exam !== undefined) {
          const calculated = calculateGrade(finalScore);
          grade = calculated.grade;
          remark = calculated.remark;
        }
        
        newScores[studentId] = {
          ...updated,
          caTotal,
          finalScore,
          grade,
          remark
        };
      }
    });
    
    setScores(newScores);
    setBulkCa1('');
    setShowBulkOptions(false);
    showMessage('success', `Bulk ${caDef.name} applied successfully`);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const saveResults = async (targetStatus: 'draft' | 'submitted') => {
    if (!selectedSession || !selectedTerm || !selectedClass || !selectedSubject) {
      showMessage('error', 'Please select all required fields.');
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      
      for (const studentId of Object.keys(scores)) {
        const scoreData = scores[studentId];
        // Only save if status is draft or rejected, or if we are creating a new record
        if (scoreData.status && !['draft', 'rejected'].includes(scoreData.status) && scoreData.id) {
          continue;
        }

        const resultData = {
          studentId,
          subjectId: selectedSubject,
          classId: selectedClass,
          schoolId: user.schoolId,
          sessionId: selectedSession,
          termId: selectedTerm,
          teacherId: user.uid,
          ca1: scoreData.ca1 || 0,
          ca2: scoreData.ca2 || 0,
          ca3: scoreData.ca3 || 0,
          cas: scoreData.cas || {},
          exam: scoreData.exam || 0,
          caTotal: scoreData.caTotal || 0,
          finalScore: scoreData.finalScore || 0,
          grade: scoreData.grade || 'F',
          remark: scoreData.remark || 'Fail',
          score: scoreData.finalScore || 0,
          total: 100,
          date: new Date().toISOString(),
          createdAt: scoreData.createdAt || new Date().toISOString(),
          status: targetStatus
        };

        if (scoreData.id) {
          const docRef = doc(db, 'schools', user.schoolId, 'results', scoreData.id);
          batch.set(docRef, resultData, { merge: true });
        } else {
          const docRef = doc(collection(db, 'schools', user.schoolId, 'results'));
          batch.set(docRef, resultData);
        }
      }

      await batch.commit();
      showMessage('success', `Results ${targetStatus === 'submitted' ? 'submitted for approval' : 'saved as draft'} successfully!`);
    } catch (err: any) {
      console.error(err);
      showMessage('error', `Failed to save results: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isContextSelected = selectedSession && selectedTerm && selectedClass && selectedSubject;
  
  // Determine overall status based on the first student's result (assuming batch submission)
  const overallStatus = useMemo(() => {
    if (students.length === 0 || Object.keys(scores).length === 0) return 'draft';
    const firstScore = scores[students[0]?.uid];
    return firstScore?.status || 'draft';
  }, [scores, students]);

  const isLocked = ['submitted', 'under_review', 'approved'].includes(overallStatus);
  const isRejected = overallStatus === 'rejected';
  const adminComment = useMemo(() => {
    if (students.length === 0 || Object.keys(scores).length === 0) return null;
    return scores[students[0]?.uid]?.adminComment;
  }, [scores, students]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'submitted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const caConfig = gradeScale?.caConfig || { cas: [{ name: 'CA1', maxScore: 10 }, { name: 'CA2', maxScore: 10 }, { name: 'CA3', maxScore: 20 }], maxExamScore: 60 };
  const totalCaMax = caConfig.cas.reduce((sum, ca) => sum + ca.maxScore, 0);

  return (
    <div className="space-y-5">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-medium text-gray-800">Result Entry Workspace</h2>
          <p className="text-gray-800 font-medium">Manage and submit student academic records</p>
        </div>
        
        {isContextSelected && (
          <div className={`px-3.5 py-1.5 rounded-full border font-medium text-sm uppercase tracking-wider flex items-center gap-2 ${getStatusColor(overallStatus)}`}>
            <div className={`w-2 h-2 rounded-full ${overallStatus === 'approved' ? 'bg-green-500' : overallStatus === 'rejected' ? 'bg-red-500' : overallStatus === 'submitted' ? 'bg-blue-500' : overallStatus === 'under_review' ? 'bg-yellow-500' : 'bg-gray-500'}`} />
            {overallStatus.replace('_', ' ')}
          </div>
        )}
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl flex items-center gap-3 font-medium shadow-sm ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Selection */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Academic Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200/50 bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800"
            >
              <option value="">Select Session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              disabled={!selectedSession}
              className="w-full px-3 py-2 rounded-xl border border-gray-200/50 bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 disabled:opacity-50"
            >
              <option value="">Select Term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200/50 bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800"
            >
              <option value="">Select Class</option>
              {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-800 ml-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-3 py-2 rounded-xl border border-gray-200/50 bg-gray-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 disabled:opacity-50"
            >
              <option value="">Select Subject</option>
              {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Admin Feedback */}
      {isRejected && adminComment && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-4 items-start">
          <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0"><MessageSquare size={20} /></div>
          <div>
            <h4 className="font-medium text-red-900">Results Rejected by Admin</h4>
            <p className="text-red-700 mt-1">{adminComment}</p>
            <p className="text-sm text-red-600 mt-2 font-medium">Please make the necessary corrections and resubmit.</p>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      {!isContextSelected ? (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-500 mx-auto mb-4 shadow-sm border border-blue-100/50">
            <Search size={20} />
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">Select Context to Begin</h3>
          <p className="text-gray-800 font-medium max-w-md mx-auto">Please select the academic session, term, class, and subject to load the student roster and enter results.</p>
        </div>
      ) : loading ? (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-800 font-medium">Loading student records...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-800 mx-auto mb-4 shadow-sm border border-gray-100/50">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">No Students Found</h3>
          <p className="text-gray-800 font-medium">There are no students registered in this class.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="relative">
              <button 
                onClick={() => setShowBulkOptions(!showBulkOptions)}
                disabled={isLocked}
                className="px-3 py-1.5 rounded-lg font-medium text-sm bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors border border-gray-200/50 flex items-center gap-2 disabled:opacity-50"
              >
                <Copy size={16} /> Bulk Actions
              </button>
              
              <AnimatePresence>
                {showBulkOptions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 p-4 bg-white rounded-2xl shadow-xl border border-gray-100 z-10 w-72"
                  >
                    <h4 className="font-medium text-gray-800 text-sm mb-3">Apply Bulk Score</h4>
                    <div className="space-y-3">
                      {caConfig.cas.map((ca, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            type="number" 
                            min="0" max={ca.maxScore}
                            value={bulkCa1}
                            onChange={(e) => setBulkCa1(e.target.value)}
                            placeholder={`${ca.name} (0-${ca.maxScore})`}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text text-sm"
                          />
                          <button 
                            onClick={() => applyBulkCa(idx, ca.maxScore)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => saveResults('draft')}
                disabled={saving || isLocked}
                className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-full font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Draft
              </button>
              <button
                onClick={() => saveResults('submitted')}
                disabled={saving || isLocked}
                className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-full font-medium text-white bg-blue-600 hover:bg-blue-700  transition-all shadow-md  border border-white/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Submit Results
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-800 font-medium">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Student Name</th>
                    {caConfig.cas.map((ca, idx) => (
                      <th key={idx} className="px-4 py-4 text-center w-24">{ca.name}<br/><span className="text-[9px] text-gray-800">({ca.maxScore})</span></th>
                    ))}
                    <th className="px-4 py-4 text-center w-24 bg-gray-50/50">CA Total<br/><span className="text-[9px] text-gray-800">({totalCaMax})</span></th>
                    <th className="px-4 py-4 text-center w-24">Exam<br/><span className="text-[9px] text-gray-800">({caConfig.maxExamScore})</span></th>
                    <th className="px-4 py-4 text-center w-24 bg-blue-50/30 text-blue-700">Final<br/><span className="text-[9px] text-blue-400/80">({totalCaMax + caConfig.maxExamScore})</span></th>
                    <th className="px-6 py-4 text-center w-24">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student) => {
                    const score = scores[student.uid] || {};
                    const isRowActive = activeRow === student.uid;
                    
                    return (
                      <tr 
                        key={student.uid} 
                        className={`transition-colors ${isRowActive ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}
                        onFocus={() => setActiveRow(student.uid)}
                        onBlur={() => setActiveRow(null)}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={student.firstName} className="w-8 h-8 rounded-full object-cover border border-gray-200" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center font-medium text-blue-600 shrink-0">
                                {student.firstName?.charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{student.firstName} {student.lastName}</p>
                              <p className="text-[10px] text-gray-800 font-medium uppercase tracking-wider">{student.registrationNumber || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        {caConfig.cas.map((ca, idx) => {
                          const val = score.cas?.[ca.name] !== undefined ? score.cas[ca.name] : (idx === 0 ? score.ca1 : idx === 1 ? score.ca2 : idx === 2 ? score.ca3 : null);
                          return (
                            <td key={idx} className="px-4 py-3">
                              <input
                                type="number"
                                min="0" max={ca.maxScore}
                                placeholder="-"
                                value={val === null ? '' : val}
                                onChange={(e) => handleScoreChange(student.uid, `ca_${idx}`, e.target.value)}
                                disabled={isLocked}
                                className="w-full text-center px-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-gray-800 transition-all disabled:opacity-50 disabled:bg-transparent cursor-text placeholder:text-gray-300"
                              />
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 bg-gray-100/80 text-center border-x border-gray-50">
                          <span className="font-medium text-gray-800">{score.caTotal || 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0" max={caConfig.maxExamScore}
                            placeholder="-"
                            value={score.exam === null ? '' : score.exam}
                            onChange={(e) => handleScoreChange(student.uid, 'exam', e.target.value)}
                            disabled={isLocked}
                            className="w-full text-center px-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-gray-800 transition-all disabled:opacity-50 disabled:bg-transparent cursor-text placeholder:text-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 bg-blue-50/50 text-center border-x border-blue-50/50">
                          <span className="font-medium text-blue-800">{score.finalScore || 0}</span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${
                            score.grade === 'A' ? 'bg-green-100 text-green-700' :
                            score.grade === 'B' ? 'bg-emerald-100 text-emerald-700' :
                            score.grade === 'C' ? 'bg-blue-100 text-blue-700' :
                            score.grade === 'D' ? 'bg-yellow-100 text-yellow-700' :
                            score.grade === 'E' ? 'bg-orange-100 text-orange-700' :
                            score.grade === 'F' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {score.grade || '-'}
                          </span>
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
                        <img src={student.photoUrl} alt={student.firstName} className="w-10 h-10 rounded-full object-cover border border-gray-200" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-medium text-blue-600 shrink-0">
                          {student.firstName?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm text-gray-800">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-gray-800">{student.registrationNumber || 'N/A'}</p>
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
                              min="0" max={ca.maxScore}
                              placeholder="-"
                              value={val === 0 && !score.id && !score.cas?.[ca.name] ? '' : val}
                              onChange={(e) => handleScoreChange(student.uid, `ca_${idx}`, e.target.value)}
                              disabled={isLocked}
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
                          min="0" max={caConfig.maxExamScore}
                          placeholder="-"
                          value={score.exam === 0 && !score.id ? '' : score.exam}
                          onChange={(e) => handleScoreChange(student.uid, 'exam', e.target.value)}
                          disabled={isLocked}
                          className="w-full text-center px-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-gray-800 transition-all disabled:opacity-50 disabled:bg-transparent cursor-text placeholder:text-gray-300"
                        />
                      </div>
                      <div className="flex flex-col items-center justify-center bg-blue-50/80 rounded-xl p-2 border border-blue-100/50">
                        <span className="text-[10px] text-blue-600 mb-1 font-medium">Final</span>
                        <span className="font-medium text-blue-800">{score.finalScore || 0}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                      <span className="text-xs text-gray-800">Grade</span>
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${
                        score.grade === 'A' ? 'bg-green-100 text-green-700' :
                        score.grade === 'B' ? 'bg-emerald-100 text-emerald-700' :
                        score.grade === 'C' ? 'bg-blue-100 text-blue-700' :
                        score.grade === 'D' ? 'bg-yellow-100 text-yellow-700' :
                        score.grade === 'E' ? 'bg-orange-100 text-orange-700' :
                        score.grade === 'F' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {score.grade || '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
