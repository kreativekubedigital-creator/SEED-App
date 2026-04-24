import React, { useState, useEffect } from'react';
import { db, collection, query, where, getDocs, doc, setDoc, onSnapshot, serverTimestamp, handleFirestoreError, OperationType } from'../../lib/compatibility';
import { UserProfile, Class, Subject, Timetable, TimetablePeriod } from'../../types';
import { Clock, Save, Edit2, X, Plus, Trash2 } from'lucide-react';
import { sortByName } from'../../lib/utils';

interface ClassTimetableProps {
 user: UserProfile;
 mode:'view'|'edit';
 studentClassId?: string; // For students/parents viewing a specific class
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

const ClassTimetable: React.FC<ClassTimetableProps> = ({ user, mode, studentClassId }) => {
 const [classes, setClasses] = useState<Class[]>([]);
 const [subjects, setSubjects] = useState<Subject[]>([]);
 const [selectedClass, setSelectedClass] = useState<string>(studentClassId ||'');
 const [timetable, setTimetable] = useState<Timetable | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [message, setMessage] = useState({ type:'', text:''});
 
 // Edit state
 const [editSchedule, setEditSchedule] = useState<Record<string, TimetablePeriod[]>>({
 Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
 });

 useEffect(() => {
 if (!user.schoolId) return;
 
 // Fetch subjects for mapping
 const unsubSubjects = onSnapshot(collection(db,'schools', user.schoolId,'subjects'), (snap) => {
 setSubjects(sortByName(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject))));
 });

 if (mode  === 'edit'|| !studentClassId) {
 const unsubClasses = onSnapshot(collection(db,'schools', user.schoolId,'classes'), (snap) => {
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
 const q = query(collection(db,'schools', user.schoolId,'timetables'), 
 where('classId','==', selectedClass)
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
 handleFirestoreError(error, OperationType.GET,'timetables');
 }
 };
 fetchTimetable();
 }, [user.schoolId, selectedClass]);

 const handleAddPeriod = (day: string) => {
 const newPeriod: TimetablePeriod = {
 id: Math.random().toString(36).substring(2, 9),
 startTime:'08:00',
 endTime:'08:45',
 subjectId:''
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
 setMessage({ type:'', text:''});
 try {
 const timetableId =`${ selectedClass }_timetable`;
 const timetableRef = doc(db,'schools', user.schoolId,'timetables', timetableId);
 
 const newTimetable: Partial<Timetable> = {
 id: timetableId,
 schoolId: user.schoolId,
 classId: selectedClass,
 schedule: editSchedule,
 updatedAt: new Date().toISOString()
 };
 
 await setDoc(timetableRef, newTimetable, { merge: true });
 setTimetable(newTimetable as Timetable);
 setMessage({ type:'success', text:'Timetable saved successfully!'});
 setTimeout(() => setMessage({ type:'', text:''}), 3000);
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE,'timetables');
 setMessage({ type:'error', text:'Failed to save timetable.'});
 } finally {
 setSaving(false);
 }
 };

 const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name ||'Break / Free';

 if (loading) return <div className="p-8 text-center text-slate-900">Loading timetable...</div>;

 return (
 <div className="space-y-6">
 <div className="bg-white backdrop-blur-md p-6 rounded-2xl border border-slate-300 shadow-sm">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
 <div>
 <h2 className="text-xl font-medium text-slate-900">Class Timetable</h2>
 <p className="text-sm text-slate-900 mt-1">Weekly schedule of classes</p>
 </div>
 
 {(mode  === 'edit'|| (!studentClassId && classes.length > 0)) && (
 <select
 value={ selectedClass }
 onChange={(e) => setSelectedClass(e.target.value)}
 className="px-4 py-2 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
 >
 <option value=""disabled>Select a class</option>
 { classes.map(c => (
 <option key={ c.id } value={ c.id }>{ c.name }</option>
 ))}
 </select>
 )}
 </div>

 { message.text && (
 <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${ message.type  === 'success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>
 { message.text }
 </div>
 )}

 {!selectedClass ? (
 <div className="text-center py-12 bg-white rounded-xl border border-slate-300 border-dashed">
 <p className="text-slate-900 font-medium">Please select a class to view its timetable.</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <div className="min-w-[800px] grid grid-cols-5 gap-4">
 { DAYS.map(day => (
 <div key={ day } className="flex flex-col gap-3">
 <div className="bg-white py-2 px-3 rounded-lg border border-slate-300 text-center font-medium text-slate-900 shadow-sm">
 { day }
 </div>
 
 <div className="flex flex-col gap-2">
 {(mode  === 'edit'? editSchedule[day] : (timetable?.schedule?.[day] || [])).map((period, idx) => {
 const colors = ['bg-orange-50','bg-blue-50','bg-purple-50','bg-pink-50','bg-green-50'];
 const colorClass = mode  === 'view'? colors[idx % colors.length] :'bg-white';
 return (
 <div key={ period.id } className={`${ colorClass } backdrop-blur-sm p-3 rounded-xl border border-slate-300 shadow-sm relative group transition-all hover:shadow-md`}>
 { mode  === 'edit'? (
 <div className="space-y-2">
 <div className="flex gap-2">
 <input 
 type="time"
 value={ period.startTime }
 onChange={(e) => handleUpdatePeriod(day, period.id,'startTime', e.target.value)}
 className="w-full text-xs p-1 border border-gray-200 rounded bg-white focus:bg-white outline-none"
 />
 <span className="text-slate-900">-</span>
 <input 
 type="time"
 value={ period.endTime }
 onChange={(e) => handleUpdatePeriod(day, period.id,'endTime', e.target.value)}
 className="w-full text-xs p-1 border border-gray-200 rounded bg-white focus:bg-white outline-none"
 />
 </div>
 <select 
 value={ period.subjectId }
 onChange={(e) => handleUpdatePeriod(day, period.id,'subjectId', e.target.value)}
 className="w-full text-sm p-1 border border-gray-200 rounded bg-white focus:bg-white outline-none"
 >
 <option value="">Break / Free</option>
 { subjects.map(s => <option key={ s.id } value={ s.id }>{ s.name }</option>)}
 </select>
 <button 
 onClick={() => handleRemovePeriod(day, period.id)}
 className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
 >
 <X size={ 12 } />
 </button>
 </div>
 ) : (
 <>
 <div className="flex items-center gap-1 text-xs text-slate-900 font-medium mb-1">
 <Clock size={ 12 } /> { period.startTime } - { period.endTime }
 </div>
 <div className="font-medium text-sm text-slate-900">
 { getSubjectName(period.subjectId)}
 </div>
 </>
 )}
 </div>
 )})}
 
 { mode  === 'edit'&& (
 <button 
 onClick={() => handleAddPeriod(day)}
 className="py-2 border-2 border-dashed border-gray-300 rounded-xl text-slate-900 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-colors flex items-center justify-center bg-white"
 >
 <Plus size={ 16 } />
 </button>
 )}
 
 { mode  === 'view'&& (!timetable?.schedule?.[day] || timetable.schedule[day].length === 0) && (
 <div className="text-center py-4 text-xs text-slate-900 font-medium italic bg-white rounded-xl border border-slate-300 border-dashed">No classes</div>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 { mode  === 'edit'&& selectedClass && (
 <div className="mt-8 flex justify-end pt-4 border-t border-slate-100">
 <button
 onClick={ saveTimetable }
 disabled={ saving }
 className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
 >
 <Save size={ 18 } /> { saving ?'Saving...':'Save Timetable'}
 </button>
 </div>
 )}
 </div>
 </div>
 );
};

export default ClassTimetable;
