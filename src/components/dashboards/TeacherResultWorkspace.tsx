import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, query, where, addDoc, updateDoc, doc, onSnapshot, OperationType, handleFirestoreError, writeBatch } from '../../lib/compatibility';
import { UserProfile, Class, Subject, Result, Session, Term, GradeScale } from '../../types';
import { Save, Search, ChevronRight, AlertCircle, CheckCircle2, Loader2, Send, RotateCcw, MessageSquare, Copy, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, sortByFullName, formatDisplayString } from '../../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TeacherResultWorkspaceProps {
  user: UserProfile;
  classes: Class[];
  subjects: Subject[];
}

export const TeacherResultWorkspace = ({ user, classes, subjects: allSubjects }: TeacherResultWorkspaceProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [gradeScale, setGradeScale] = useState<GradeScale | null>(null);
  const [school, setSchool] = useState<any>(null);
  
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [scores, setScores] = useState<Record<string, Partial<Result>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [invoices, setInvoices] = useState<Record<string, any>>({});
  
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

    const unsubSchool = onSnapshot(doc(db, 'schools', user.schoolId), (snap) => {
      if (snap.exists()) setSchool({ id: snap.id, ...snap.data() });
    });

    const unsubSessions = onSnapshot(collection(db, 'schools', user.schoolId, 'sessions'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
      data.sort((a, b) => b.name.localeCompare(a.name));
      setSessions(data);
      const current = data.find(s => s.isCurrent);
      if (current && !selectedSession) setSelectedSession(current.id);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/sessions`));

    const unsubGradeScale = onSnapshot(collection(db, 'schools', user.schoolId, 'gradeScales'), (snap) => {
      if (!snap.empty) {
        setGradeScale({ id: snap.docs[0].id, ...snap.docs[0].data() } as GradeScale);
      } else {
        setGradeScale(defaultGradeScale);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/gradeScales`));

    return () => {
      unsubSchool();
      unsubSessions();
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

  const teacherClassIds = useMemo(() => availableClasses.map(c => c.id), [availableClasses]);

  const availableSubjects = useMemo(() => {
    if (!selectedClass) return [];
    if (selectedClass === 'all') {
      return allSubjects.filter(s => s.teacherId === user.uid || (user.role !== 'teacher' && teacherClassIds.includes(s.classId)));
    }
    if (user.role !== 'teacher') return allSubjects.filter(s => s.classId === selectedClass);
    return allSubjects.filter(s => 
      s.classId === selectedClass && (s.teacherId === user.uid || user.classId === selectedClass)
    );
  }, [allSubjects, selectedClass, user.uid, user.classId, user.role, teacherClassIds]);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSelectedSubject('');
      return;
    }

    if (!availableSubjects.find(s => s.id === selectedSubject)) {
      setSelectedSubject('');
    }

    const classFilter = selectedClass === 'all' 
      ? where('classId', 'in', teacherClassIds)
      : where('classId', '==', selectedClass);

    const unsubStudents = onSnapshot(query(
      collection(db, 'users'), 
      where('schoolId', '==', user.schoolId), 
      classFilter
    ), (snap) => {
      const data = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)).filter(u => u.role === 'student');
      setStudents(sortByFullName(data));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    return () => {
      unsubStudents();
    };
  }, [selectedClass, user.schoolId, availableSubjects, teacherClassIds]);

  useEffect(() => {
    if (!selectedSession || !selectedTerm || !selectedClass || !selectedSubject || students.length === 0) return;

    setLoading(true);
    const classFilter = selectedClass === 'all'
      ? where('classId', 'in', teacherClassIds)
      : where('classId', '==', selectedClass);

    const qResults = query(
      collection(db, 'schools', user.schoolId, 'results'),
      classFilter
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
          classId: student.classId, // Ensure classId is preserved
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
  }, [selectedSession, selectedTerm, selectedClass, selectedSubject, students, user.schoolId, teacherClassIds]);

  useEffect(() => {
    if (!selectedSession || !selectedTerm || !selectedClass || !user.schoolId) {
      setInvoices({});
      return;
    }

    const classFilter = selectedClass === 'all'
      ? where('classId', 'in', teacherClassIds)
      : where('classId', '==', selectedClass);

    const qInvoices = query(
      collection(db, 'schools', user.schoolId, 'invoices'),
      classFilter,
      where('sessionId', '==', selectedSession),
      where('termId', '==', selectedTerm)
    );

    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      const data: Record<string, any> = {};
      snap.docs.forEach(d => {
        const inv = d.data();
        data[inv.studentId] = inv;
      });
      setInvoices(data);
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${user.schoolId}/invoices`));

    return () => unsubInvoices();
  }, [selectedSession, selectedTerm, selectedClass, user.schoolId, teacherClassIds]);

  const filteredStudents = useMemo(() => {
    if (paymentFilter === 'all') return students;
    return students.filter(student => {
      const invoice = invoices[student.uid];
      if (paymentFilter === 'paid') {
        return invoice?.status === 'paid';
      } else {
        return !invoice || invoice.status !== 'paid';
      }
    });
  }, [students, invoices, paymentFilter]);

  const calculateGrade = (score: number) => {
    const scale = gradeScale || defaultGradeScale;
    if (!scale.grades || !Array.isArray(scale.grades)) {
      return { grade: 'F', remark: 'Fail' };
    }
    const gradeObj = scale.grades.find(g => score >= g.minScore && score <= g.maxScore);
    return gradeObj || { grade: 'F', remark: 'Fail' };
  };

  const caConfig = useMemo(() => gradeScale?.caConfig || { 
    cas: [
      { name: 'CA1', maxScore: 10 }, 
      { name: 'CA2', maxScore: 10 }, 
      { name: 'CA3', maxScore: 20 }
    ], 
    maxExamScore: 60 
  }, [gradeScale]);

  const totalCaMax = useMemo(() => caConfig.cas.reduce((sum, ca) => sum + ca.maxScore, 0), [caConfig]);

  const handleScoreChange = (studentId: string, field: string, value: string) => {
    const current = scores[studentId] || {
      ca1: null, ca2: null, ca3: null, cas: {}, exam: null, caTotal: 0, finalScore: 0, grade: '', remark: '', status: 'draft'
    };
    
    const updated = { ...current };
    
    if (field.startsWith('ca_')) {
      const ca_index = parseInt(field.split('_')[1]);
      const caDef = caConfig.cas[ca_index];
      if (caDef) {
        const numValue = value === '' ? null : Math.max(0, Number(value) || 0);
        const finalVal = numValue !== null ? Math.min(caDef.maxScore, numValue) : null;
        updated.cas = { ...updated.cas, [caDef.name]: finalVal };
        
        // Sync legacy fields for compatibility
        if (ca_index === 0) updated.ca1 = finalVal;
        else if (ca_index === 1) updated.ca2 = finalVal;
        else if (ca_index === 2) updated.ca3 = finalVal;
      }
    } else if (field === 'exam') {
      const numValue = value === '' ? null : Math.max(0, Number(value) || 0);
      updated.exam = numValue !== null ? Math.min(caConfig.maxExamScore, numValue) : null;
    }
    
    // Calculate CA Total
    let caTotal = 0;
    if (updated.cas && Object.keys(updated.cas).length > 0) {
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
    const caDef = caConfig.cas[caIndex];
    if (!caDef) return;
    
    Object.keys(newScores).forEach(studentId => {
      const current = newScores[studentId];
      if (current.status === 'draft' || current.status === 'rejected' || !current.status) {
        const updated = { ...current, cas: { ...current.cas, [caDef.name]: val } };
        
        // Sync legacy fields
        if (caIndex === 0) updated.ca1 = val;
        else if (caIndex === 1) updated.ca2 = val;
        else if (caIndex === 2) updated.ca3 = val;
        
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

    if (!user.schoolId) {
      showMessage('error', 'School ID is missing. Please contact support.');
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

        const student = students.find(s => s.uid === studentId);
        const resultData = {
          studentId,
          subjectId: selectedSubject,
          classId: scoreData.classId || student?.classId || (selectedClass !== 'all' ? selectedClass : ''),
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

  const archiveResults = async () => {
    if (!window.confirm("Are you sure you want to archive these results? This will make them read-only and historical.")) return;
    
    if (!user.schoolId) {
      showMessage('error', 'School ID is missing. Please contact support.');
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      for (const studentId of Object.keys(scores)) {
        const scoreData = scores[studentId];
        if (scoreData.id) {
          const docRef = doc(db, 'schools', user.schoolId, 'results', scoreData.id);
          batch.update(docRef, { 
            status: 'archived', 
            updatedAt: new Date().toISOString() 
          });
        }
      }
      await batch.commit();
      showMessage('success', 'Results archived successfully');
    } catch (err: any) {
      showMessage('error', `Failed to archive: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedSession || !selectedTerm || !selectedClass || !selectedSubject) return;
    
    const doc = new jsPDF();
    const sessionObj = sessions.find(s => s.id === selectedSession);
    const termObj = terms.find(t => t.id === selectedTerm);
    const classObj = classes.find(c => c.id === selectedClass);
    const subjectObj = allSubjects.find(s => s.id === selectedSubject);
    
    // Premium Header
    doc.setFillColor(2, 6, 23); // slate-950
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(school?.name || 'Academic Institution', 105, 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('OFFICIAL ACADEMIC PERFORMANCE REPORT', 105, 32, { align: 'center' });
    
    // Meta Info Card
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(14, 50, 182, 35, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('REPORT CONTEXT', 20, 58);
    
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFont('helvetica', 'bold');
    doc.text(`Session: ${sessionObj?.name || 'N/A'}`, 20, 65);
    doc.text(`Term: ${termObj?.name || 'N/A'}`, 20, 72);
    doc.text(`Class: ${classObj?.name || 'N/A'}`, 20, 79);
    
    doc.text(`Subject: ${subjectObj?.name || 'N/A'}`, 105, 65);
    doc.text(`Teacher: ${user.firstName} ${user.lastName}`, 105, 72);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 79);
    
    // Table Data
    const tableHeaders = ['S/N', 'Student Name', 'Reg No', ...caConfig.cas.map(ca => ca.name), 'CA Total', 'Exam', 'Final', 'Grade', 'Remark'];
    const tableRows = filteredStudents.map((student, index) => {
      const score = scores[student.uid] || {};
      const caValues = caConfig.cas.map((ca, idx) => {
        const val = score.cas?.[ca.name] !== undefined ? score.cas[ca.name] : (idx === 0 ? score.ca1 : idx === 1 ? score.ca2 : idx === 2 ? score.ca3 : null);
        return val === null ? '-' : val;
      });
      
      return [
        index + 1,
        `${formatDisplayString(student.firstName)} ${formatDisplayString(student.lastName)}`,
        student.registrationNumber || '-',
        ...caValues,
        score.caTotal || 0,
        score.exam || 0,
        score.finalScore || 0,
        score.grade || '-',
        score.remark || '-'
      ];
    });
    
    autoTable(doc, {
      startY: 95,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [2, 6, 23], 
        textColor: [255, 255, 255], 
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 25 },
        ...caConfig.cas.reduce((acc: any, _, idx) => {
          acc[3 + idx] = { halign: 'center' };
          return acc;
        }, {}),
        [3 + caConfig.cas.length]: { halign: 'center', fontStyle: 'bold' },
        [4 + caConfig.cas.length]: { halign: 'center' },
        [5 + caConfig.cas.length]: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] },
        [6 + caConfig.cas.length]: { halign: 'center', fontStyle: 'bold' },
        [7 + caConfig.cas.length]: { halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [252, 253, 254]
      }
    });
    
    // Performance Analytics
    const finalY = (doc as any).lastAutoTable.finalY || 120;
    
    if (finalY + 60 > 280) doc.addPage();
    
    const scores_list = Object.values(scores).map(s => s.finalScore || 0);
    const avg = scores_list.length > 0 ? (scores_list.reduce((a, b) => a + b, 0) / scores_list.length).toFixed(1) : '0';
    const high = scores_list.length > 0 ? Math.max(...scores_list) : '0';
    const low = scores_list.length > 0 ? Math.min(...scores_list) : '0';
    const passCount = scores_list.filter(s => s >= 40).length;
    const passRate = scores_list.length > 0 ? ((passCount / scores_list.length) * 100).toFixed(1) : '0';

    doc.setFillColor(2, 6, 23);
    doc.rect(14, finalY + 10, 182, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLASS PERFORMANCE ANALYTICS', 20, finalY + 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Average Class Score: ${avg}%`, 25, finalY + 30);
    doc.text(`Highest Score in Class: ${high}%`, 25, finalY + 38);
    doc.text(`Lowest Score in Class: ${low}%`, 25, finalY + 46);
    
    doc.text(`Students Passed: ${passCount} / ${scores_list.length}`, 110, finalY + 30);
    doc.text(`Overall Pass Rate: ${passRate}%`, 110, finalY + 38);
    
    // Signatures
    const sigY = finalY + 75;
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.line(14, sigY, 74, sigY);
    doc.text('Teacher Signature', 14, sigY + 5);
    
    doc.line(132, sigY, 192, sigY);
    doc.text('Principal / H.O.S Signature', 132, sigY + 5);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated by SEEDD Eco-System | ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
    
    doc.save(`${school?.name || 'School'}_${classObj?.name}_${subjectObj?.name}_Report.pdf`);
    showMessage('success', 'Premium report exported successfully!');
  };

  const isContextSelected = selectedSession && selectedTerm && selectedClass && selectedSubject;
  
  // Determine overall status based on the first student's result (assuming batch submission)
  const overallStatus = useMemo(() => {
    if (students.length === 0 || Object.keys(scores).length === 0) return 'draft';
    const firstScore = scores[students[0]?.uid];
    return firstScore?.status || 'draft';
  }, [scores, students]);

  const isLocked = ['submitted', 'under_review', 'approved', 'archived'].includes(overallStatus);
  const isRejected = overallStatus === 'rejected';
  const adminComment = useMemo(() => {
    if (students.length === 0 || Object.keys(scores).length === 0) return null;
    return scores[students[0]?.uid]?.adminComment;
  }, [scores, students]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'submitted': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'archived': return 'bg-blue-500 text-slate-100 border-slate-950';
      default: return 'bg-gray-100 text-slate-900 dark:text-slate-100 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-medium tracking-tighter text-slate-900 uppercase leading-none">Result Workspace</h2>
          <p className="text-sm font-medium tracking-tight text-slate-900 mt-2">Manage and submit academic records</p>
        </div>
        
        {isContextSelected && (
          <div className={`px-5 py-2.5 rounded-2xl border font-medium text-sm tracking-tight flex items-center gap-3 shadow-sm ${getStatusColor(overallStatus)}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              overallStatus === 'approved' ? 'bg-emerald-500' : 
              overallStatus === 'rejected' ? 'bg-red-500' : 
              overallStatus === 'submitted' ? 'bg-slate-500' : 
              overallStatus === 'under_review' ? 'bg-amber-500' : 
              overallStatus === 'archived' ? 'bg-blue-500' :
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
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <label className="text-base font-medium tracking-tight text-slate-900 ml-1">Academic Session</label>
            <select
              id="select_teacher_result_session"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 outline-none transition-all font-medium tracking-tight text-base text-slate-900"
            >
              <option value="">Select Session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{formatDisplayString(s.name)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-base font-medium tracking-tight text-slate-900 ml-1">Term</label>
            <select
              id="select_teacher_result_term"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              disabled={!selectedSession}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 outline-none transition-all font-medium tracking-tight text-base text-slate-900 disabled:opacity-50"
            >
              <option value="">Select Term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{formatDisplayString(t.name)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-base font-medium tracking-tight text-slate-900 ml-1">Class</label>
            <select
              id="select_teacher_result_class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 outline-none transition-all font-medium tracking-tight text-base text-slate-900"
            >
              <option value="">Select Class</option>
              {availableClasses.length > 1 && <option value="all">All My Classes</option>}
               {availableClasses.map(c => <option key={c.id} value={c.id}>{formatDisplayString(c.name)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-base font-medium tracking-tight text-slate-900 ml-1">Subject</label>
            <select
              id="select_teacher_result_subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 outline-none transition-all font-medium tracking-tight text-base text-slate-900 disabled:opacity-50"
            >
              <option value="">Select Subject</option>
               {availableSubjects.map(s => <option key={s.id} value={s.id}>{formatDisplayString(s.name)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-base font-medium tracking-tight text-slate-900 ml-1">Payment Filter</label>
            <select
              id="select_teacher_result_payment_filter"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 outline-none transition-all font-medium tracking-tight text-base text-slate-900"
            >
              <option value="all">All Students</option>
              <option value="paid">Paid Only</option>
              <option value="unpaid">Unpaid Only</option>
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
        <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200/60 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 mx-auto mb-6 shadow-sm border border-slate-200/60">
            <Search size={40} strokeWidth={2.5} />
          </div>
          <h3 className="text-3xl font-medium tracking-tight text-slate-900 mb-3">Ready to Enter Results?</h3>
          <p className="text-lg font-medium tracking-tight text-slate-600 max-w-md mx-auto">Please select the session, term, class, and subject to load the academic roster.</p>
        </div>
      ) : loading ? (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200/60 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-6" />
          <p className="text-sm font-medium tracking-tight text-slate-900">Syncing academic records...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200/60 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-6 border border-slate-200/60 shadow-sm">
            <AlertCircle size={40} strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-medium tracking-tight text-slate-900 mb-3">No Students Found</h3>
          <p className="text-sm font-medium tracking-tight text-slate-900">There are no students registered in this class roster.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200/60">
            <div className="relative">
              <button 
                id="btn_teacher_result_bulk_actions"
                onClick={() => setShowBulkOptions(!showBulkOptions)}
                disabled={isLocked}
                className="px-4 py-2 rounded-xl font-medium tracking-tight text-sm bg-slate-50 text-slate-900 hover:bg-slate-100 transition-all border border-slate-200 flex items-center gap-2.5 disabled:opacity-50 shadow-sm active:scale-95"
              >
                <Copy size={14} strokeWidth={2.5} /> Bulk Actions
              </button>
              
              <AnimatePresence>
                {showBulkOptions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-2xl border border-slate-200/60 z-30 w-56"
                  >
                    <h4 className="font-medium tracking-tight text-slate-900 text-sm mb-4">Apply Bulk Scores</h4>
                    <div className="space-y-2">
                      {caConfig.cas.map((ca, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            type="number" 
                            min="0" max={ca.maxScore}
                            value={bulkCa1}
                            onChange={(e) => setBulkCa1(e.target.value)}
                            placeholder={`${formatDisplayString(ca.name)}`}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-950 outline-none transition-all font-medium tracking-tight text-sm text-slate-900"
                          />
                          <button 
                            id={`btn_teacher_result_bulk_apply_${idx}`}
                            onClick={() => applyBulkCa(idx, ca.maxScore)}
                            className="px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium tracking-tight text-sm hover:bg-black transition-all shadow-lg shadow-slate-950/20"
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

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                id="btn_teacher_result_save_draft"
                onClick={() => saveResults('draft')}
                disabled={saving || isLocked}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium tracking-tight text-sm text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-95"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
                Save Draft
              </button>
              <button
                id="btn_teacher_result_export_pdf"
                onClick={generatePDF}
                disabled={!isContextSelected || students.length === 0}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium tracking-tight text-sm text-white bg-blue-500 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 border border-white/20 flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-95"
              >
                <FileText size={14} strokeWidth={2.5} />
                Export Report
              </button>
              {(overallStatus === 'approved' || overallStatus === 'submitted') && (
                <button
                  id="btn_teacher_result_archive"
                  onClick={archiveResults}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium tracking-tight text-sm text-slate-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 shadow-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-95"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={14} strokeWidth={2.5} />}
                  Archive Records
                </button>
              )}
              <button
                id="btn_teacher_result_submit"
                onClick={() => saveResults('submitted')}
                disabled={saving || isLocked}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium tracking-tight text-sm text-white bg-blue-500 hover:bg-black transition-all shadow-lg shadow-slate-950/20 border border-white/20 flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-95"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />}
                Submit Results
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/60 text-base font-medium tracking-tight text-slate-900">
                  <tr>
                    <th className="px-6 py-5 whitespace-nowrap">Student Roster</th>
                    {caConfig.cas.map((ca, idx) => (
                      <th key={idx} className="px-2 py-5 text-center w-20">{formatDisplayString(ca.name)}<br/><span className="text-[10px] font-medium text-slate-900">Max:{ca.maxScore}</span></th>
                    ))}
                    <th className="px-2 py-5 text-center w-24 bg-slate-100/30">CA Total<br/><span className="text-[10px] font-medium text-slate-900">Max:{totalCaMax}</span></th>
                    <th className="px-2 py-5 text-center w-20">Exam<br/><span className="text-[10px] font-medium text-slate-900">Max:{caConfig.maxExamScore}</span></th>
                    <th className="px-2 py-5 text-center w-24 bg-blue-500 text-white">Final Score<br/><span className="text-[10px] font-medium text-white">Max:100</span></th>
                    <th className="px-6 py-4 text-center w-24">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((student) => {
                    const score = scores[student.uid] || {};
                    const isRowActive = activeRow === student.uid;
                    
                    return (
                      <tr 
                        key={student.uid} 
                        className={`transition-all duration-200 border-b border-slate-50 last:border-0 ${isRowActive ? 'bg-slate-50/20' : 'hover:bg-slate-50/80'}`}
                        onFocus={() => setActiveRow(student.uid)}
                        onBlur={() => setActiveRow(null)}
                      >
                         <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={formatDisplayString(student.firstName)} className="w-6 h-6 rounded-lg object-cover border border-white shadow-sm" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-medium text-slate-900 shrink-0 border border-white shadow-sm text-xs">
                                {formatDisplayString(student.firstName).charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-medium tracking-tight text-base text-slate-900 truncate max-w-[120px]">{formatDisplayString(student.firstName)} {formatDisplayString(student.lastName)}</p>
                              <p className="text-sm text-slate-500 font-medium">{student.registrationNumber || 'NO ID'}</p>
                            </div>
                          </div>
                        </td>
                        {caConfig.cas.map((ca, idx) => {
                          const val = score.cas?.[ca.name] !== undefined ? score.cas[ca.name] : (idx === 0 ? score.ca1 : idx === 1 ? score.ca2 : idx === 2 ? score.ca3 : null);
                          return (
                            <td key={idx} className="px-2 py-3">
                              <input
                                id={`input_teacher_result_ca_${idx}_${student.uid}`}
                                type="number"
                                min="0" max={ca.maxScore}
                                placeholder="-"
                                value={val === null ? '' : val}
                                onChange={(e) => handleScoreChange(student.uid, `ca_${idx}`, e.target.value)}
                                disabled={isLocked}
                                className="w-full text-center px-1 py-2 rounded-lg border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 outline-none font-medium text-base text-slate-900 transition-all disabled:opacity-40 disabled:bg-transparent cursor-text placeholder:text-slate-300"
                              />
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 bg-slate-50/80 text-center">
                          <span className="font-medium text-slate-900 text-lg">{score.caTotal || 0}</span>
                        </td>
                        <td className="px-2 py-3">
                          <input
                            id={`input_teacher_result_exam_${student.uid}`}
                            type="number"
                            min="0" max={caConfig.maxExamScore}
                            placeholder="-"
                             value={score.exam === null ? '' : score.exam}
                            onChange={(e) => handleScoreChange(student.uid, 'exam', e.target.value)}
                            disabled={isLocked}
                            className="w-full text-center px-2 py-2 rounded-lg border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 outline-none font-medium text-base text-slate-900 transition-all disabled:opacity-40 disabled:bg-transparent cursor-text placeholder:text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-3 bg-slate-100 text-center">
                          <span className="font-medium text-slate-900 text-lg">{score.finalScore || 0}</span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-medium text-lg tracking-tight shadow-sm border ${
                            score.grade === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            score.grade === 'B' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            score.grade === 'C' ? 'bg-slate-100 text-slate-900 border-slate-200' :
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
            <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50">
              {students.map((student) => {
                const score = scores[student.uid] || {};
                return (
                  <div key={student.uid} className={`bg-white rounded-xl shadow-sm border ${activeRow === student.uid ? 'border-slate-400 ring-2 ring-slate-950/5' : 'border-slate-200/60'} p-4 flex flex-col gap-4 transition-all duration-200`} onFocus={() => setActiveRow(student.uid)} onBlur={() => setActiveRow(null)}>
                    <div className="flex items-center gap-3">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt={formatDisplayString(student.firstName)} className="w-10 h-10 rounded-lg object-cover border border-slate-200/60" referrerPolicy="no-referrer" />
                       ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-medium text-slate-900 shrink-0 text-xs">
                          {formatDisplayString(student.firstName).charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium tracking-tight text-base text-slate-900">{formatDisplayString(student.firstName)} {formatDisplayString(student.lastName)}</p>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">{student.registrationNumber || 'NO ID'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {caConfig.cas.map((ca, idx) => {
                        const val = score.cas?.[ca.name] !== undefined ? score.cas[ca.name] : (idx === 0 ? score.ca1 : idx === 1 ? score.ca2 : idx === 2 ? score.ca3 : 0);
                        return (
                           <div key={idx} className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium tracking-tight text-slate-600 ml-1">{formatDisplayString(ca.name)} (Max:{ca.maxScore})</span>
                            <input
                              id={`input_teacher_result_ca_mobile_${idx}_${student.uid}`}
                              type="number"
                              min="0" max={ca.maxScore}
                              placeholder="-"
                              value={val === 0 && !score.id && !score.cas?.[ca.name] ? '' : val}
                              onChange={(e) => handleScoreChange(student.uid, `ca_${idx}`, e.target.value)}
                              disabled={isLocked}
                              className="w-full text-center px-3 py-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-slate-950 outline-none font-medium text-base text-slate-900 transition-all disabled:opacity-50"
                            />
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/60">
                      <div className="flex flex-col items-center justify-center bg-slate-50/80 rounded-xl p-3 border border-slate-200/60/50">
                        <span className="text-sm font-medium tracking-tight text-slate-600 mb-1">Total CA</span>
                        <span className="font-medium text-slate-900 text-lg">{score.caTotal || 0}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium tracking-tight text-slate-600 text-center">Exam (Max:{caConfig.maxExamScore})</span>
                        <input
                          id={`input_teacher_result_exam_mobile_${student.uid}`}
                          type="number"
                          min="0" max={caConfig.maxExamScore}
                          placeholder="-"
                          value={score.exam === 0 && !score.id ? '' : score.exam}
                          onChange={(e) => handleScoreChange(student.uid, 'exam', e.target.value)}
                          disabled={isLocked}
                          className="w-full text-center px-3 py-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-slate-950 outline-none font-medium text-base text-slate-900 transition-all"
                        />
                      </div>
                       <div className="flex flex-col items-center justify-center bg-blue-500 rounded-xl p-3 border border-white/20 shadow-lg shadow-slate-950/20">
                        <span className="text-sm font-medium tracking-tight text-white/70 mb-1">Final</span>
                        <span className="font-medium text-white text-lg">{score.finalScore || 0}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200/60">
                      <span className="text-xl font-medium tracking-tight text-slate-900">Letter Grade</span>
                      <span className={`px-3 py-1.5 rounded-lg font-medium text-base tracking-tight border ${
                        score.grade === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        score.grade === 'B' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        score.grade === 'C' ? 'bg-slate-100 text-slate-900 border-slate-200' :
                        score.grade === 'D' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                        score.grade === 'E' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                        score.grade === 'F' ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-slate-50 text-slate-300 border-slate-200/60'
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

