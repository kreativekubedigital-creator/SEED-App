import React, { useState, useEffect } from'react';
import { db, collection, addDoc, deleteDoc, doc, onSnapshot, query, where, handleFirestoreError, OperationType, orderBy } from'../../lib/compatibility';
import { Announcement, School, Class } from'../../types';
import { Bell, Plus, Trash2, X, Globe, Users, Send } from 'lucide-react';
import { motion, AnimatePresence } from'motion/react';
import { cn, sortByName } from'../../lib/utils';
import ReactQuill from'react-quill-new';
import'react-quill-new/dist/quill.snow.css';
import DOMPurify from'dompurify';

export const SchoolAnnouncements = ({ school }: { school: School }) => {
 const [announcements, setAnnouncements] = useState<Announcement[]>([]);
 const [classes, setClasses] = useState<Class[]>([]);
 const [showAdd, setShowAdd] = useState(false);
 const [newTitle, setNewTitle] = useState('');
 const [newContent, setNewContent] = useState('');
 const [targetType, setTargetType] = useState<'school'|'class'>('school');
 const [selectedClassId, setSelectedClassId] = useState('');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');

 useEffect(() => {
 const q = query(
 collection(db,'schools', school.id,'announcements'),
 orderBy('createdAt','desc')
 );
 const unsub = onSnapshot(q, (snap) => {
 setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
 }, (error) => {
 handleFirestoreError(error, OperationType.GET,`schools/${ school.id }/announcements`);
 });

 const unsubClasses = onSnapshot(collection(db,'schools', school.id,'classes'), (snap) => {
 setClasses(sortByName(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class))));
 }, (error) => handleFirestoreError(error, OperationType.GET,`schools/${ school.id }/classes`));

 return () => {
 unsub();
 unsubClasses();
 };
 }, [school.id]);

 const handleAdd = async (e: React.FormEvent) => {
 e.preventDefault();
 if (targetType  === 'class'&& !selectedClassId) {
 setError('Please select a class');
 return;
 }
 setLoading(true);
 setError('');
 try {
 await addDoc(collection(db,'schools', school.id,'announcements'), {
 title: newTitle,
 content: newContent,
 schoolId: school.id,
 isSchoolWide: targetType  === 'school',
 classId: targetType  === 'class'? selectedClassId : null,
 createdAt: new Date().toISOString()
 });
 setShowAdd(false);
 setNewTitle('');
 setNewContent('');
 setTargetType('school');
 setSelectedClassId('');
 } catch (err: any) {
 setError(err.message ||'Failed to post announcement');
 handleFirestoreError(err, OperationType.CREATE,'announcements');
 } finally {
 setLoading(false);
 }
 };

 const getClassName = (classId?: string) => {
 if (!classId) return'';
 return classes.find(c => c.id === classId)?.name ||'Unknown Class';
 };

 const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

 const handleDelete = async () => {
 if (!announcementToDelete) return;
 try {
 await deleteDoc(doc(db,'schools', school.id,'announcements', announcementToDelete));
 } catch (err: any) {
 console.error("Error deleting announcement:", err);
 handleFirestoreError(err, OperationType.DELETE,`announcements/${ announcementToDelete }`);
 } finally {
 setAnnouncementToDelete(null);
 }
 };

 return (
 <div className="space-y-5">
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-medium text-slate-900">Announcements</h3>
 <button
 onClick={() => setShowAdd(true)}
 className="bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium hover:scale-105 transition-all"
 >
 <Plus size={ 18 } /> Post Announcement
 </button>
 </div>

 <div className="space-y-6">
 { announcements.map(a => (
 <div key={ a.id } className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col gap-4 transition-all hover:shadow-md group relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
 <div className="flex justify-between items-start relative z-10">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50 group-hover:scale-110 transition-transform">
 <Bell size={ 20 } />
 </div>
 <div>
 <p className="font-medium text-lg text-slate-900 group-hover:text-blue-700 transition-colors">{ a.title }</p>
 <div className="flex items-center gap-2 mt-1.5">
 <p className="text-xs text-slate-900 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{ new Date(a.createdAt).toLocaleString()}</p>
 <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium uppercase tracking-wider border ${
 a.isSchoolWide 
 ?'bg-blue-50 text-blue-700 border-blue-200/50'
 :'bg-indigo-50 text-indigo-700 border-indigo-200/50'
 }`}>
 { a.isSchoolWide ?'School-wide':`Class: ${ getClassName(a.classId)}`}
 </span>
 </div>
 </div>
 </div>
 <button onClick={() => setAnnouncementToDelete(a.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
 <Trash2 size={ 20 } />
 </button>
 </div>
 <div 
 className="text-slate-900 leading-relaxed relative z-10 pl-16 prose prose-sm max-w-none"
 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content) }}
 />
 </div>
 ))}
 { announcements.length === 0 && (
 <div className="text-center py-16 text-slate-900 bg-white rounded-2xl border border-slate-300 shadow-sm font-medium flex flex-col items-center justify-center">
 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 mb-4 border border-slate-100">
 <Bell size={ 20 } />
 </div>
 <p className="text-slate-900 font-medium text-lg">No announcements found.</p>
 <p className="text-slate-900 font-medium mt-1">Post one to keep everyone updated.</p>
 </div>
 )}
 </div>

 <AnimatePresence>
 { showAdd && (
 <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
 <motion.div
 initial={{ scale: 0.95, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.95, opacity: 0, y: 20 }}
 className="bg-white backdrop-blur-xl rounded-2xl w-full max-w-lg shadow-2xl border border-slate-300 relative flex flex-col max-h-[90vh] overflow-hidden"
 >
 
  <form onSubmit={ handleAdd } className="flex flex-col flex-1 overflow-hidden">
  <div className="flex justify-between items-center p-4 border-b border-slate-100 relative z-10 shrink-0">
  <h3 className="text-lg font-semibold text-slate-900">Post Announcement</h3>
  <button onClick={() => setShowAdd(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
  <X size={ 20 } />
  </button>
  </div>

  <div className="flex-1 overflow-y-auto p-4">
  { error && (
  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6">
  { error }
  </div>
  )}

 <div className="space-y-5">
 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => setTargetType('school')}
 className={ cn(
"p-3 rounded-2xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
  targetType  === 'school'?"bg-blue-50 text-blue-700 border-blue-200/50 shadow-sm":"border-gray-200/50 text-slate-900 hover:bg-slate-50 bg-white"
 )}
 >
 <Globe size={ 18 } /> School-wide
 </button>
 <button
 type="button"
 onClick={() => setTargetType('class')}
 className={ cn(
"p-3 rounded-2xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
  targetType  === 'class'?"bg-indigo-50 text-indigo-700 border-indigo-200/50 shadow-sm":"border-gray-200/50 text-slate-900 hover:bg-slate-50 bg-white"
 )}
 >
 <Users size={ 18 } /> Class-specific
 </button>
 </div>

 { targetType  === 'class'&& (
 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
  <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Select Class</label>
 <select
 required
 value={ selectedClassId }
 onChange={(e) => setSelectedClassId(e.target.value)}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-pointer"
 >
 <option value="">Choose a class</option>
 { classes.map(c => (
 <option key={ c.id } value={ c.id }>{ c.name }</option>
 ))}
 </select>
 </motion.div>
 )}

 <div>
  <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Title</label>
 <input
 type="text"
 required
 value={ newTitle }
 onChange={(e) => setNewTitle(e.target.value)}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 placeholder="e.g. School Resumption Date"
 />
 </div>
 <div>
  <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Content</label>
 <div className="bg-white rounded-xl overflow-hidden border border-gray-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
 <ReactQuill
 theme="snow"
 value={ newContent }
 onChange={ setNewContent }
 placeholder="Write your announcement here..."
  className="h-[100px] mb-12"
 modules={{
 toolbar: [
 [{'header': [1, 2, false] }],
 ['bold','italic','underline','strike'],
 [{'list':'ordered'}, {'list':'bullet'}],
 ['link','clean']
 ],
 }}
 />
 </div>
 </div>
 </div>
 </div>

 <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
 <button
 type="submit"
 disabled={ loading }
 className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
 >
 { loading ? (
 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 ) : (
 <>
 <Send size={ 18 } />
 Post Announcement
 </>
 )}
 </button>
 </div>
 </form>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Delete Announcement Modal */}
 <AnimatePresence>
 { announcementToDelete && (
 <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
 <motion.div
 initial={{ scale: 0.95, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.95, opacity: 0, y: 20 }}
 className="bg-white backdrop-blur-xl rounded-2xl p-4 w-full max-w-md shadow-2xl border border-slate-300 relative overflow-hidden text-center"
 >
 <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
 <Trash2 size={ 20 } />
 </div>
 <h3 className="text-lg font-medium mb-2 text-slate-900">Delete Announcement</h3>
 <p className="text-slate-900 font-medium mb-8">Are you sure you want to delete this announcement? This action cannot be undone.</p>
 <div className="flex gap-4">
 <button onClick={() => setAnnouncementToDelete(null)} className="flex-1 py-2.5 rounded-full border border-gray-200/50 font-medium text-slate-900 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white">Cancel</button>
 <button onClick={ handleDelete } className="flex-1 py-2.5 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30 transition-all">Delete</button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
};
