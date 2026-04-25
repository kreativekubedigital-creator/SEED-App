import { useState, useEffect } from 'react';
import { db, collection, addDoc, updateDoc, doc, onSnapshot, OperationType, handleFirestoreError } from '../../lib/compatibility';
import { Session, Term, GradeScale } from '../../types';
import { Plus, Trash2, Save, CheckCircle2, AlertCircle, Loader2, Calendar, Settings, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName } from '../../lib/utils';

interface GradingSystemConfigProps {
  schoolId: string;
}

export const GradingSystemConfig = ({ schoolId }: GradingSystemConfigProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [gradeScale, setGradeScale] = useState<GradeScale | null>(null);
  
  const [newSessionName, setNewSessionName] = useState('');
  const [newTermName, setNewTermName] = useState('');
  const [selectedSessionForTerm, setSelectedSessionForTerm] = useState('');
  
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingSession, setAddingSession] = useState(false);
  const [addingTerm, setAddingTerm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!schoolId) return;

    const unsubSessions = onSnapshot(collection(db, 'schools', schoolId, 'sessions'), (snap) => {
      const sessionsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
      setSessions(sortByName(sessionsData));
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `schools/${schoolId}/sessions`);
    });

    const unsubGradeScale = onSnapshot(collection(db, 'schools', schoolId, 'gradeScales'), (snap) => {
      if (!snap.empty) {
        setGradeScale({ id: snap.docs[0].id, ...snap.docs[0].data() } as GradeScale);
      } else {
        setGradeScale({
          id: '',
          schoolId: schoolId || '',
          grades: [
            { grade: 'A', minScore: 70, maxScore: 100, remark: 'Excellent' },
            { grade: 'B', minScore: 60, maxScore: 69, remark: 'Very Good' },
            { grade: 'C', minScore: 50, maxScore: 59, remark: 'Good' },
            { grade: 'D', minScore: 45, maxScore: 49, remark: 'Fair' },
            { grade: 'E', minScore: 40, maxScore: 44, remark: 'Pass' },
            { grade: 'F', minScore: 0, maxScore: 39, remark: 'Fail' },
          ],
          caConfig: {
            cas: [
              { name: 'CA 1', maxScore: 10 },
              { name: 'CA 2', maxScore: 10 },
              { name: 'CA 3', maxScore: 10 },
            ],
            maxExamScore: 70
          }
        });
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `schools/${schoolId}/gradeScales`);
    });

    return () => {
      unsubSessions();
      unsubGradeScale();
    };
  }, [schoolId]);

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionForTerm && !hasAutoSelected) {
      const current = sessions.find(s => s.isCurrent);
      if (current) {
        setSelectedSessionForTerm(current.id);
      } else {
        setSelectedSessionForTerm(sessions[0].id);
      }
      setHasAutoSelected(true);
    }
  }, [sessions, selectedSessionForTerm, hasAutoSelected]);

  useEffect(() => {
    if (!schoolId || !selectedSessionForTerm) {
      setTerms([]);
      return;
    }

    const unsubTerms = onSnapshot(collection(db, 'schools', schoolId, 'sessions', selectedSessionForTerm, 'terms'), (snap) => {
      const termsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Term));
      setTerms(sortByName(termsData));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${schoolId}/sessions/${selectedSessionForTerm}/terms`));

    return () => unsubTerms();
  }, [schoolId, selectedSessionForTerm]);

  const handleAddSession = async () => {
    if (!newSessionName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a session name.' });
      return;
    }
    if (!schoolId) {
      setMessage({ type: 'error', text: 'Internal Error: School ID is missing. Please refresh.' });
      return;
    }


    setAddingSession(true);
    try {
      await addDoc(collection(db, 'schools', schoolId, 'sessions'), {
        name: newSessionName,
        schoolId: schoolId,
        isCurrent: sessions.length === 0
      });
      
      setNewSessionName('');
      setMessage({ type: 'success', text: 'Academic session added successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error adding session:', err);
      setMessage({ type: 'error', text: `Failed to add session: ${err.message || 'Unknown database error'}` });
    } finally {
      setAddingSession(false);
    }
  };

  const handleSetCurrentSession = async (id: string) => {
    try {
      const updates = sessions.map(s => updateDoc(doc(db, 'schools', schoolId, 'sessions', s.id), { isCurrent: s.id === id }));
      await Promise.all(updates);
      setMessage({ type: 'success', text: 'Current session updated!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'sessions');
      setMessage({ type: 'error', text: 'Failed to update current session' });
    }
  };

  const handleAddTerm = async () => {
    if (!newTermName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a term name.' });
      return;
    }
    if (!selectedSessionForTerm) {
      setMessage({ type: 'error', text: 'Please select a session first.' });
      return;
    }
    if (!schoolId) {
      setMessage({ type: 'error', text: 'Internal Error: School ID is missing.' });
      return;
    }

    setAddingTerm(true);
    try {
      const sessionTerms = terms.filter(t => t.sessionId === selectedSessionForTerm);
      await addDoc(collection(db, 'schools', schoolId, 'sessions', selectedSessionForTerm, 'terms'), {
        name: newTermName.trim(),
        schoolId: schoolId,
        sessionId: selectedSessionForTerm,
        isCurrent: sessionTerms.length === 0
      });
      
      setNewTermName('');
      setMessage({ type: 'success', text: 'Term added successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error adding term:', err);
      setMessage({ type: 'error', text: `Failed to add term: ${err.message || 'Unknown database error'}` });
    } finally {
      setAddingTerm(false);
    }
  };

  const handleSetCurrentTerm = async (id: string, sessionId: string) => {
    try {
      const updates = terms.filter(t => t.sessionId === sessionId).map(t => 
        updateDoc(doc(db, 'schools', schoolId, 'sessions', sessionId, 'terms', t.id), { isCurrent: t.id === id })
      );
      await Promise.all(updates);
      setMessage({ type: 'success', text: 'Current term updated!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'terms');
      setMessage({ type: 'error', text: 'Failed to update current term' });
    }
  };

  const handleSaveGradeScale = async () => {
    if (!gradeScale || !schoolId) return;
    setSaving(true);
    try {
      const dataToSave = {
        schoolId: schoolId,
        name: gradeScale.name || 'Default Grading System',
        grades: gradeScale.grades,
        caConfig: gradeScale.caConfig || { cas: [{ name: 'CA 1', maxScore: 10 }, { name: 'CA 2', maxScore: 10 }, { name: 'CA 3', maxScore: 10 }], maxExamScore: 70 }
      };

      if (gradeScale.id) {
        await updateDoc(doc(db, 'schools', schoolId, 'gradeScales', gradeScale.id), dataToSave);
      } else {
        await addDoc(collection(db, 'schools', schoolId, 'gradeScales'), dataToSave);
      }
      setMessage({ type: 'success', text: 'Grading system updated!' });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'gradeScales');
      setMessage({ type: 'error', text: 'Failed to update grading system.' });
    } finally {
      setSaving(false);
    }
  };

  const updateGrade = (index: number, field: string, value: any) => {
    if (!gradeScale) return;
    const newGrades = [...gradeScale.grades];
    newGrades[index] = { ...newGrades[index], [field]: value };
    setGradeScale({ ...gradeScale, grades: newGrades });
  };

  const addGradeRow = () => {
    if (!gradeScale) return;
    setGradeScale({
      ...gradeScale,
      grades: [...gradeScale.grades, { grade: '', minScore: 0, maxScore: 0, remark: '' }]
    });
  };

  const removeGradeRow = (index: number) => {
    if (!gradeScale) return;
    const newGrades = gradeScale.grades.filter((_, i) => i !== index);
    setGradeScale({ ...gradeScale, grades: newGrades });
  };

  const updateCaConfig = (field: 'maxExamScore', value: number) => {
    if (!gradeScale) return;
    setGradeScale({
      ...gradeScale,
      caConfig: {
        ...gradeScale.caConfig || { cas: [], maxExamScore: 70 },
        [field]: value
      }
    });
  };

  const updateCaItem = (index: number, field: 'name' | 'maxScore', value: string | number) => {
    if (!gradeScale) return;
    const currentCaConfig = gradeScale.caConfig || { cas: [], maxExamScore: 70 };
    const newCas = [...currentCaConfig.cas];
    newCas[index] = { ...newCas[index], [field]: value };
    setGradeScale({
      ...gradeScale,
      caConfig: { ...currentCaConfig, cas: newCas }
    });
  };

  const addCaItem = () => {
    if (!gradeScale) return;
    const currentCaConfig = gradeScale.caConfig || { cas: [], maxExamScore: 70 };
    setGradeScale({
      ...gradeScale,
      caConfig: {
        ...currentCaConfig,
        cas: [...currentCaConfig.cas, { name: `CA ${currentCaConfig.cas.length + 1}`, maxScore: 10 }]
      }
    });
  };

  const removeCaItem = (index: number) => {
    if (!gradeScale) return;
    const currentCaConfig = gradeScale.caConfig || { cas: [], maxExamScore: 70 };
    const newCas = currentCaConfig.cas.filter((_, i) => i !== index);
    setGradeScale({
      ...gradeScale,
      caConfig: { ...currentCaConfig, cas: newCas }
    });
  };

  if (loading) return <div className="p-20 text-center text-slate-900 font-medium">Loading configuration...</div>;

  return (
  <div className="space-y-5">
    <div className="text-[10px] text-slate-400 font-mono">v1.0.5 - Updated 01:12</div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-5">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                <Calendar size={20} />
              </div>
              <h3 className="text-xl font-medium text-slate-900">Academic Sessions</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                placeholder="e.g. 2025/2026"
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text min-w-0"
              />
              <button
                onClick={handleAddSession}
                disabled={addingSession || !newSessionName.trim()}
                className="w-full sm:w-auto p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {addingSession ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                <span className="sm:hidden font-bold">{addingSession ? 'Adding...' : 'Add Session'}</span>
              </button>
            </div>

            <div className="space-y-3">
              {sessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-900">{session.name}</span>
                  <button
                    onClick={() => handleSetCurrentSession(session.id)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      session.isCurrent ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'
                    }`}
                  >
                    {session.isCurrent ? 'Current' : 'Set Current'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                <Settings size={20} />
              </div>
              <h3 className="text-xl font-medium text-slate-900">Academic Terms</h3>
            </div>

            <div className="space-y-6 mb-6">
              <select
                value={selectedSessionForTerm}
                onChange={e => setSelectedSessionForTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-pointer"
              >
                <option value="">Select Session</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="e.g. 1st Term"
                  value={newTermName}
                  onChange={e => setNewTermName(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text min-w-0"
                />
                <button
                  onClick={handleAddTerm}
                  disabled={addingTerm || !newTermName.trim() || !selectedSessionForTerm}
                  className="w-full sm:w-auto p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addingTerm ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                  <span className="sm:hidden font-bold">{addingTerm ? 'Adding...' : 'Add Term'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {terms.filter(t => t.sessionId === selectedSessionForTerm).map(term => (
                <div key={term.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-900">{term.name}</span>
                  <button
                    onClick={() => handleSetCurrentTerm(term.id, term.sessionId)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      term.isCurrent ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'
                    }`}
                  >
                    {term.isCurrent ? 'Current' : 'Set Current'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                <Award size={20} />
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-slate-900">Grading System</h3>
            </div>
            <button
              onClick={handleSaveGradeScale}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-200"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              <span className="whitespace-nowrap">{saving ? 'Saving...' : 'Save Scale'}</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100 mb-6">
              <h4 className="text-sm font-medium text-slate-900 mb-4">CA & Exam Configuration</h4>
              
              <div className="space-y-4">
                {gradeScale?.caConfig?.cas.map((ca, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    <input
                      type="text"
                      value={ca.name}
                      onChange={e => updateCaItem(idx, 'name', e.target.value)}
                      placeholder="CA Name (e.g., CA 1)"
                      className="w-full sm:flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-900 text-sm"
                    />
                    <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                      <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
                        <span className="text-xs text-slate-900 font-medium whitespace-nowrap">Max Score:</span>
                        <input
                          type="number"
                          value={ca.maxScore}
                          onChange={e => updateCaItem(idx, 'maxScore', Number(e.target.value))}
                          className="w-20 sm:w-24 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-900 text-sm text-center"
                        />
                      </div>
                      <button onClick={() => removeCaItem(idx)} className="p-2.5 text-slate-900 hover:text-red-500 transition-colors bg-white rounded-xl border border-gray-200 hover:border-red-200 shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={addCaItem}
                  className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-slate-900 font-medium hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 text-sm bg-white"
                >
                  <Plus size={16} />
                  Add Continuous Assessment (CA)
                </button>

                <div className="pt-4 mt-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="font-medium text-slate-900 text-sm">Exam Max Score</span>
                  <input
                    type="number"
                    value={gradeScale?.caConfig?.maxExamScore || 70}
                    onChange={e => updateCaConfig('maxExamScore', Number(e.target.value))}
                    className="w-20 sm:w-24 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-900 text-sm text-center"
                  />
                </div>
                
                <div className="bg-emerald-50 text-emerald-700 p-3 sm:p-4 rounded-xl border border-emerald-100 text-sm font-medium flex justify-between items-center">
                  <span>Total Maximum Score:</span>
                  <span className="font-medium text-lg">
                    {((gradeScale?.caConfig?.cas.reduce((sum, ca) => sum + ca.maxScore, 0)) || 0) + (gradeScale?.caConfig?.maxExamScore || 0)}
                  </span>
                </div>
              </div>
            </div>

            <h4 className="text-sm font-medium text-slate-900 mb-4">Grade Scale</h4>
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-[10px] font-medium text-slate-900 uppercase tracking-widest">
              <div className="col-span-2">Grade</div>
              <div className="col-span-3">Min Score</div>
              <div className="col-span-3">Max Score</div>
              <div className="col-span-3">Remark</div>
              <div className="col-span-1"></div>
            </div>
            
            <div className="space-y-4">
              {gradeScale?.grades.map((g, idx) => (
                <div key={idx} className="bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-2xl border sm:border-0 border-slate-100 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center space-y-4 sm:space-y-0">
                  <div className="sm:col-span-2">
                    <label className="block sm:hidden text-[10px] font-medium text-slate-900 uppercase tracking-widest mb-1">Grade</label>
                    <input
                      type="text"
                      value={g.grade}
                      onChange={e => updateGrade(idx, 'grade', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white sm:bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-900 text-center cursor-text"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block sm:hidden text-[10px] font-medium text-slate-900 uppercase tracking-widest mb-1">Min Score</label>
                    <input
                      type="number"
                      value={g.minScore}
                      onChange={e => updateGrade(idx, 'minScore', Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white sm:bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-900 text-center cursor-text"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block sm:hidden text-[10px] font-medium text-slate-900 uppercase tracking-widest mb-1">Max Score</label>
                    <input
                      type="number"
                      value={g.maxScore}
                      onChange={e => updateGrade(idx, 'maxScore', Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white sm:bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-900 text-center cursor-text"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block sm:hidden text-[10px] font-medium text-slate-900 uppercase tracking-widest mb-1">Remark</label>
                    <input
                      type="text"
                      value={g.remark}
                      onChange={e => updateGrade(idx, 'remark', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white sm:bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-900 text-center cursor-text"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button onClick={() => removeGradeRow(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors bg-white sm:bg-transparent rounded-lg border sm:border-0 border-slate-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addGradeRow}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-slate-900 font-medium hover:border-emerald-500 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Grade Level
            </button>
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-4 rounded-2xl flex items-center gap-3 ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="font-medium text-sm">{message.text}</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
