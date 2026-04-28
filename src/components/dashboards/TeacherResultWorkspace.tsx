import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, query, where, addDoc, updateDoc, doc, onSnapshot, OperationType, handleFirestoreError, writeBatch } from '../../lib/compatibility';
import { UserProfile, Class, Subject, Result, Session, Term, GradeScale } from '../../types';
import { Save, Search, ChevronRight, AlertCircle, CheckCircle2, Loader2, Send, RotateCcw, MessageSquare, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, sortByFullName, formatDisplayString } from '../../lib/utils';

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
      caTotal = Object.values(updated.cas).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
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
          caTotal = Object.values(updated.cas).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
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
      default: return 'bg-gray-100 text-slate-900 dark:text-slate-100 border-gray-200';
    }
  };

  const caConfig = gradeScale?.caConfig || { cas: [{ name: 'CA1', maxScore: 10 }, { name: 'CA2', maxScore: 10 }, { name: 'CA3', maxScore: 20 }], maxExamScore: 60 };
  const totalCaMax = caConfig.cas.reduce((sum, ca) => sum + ca.maxScore, 0);

  return (
    <div className="space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Result Workspace</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Manage and submit academic records</p>
        </div>
        
        {isContextSelected && (
          <div className={`px-4 py-2 rounded-2xl border font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-sm ${getStatusColor(overallStatus)}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              overallStatus === 'approved' ? 'bg-green-500' : 
              overallStatus === 'rejected' ? 'bg-red-500' : 
              overallStatus === 'submitted' ? 'bg-blue-500' : 
              overallStatus === 'under_review' ? 'bg-yellow-500' : 
              'bg-slate-300'
            }`} />
            {formatDisplayString(overallStatus)}
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
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Academic Session</label>
            <select
              id="select_teacher_result_session"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
            >
              <option value="">Select Session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{formatDisplayString(s.name)}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Term</label>
            <select
              id="select_teacher_result_term"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              disabled={!selectedSession}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900 disabled:opacity-50"
            >
              <option value="">Select Term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{formatDisplayString(t.name)}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Class</label>
            <select
              id="select_teacher_result_class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900"
            >
              <option value="">Select Class</option>
               {availableClasses.map(c => <option key={c.id} value={c.id}>{formatDisplayString(c.name)}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
            <select
              id="select_teacher_result_subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-xs text-slate-900 disabled:opacity-50"
            >
              <option value="">Select Subject</option>
               {availableSubjects.map(s => <option key={s.id} value={s.id}>{formatDisplayString(s.name)}</option>)}
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
        <div className="bg-white p-20 rounded-[2.5rem] shadow-sm border border-slate-100 text-center">
          <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-500 mx-auto mb-6 shadow-sm border border-blue-100">
            <Search size={40} strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Ready to Enter Results?</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 max-w-md mx-auto">Please select the session, term, class, and subject to load the academic roster.</p>
        </div>
      ) : loading ? (
        <div className="bg-white p-20 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing academic records...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white p-20 rounded-[2.5rem] shadow-sm border border-slate-100 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 mx-auto mb-6 border border-slate-100 shadow-sm">
            <AlertCircle size={40} strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">No Students Found</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">There are no students registered in this class roster.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="relative">
              <button 
                id="btn_teacher_result_bulk_actions"
                onClick={() => setShowBulkOptions(!showBulkOptions)}
                disabled={isLocked}
                className="px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all border border-slate-200 flex items-center gap-3 disabled:opacity-50 shadow-sm active:scale-95"
              >
                <Copy size={16} strokeWidth={2.5} /> Bulk Actions
              </button>
              
              <AnimatePresence>
                {showBulkOptions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-4 p-8 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-30 w-80"
                  >
                    <h4 className="font-black uppercase tracking-widest text-slate-900 text-[10px] mb-6">Apply Bulk Scores</h4>
                    <div className="space-y-4">
                      {caConfig.cas.map((ca, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            type="number" 
                            min="0" max={ca.maxScore}
                            value={bulkCa1}
                            onChange={(e) => setBulkCa1(e.target.value)}
                            placeholder={`${ca.name} Max:${ca.maxScore}`}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900"
                          />
                          <button 
                            id={`btn_teacher_result_bulk_apply_${idx}`}
                            onClick={() => applyBulkCa(idx, ca.maxScore)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
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

            <div className="flex gap-4 w-full sm:w-auto">
              <button
                id="btn_teacher_result_save_draft"
                onClick={() => saveResults('draft')}
                disabled={saving || isLocked}
                className="flex-1 sm:flex-none px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} strokeWidth={2.5} />}
                Save Draft
              </button>
              <button
                id="btn_teacher_result_submit"
                onClick={() => saveResults('submitted')}
                disabled={saving || isLocked}
                className="flex-1 sm:flex-none px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 border border-white/20 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.5} />}
                Submit Results
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-8 py-6 whitespace-nowrap">Student Roster</th>
                    {caConfig.cas.map((ca, idx) => (
                      <th key={idx} className="px-4 py-6 text-center w-28">{ca.name}<br/><span className="text-[8px] opacity-60">Max:{ca.maxScore}</span></th>
                    ))}
                    <th className="px-4 py-6 text-center w-28 bg-slate-100/50">CA TOTAL<br/><span className="text-[8px] opacity-60">Max:{totalCaMax}</span></th>
                    <th className="px-4 py-6 text-center w-28">EXAM<br/><span className="text-[8px] opacity-60">Max:{caConfig.maxExamScore}</span></th>
                    <th className="px-4 py-6 text-center w-28 bg-blue-50 text-blue-600">FINAL<br/><span className="text-[8px] opacity-60">Max:100</span></th>
                    <th className="px-8 py-6 text-center w-28">GRADE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student) => {
                    const score = scores[student.uid] || {};
                    const isRowActive = activeRow === student.uid;
                    
                    return (
                      <tr 
                        key={student.uid} 
                        className={`transition-all duration-200 border-b border-slate-50 last:border-0 ${isRowActive ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}
                        onFocus={() => setActiveRow(student.uid)}
                        onBlur={() => setActiveRow(null)}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={formatDisplayString(student.firstName)} className="w-10 h-10 rounded-2xl object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center font-black text-blue-600 shrink-0 border-2 border-white shadow-sm">
                                {formatDisplayString(student.firstName).charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-black uppercase tracking-widest text-[10px] text-slate-900">{formatDisplayString(student.firstName)} {formatDisplayString(student.lastName)}</p>
                              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">{student.registrationNumber || 'NO ID'}</p>
                            </div>
                          </div>
                        </td>
                        {caConfig.cas.map((ca, idx) => {
                          const val = score.cas?.[ca.name] !== undefined ? score.cas[ca.name] : (idx === 0 ? score.ca1 : idx === 1 ? score.ca2 : idx === 2 ? score.ca3 : null);
                          return (
                            <td key={idx} className="px-4 py-5">
                              <input
                                id={`input_teacher_result_ca_${idx}_${student.uid}`}
                                type="number"
                                min="0" max={ca.maxScore}
                                placeholder="-"
                                value={val === null ? '' : val}
                                onChange={(e) => handleScoreChange(student.uid, `ca_${idx}`, e.target.value)}
                                disabled={isLocked}
                                className="w-full text-center px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-black text-xs text-slate-900 transition-all disabled:opacity-40 disabled:bg-transparent cursor-text placeholder:text-slate-200"
                              />
                            </td>
                          );
                        })}
                        <td className="px-4 py-5 bg-slate-50/50 text-center">
                          <span className="font-black text-slate-900 text-sm">{score.caTotal || 0}</span>
                        </td>
                        <td className="px-4 py-5">
                          <input
                            id={`input_teacher_result_exam_${student.uid}`}
                            type="number"
                            min="0" max={caConfig.maxExamScore}
                            placeholder="-"
                            value={score.exam === null ? '' : score.exam}
                            onChange={(e) => handleScoreChange(student.uid, 'exam', e.target.value)}
                            disabled={isLocked}
                            className="w-full text-center px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-black text-xs text-slate-900 transition-all disabled:opacity-40 disabled:bg-transparent cursor-text placeholder:text-slate-200"
                          />
                        </td>
                        <td className="px-4 py-5 bg-blue-50 text-center">
                          <span className="font-black text-blue-700 text-sm">{score.finalScore || 0}</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`inline-flex items-center justify-center px-4 py-2 rounded-xl font-black text-[10px] tracking-widest shadow-sm border ${
                            score.grade === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            score.grade === 'B' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            score.grade === 'C' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            score.grade === 'D' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                            score.grade === 'E' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            score.grade === 'F' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>
                            {score.grade || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-6 p-6 bg-slate-50">
              {students.map((student) => {
                const score = scores[student.uid] || {};
                return (
                  <div key={student.uid} className={`bg-white rounded-[2rem] shadow-sm border ${activeRow === student.uid ? 'border-blue-300 ring-4 ring-blue-500/5' : 'border-slate-100'} p-6 flex flex-col gap-6 transition-all duration-200`} onFocus={() => setActiveRow(student.uid)} onBlur={() => setActiveRow(null)}>
                    <div className="flex items-center gap-4">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt={formatDisplayString(student.firstName)} className="w-12 h-12 rounded-2xl object-cover border border-slate-100" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center font-black text-blue-600 shrink-0">
                          {formatDisplayString(student.firstName).charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-black uppercase tracking-widest text-[10px] text-slate-900">{formatDisplayString(student.firstName)} {formatDisplayString(student.lastName)}</p>
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">{student.registrationNumber || 'NO ID'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {caConfig.cas.map((ca, idx) => {
                        const val = score.cas?.[ca.name] !== undefined ? score.cas[ca.name] : (idx === 0 ? score.ca1 : idx === 1 ? score.ca2 : idx === 2 ? score.ca3 : 0);
                        return (
                          <div key={idx} className="flex flex-col gap-2">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">{ca.name} (Max:{ca.maxScore})</span>
                            <input
                              id={`input_teacher_result_ca_mobile_${idx}_${student.uid}`}
                              type="number"
                              min="0" max={ca.maxScore}
                              placeholder="-"
                              value={val === 0 && !score.id && !score.cas?.[ca.name] ? '' : val}
                              onChange={(e) => handleScoreChange(student.uid, `ca_${idx}`, e.target.value)}
                              disabled={isLocked}
                              className="w-full text-center px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none font-black text-xs text-slate-900 transition-all disabled:opacity-50"
                            />
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-50">
                      <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-3">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Total CA</span>
                        <span className="font-black text-slate-900 text-xs">{score.caTotal || 0}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-center">Exam (Max:{caConfig.maxExamScore})</span>
                        <input
                          id={`input_teacher_result_exam_mobile_${student.uid}`}
                          type="number"
                          min="0" max={caConfig.maxExamScore}
                          placeholder="-"
                          value={score.exam === 0 && !score.id ? '' : score.exam}
                          onChange={(e) => handleScoreChange(student.uid, 'exam', e.target.value)}
                          disabled={isLocked}
                          className="w-full text-center px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none font-black text-xs text-slate-900 transition-all"
                        />
                      </div>
                      <div className="flex flex-col items-center justify-center bg-blue-50 rounded-2xl p-3 border border-blue-100">
                        <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 mb-1">Final</span>
                        <span className="font-black text-blue-700 text-xs">{score.finalScore || 0}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Letter Grade</span>
                      <span className={`px-4 py-2 rounded-xl font-black text-[10px] tracking-widest border ${
                        score.grade === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        score.grade === 'B' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        score.grade === 'C' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        score.grade === 'D' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                        score.grade === 'E' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                        score.grade === 'F' ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-slate-50 text-slate-300 border-slate-100'
                      }`}>
                        {score.grade || 'N/A'}
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

