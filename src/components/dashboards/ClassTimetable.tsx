import React, { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, doc, setDoc, onSnapshot, serverTimestamp, handleFirestoreError, OperationType } from '../../lib/compatibility';
import { UserProfile, Class, Subject, Timetable, TimetablePeriod } from '../../types';
import { Clock, Save, Edit2, X, Plus, Trash2 } from 'lucide-react';
import { sortByName } from '../../lib/utils';

interface ClassTimetableProps {
  user: UserProfile;
  mode: 'view' | 'edit';
  studentClassId?: string; // For students/parents viewing a specific class
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const ClassTimetable: React.FC<ClassTimetableProps> = ({ user, mode, studentClassId }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(studentClassId || '');
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Edit state
  const [editSchedule, setEditSchedule] = useState<Record<string, TimetablePeriod[]>>({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
  });

  useEffect(() => {
    if (!user.schoolId) return;
    
    // Fetch subjects for mapping
    const unsubSubjects = onSnapshot(collection(db, 'schools', user.schoolId, 'subjects'), (snap) => {
      setSubjects(sortByName(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject))));
    });

    if (mode === 'edit' || !studentClassId) {
      const unsubClasses = onSnapshot(collection(db, 'schools', user.schoolId, 'classes'), (snap) => {
        const clsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
        const sortedClasses = sortByName(clsData) as Class[];
        setClasses(sortedClasses);
        if (sortedClasses.length > 0 && !selectedClass) {
          setSelectedClass(sortedClasses[0].id);
        }
        setLoading(false);
      });
      return () => {
        unsubSubjects();
        unsubClasses();
      };
    } else {
      setLoading(false);
      return () => unsubSubjects();
    }
  }, [user.schoolId, mode, studentClassId]);

  useEffect(() => {
    if (!user.schoolId || !selectedClass) return;
    
    const fetchTimetable = async () => {
      try {
        const q = query(collection(db, 'schools', user.schoolId, 'timetables'), 
          where('classId', '==', selectedClass)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as Timetable;
          setTimetable(data);
          setEditSchedule(data.schedule || { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] });
        } else {
          setTimetable(null);
          setEditSchedule({ Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'timetables');
      }
    };
    fetchTimetable();
  }, [user.schoolId, selectedClass]);

  const handleAddPeriod = (day: string) => {
    const newPeriod: TimetablePeriod = {
      id: Math.random().toString(36).substring(2, 9),
      startTime: '08:00',
      endTime: '08:45',
      subjectId: ''
    };
    setEditSchedule(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), newPeriod].sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));
  };

  const handleUpdatePeriod = (day: string, periodId: string, field: keyof TimetablePeriod, value: string) => {
    setEditSchedule(prev => ({
      ...prev,
      [day]: prev[day].map(p => p.id === periodId ? { ...p, [field]: value } : p).sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));
  };

  const handleRemovePeriod = (day: string, periodId: string) => {
    setEditSchedule(prev => ({
      ...prev,
      [day]: prev[day].filter(p => p.id !== periodId)
    }));
  };

  const saveTimetable = async () => {
    if (!user.schoolId || !selectedClass) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const timetableId = `${selectedClass}_timetable`;
      const timetableRef = doc(db, 'schools', user.schoolId, 'timetables', timetableId);
      
      const newTimetable: Partial<Timetable> = {
        id: timetableId,
        schoolId: user.schoolId,
        classId: selectedClass,
        schedule: editSchedule,
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(timetableRef, newTimetable, { merge: true });
      setTimetable(newTimetable as Timetable);
      setMessage({ type: 'success', text: 'Timetable saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'timetables');
      setMessage({ type: 'error', text: 'Failed to save timetable.' });
    } finally {
      setSaving(false);
    }
  };

  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || 'Break / Free';

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center text-slate-900 bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-white/50">
      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
      <p className="font-black uppercase tracking-widest text-[10px]">Loading timetable...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-white/50 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Class Timetable</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Weekly schedule of lessons</p>
          </div>
          
          {(mode === 'edit' || (!studentClassId && classes.length > 0)) && (
            <div className="relative group w-full md:w-auto">
              <select
                id="select_timetable_class"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full md:w-auto appearance-none pl-6 pr-12 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-[10px] text-slate-900 cursor-pointer shadow-sm"
              >
                <option value="" disabled>Select a class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Plus size={16} className="rotate-45" />
              </div>
            </div>
          )}
        </div>

        {message.text && (
          <div className={`p-4 rounded-2xl mb-8 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border shadow-sm ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
              : 'bg-rose-50 text-rose-600 border-rose-100'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${message.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {message.text}
          </div>
        )}

        {!selectedClass ? (
          <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100 border-dashed">
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Please select a class to view its timetable</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 md:mx-0 pb-4">
            <div className="min-w-[1000px] grid grid-cols-5 gap-5 px-6 md:px-0">
              {DAYS.map(day => (
                <div key={day} className="flex flex-col gap-4">
                  <div className="bg-slate-900 py-3 px-4 rounded-2xl text-center font-black uppercase tracking-widest text-[10px] text-white shadow-xl shadow-slate-900/10">
                    {day}
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {(mode === 'edit' ? editSchedule[day] : (timetable?.schedule?.[day] || [])).map((period, idx) => {
                      const colors = [
                        'bg-white border-blue-50 text-blue-600 shadow-blue-500/5',
                        'bg-white border-emerald-50 text-emerald-600 shadow-emerald-500/5',
                        'bg-white border-purple-50 text-purple-600 shadow-purple-500/5',
                        'bg-white border-orange-50 text-orange-600 shadow-orange-500/5',
                        'bg-white border-pink-50 text-pink-600 shadow-pink-500/5'
                      ];
                      const style = colors[idx % colors.length];
                      
                      return (
                        <div 
                          key={period.id} 
                          className={`p-4 rounded-3xl border shadow-sm relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                            mode === 'edit' ? 'bg-white border-slate-100' : style
                          }`}
                        >
                          {mode === 'edit' ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <input 
                                  id={`input_timetable_start_${period.id}`}
                                  type="time"
                                  value={period.startTime}
                                  onChange={(e) => handleUpdatePeriod(day, period.id, 'startTime', e.target.value)}
                                  className="w-full text-[10px] font-black uppercase p-2 border border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                                <span className="text-slate-300 font-bold">/</span>
                                <input 
                                  id={`input_timetable_end_${period.id}`}
                                  type="time"
                                  value={period.endTime}
                                  onChange={(e) => handleUpdatePeriod(day, period.id, 'endTime', e.target.value)}
                                  className="w-full text-[10px] font-black uppercase p-2 border border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                              </div>
                              <select 
                                id={`select_timetable_subject_${period.id}`}
                                value={period.subjectId}
                                onChange={(e) => handleUpdatePeriod(day, period.id, 'subjectId', e.target.value)}
                                className="w-full text-[10px] font-black uppercase p-2 border border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                              >
                                <option value="">Break / Free</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                              <button 
                                id={`btn_timetable_delete_${period.id}`}
                                onClick={() => handleRemovePeriod(day, period.id)}
                                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-lg shadow-rose-500/30 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                                <Clock size={12} /> 
                                {period.startTime} - {period.endTime}
                              </div>
                              <div className="font-black uppercase tracking-tighter text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                                {getSubjectName(period.subjectId)}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    
                    {mode === 'edit' && (
                      <button 
                        id={`btn_timetable_add_${day}`}
                        onClick={() => handleAddPeriod(day)}
                        className="py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-300 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all group flex flex-col items-center justify-center gap-1 bg-white/50"
                      >
                        <Plus size={20} className="transition-transform group-hover:rotate-90" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Add Period</span>
                      </button>
                    )}
                    
                    {mode === 'view' && (!timetable?.schedule?.[day] || timetable.schedule[day].length === 0) && (
                      <div className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-slate-300 italic bg-slate-50/50 rounded-3xl border border-slate-100 border-dashed">
                        No Lessons
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'edit' && selectedClass && (
          <div className="mt-12 flex justify-end">
            <button
              id="btn_timetable_save"
              onClick={saveTimetable}
              disabled={saving}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-blue-500/10"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Timetable
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassTimetable;
