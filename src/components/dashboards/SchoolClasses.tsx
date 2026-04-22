import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, where, handleFirestoreError, OperationType } from '../../firebase';
import { Class, School, Subject, UserProfile } from '../../types';
import { BookOpen, Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName, sortByFullName } from '../../lib/utils';

const PRIMARY_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Basic Science",
  "Basic Technology",
  "Information & Communication Technology (ICT) / Digital Literacy",
  "Social Studies",
  "Civic Education",
  "Cultural & Creative Arts",
  "Religious Studies (Christian Religious Studies / Islamic Religious Studies)",
  "Nigerian Language (e.g., Yoruba, Hausa, Igbo)",
  "Physical & Health Education (PHE)"
];

const SECONDARY_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Civic Education",
  "Social Studies",
  "Basic Science",
  "Basic Technology",
  "Physical & Health Education (PHE)",
  "Cultural & Creative Arts",
  "Religious Studies (CRS / IRS)",
  "Nigerian Language (Yoruba, Hausa, Igbo)",
  "French Language",
  "Agricultural Science",
  "Computer Studies / ICT",
  "Home Economics",
  "Business Studies",
  "Security Education",
  "Pre-Vocational Studies (Agriculture, Home Economics, Entrepreneurship)"
];

export const SchoolClasses = ({ school }: { school: School }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState<string | null>(null); // classId
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<'primary' | 'secondary'>('primary');
  
  const [newClassName, setNewClassName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');
  const [selectedPredefinedSubjects, setSelectedPredefinedSubjects] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubClasses = onSnapshot(collection(db, `schools/${school.id}/classes`), (snap) => {
      const classesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
      setClasses(sortByName(classesData));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${school.id}/classes`));

    const unsubSubjects = onSnapshot(collection(db, 'schools', school.id, 'subjects'), (snap) => {
      const subjectsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
      setSubjects(sortByName(subjectsData));
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${school.id}/subjects`));

    const unsubTeachers = onSnapshot(query(collection(db, 'users'), where('schoolId', '==', school.id), where('role', '==', 'teacher')), (snap) => {
      const teachersData = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setTeachers(sortByFullName(teachersData));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    return () => {
      unsubClasses();
      unsubSubjects();
      unsubTeachers();
    };
  }, [school.id]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, `schools/${school.id}/classes`), {
        name: newClassName,
        schoolId: school.id,
        level: activeLevel,
        createdAt: new Date().toISOString()
      });
      setShowAddClass(false);
      setNewClassName('');
    } catch (err: any) {
      setError(err.message || 'Failed to add class');
      handleFirestoreError(err, OperationType.CREATE, `schools/${school.id}/classes`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddSubject) return;
    setLoading(true);
    setError('');
    try {
      const subjectsToAdd = [...selectedPredefinedSubjects];
      if (newSubjectName.trim()) {
        subjectsToAdd.push(newSubjectName.trim());
      }
      
      if (subjectsToAdd.length === 0) {
        setError('Please select or enter at least one subject');
        setLoading(false);
        return;
      }

      await Promise.all(subjectsToAdd.map(subjectName => 
        addDoc(collection(db, 'schools', school.id, 'subjects'), {
          name: subjectName,
          classId: showAddSubject,
          teacherId: newSubjectTeacher,
          schoolId: school.id,
          createdAt: new Date().toISOString()
        })
      ));

      setShowAddSubject(null);
      setNewSubjectName('');
      setNewSubjectTeacher('');
      setSelectedPredefinedSubjects([]);
    } catch (err: any) {
      setError(err.message || 'Failed to add subject');
      handleFirestoreError(err, OperationType.CREATE, 'subjects');
    } finally {
      setLoading(false);
    }
  };

  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [classToEdit, setClassToEdit] = useState<Class | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassLevel, setEditClassLevel] = useState<'primary' | 'secondary'>('primary');
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectTeacher, setEditSubjectTeacher] = useState('');

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classToEdit) return;
    setLoading(true);
    setError('');
    try {
      await updateDoc(doc(db, `schools/${school.id}/classes`, classToEdit.id), {
        name: editClassName,
        level: editClassLevel
      });
      setClassToEdit(null);
      setEditClassName('');
    } catch (err: any) {
      setError(err.message || 'Failed to update class');
      handleFirestoreError(err, OperationType.UPDATE, `schools/${school.id}/classes/${classToEdit.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectToEdit) return;
    setLoading(true);
    setError('');
    try {
      await updateDoc(doc(db, 'schools', school.id, 'subjects', subjectToEdit.id), {
        name: editSubjectName,
        teacherId: editSubjectTeacher
      });
      setSubjectToEdit(null);
      setEditSubjectName('');
      setEditSubjectTeacher('');
    } catch (err: any) {
      setError(err.message || 'Failed to update subject');
      handleFirestoreError(err, OperationType.UPDATE, `subjects/${subjectToEdit.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      await deleteDoc(doc(db, `schools/${school.id}/classes`, classToDelete));
    } catch (err: any) {
      console.error("Error deleting class:", err);
      handleFirestoreError(err, OperationType.DELETE, `schools/${school.id}/classes/${classToDelete}`);
    } finally {
      setClassToDelete(null);
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    try {
      await deleteDoc(doc(db, 'schools', school.id, 'subjects', subjectToDelete));
    } catch (err: any) {
      console.error("Error deleting subject:", err);
      handleFirestoreError(err, OperationType.DELETE, `subjects/${subjectToDelete}`);
    } finally {
      setSubjectToDelete(null);
    }
  };

  const filteredClasses = classes.filter(c => c.level === activeLevel || (!c.level && activeLevel === 'primary'));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-medium text-gray-800">Classes & Subjects</h3>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-full border border-white/40 shadow-sm">
          <button
            onClick={() => setActiveLevel('primary')}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${activeLevel === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30' : 'text-gray-800 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            Primary
          </button>
          <button
            onClick={() => setActiveLevel('secondary')}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${activeLevel === 'secondary' ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30' : 'text-gray-800 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            Secondary
          </button>
        </div>
        <button
          onClick={() => setShowAddClass(true)}
          className="bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium  hover:scale-105 transition-all"
        >
          <Plus size={18} /> Add Class
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredClasses.map(c => {
          const classSubjects = subjects.filter(s => s.classId === c.id);
          const isExpanded = expandedClass === c.id;

          return (
            <div key={c.id} className="bg-white rounded-2xl border border-white/40 shadow-sm overflow-hidden transition-all hover:shadow-md group">
              <div className="p-4 flex justify-between items-center bg-white/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4 cursor-pointer flex-1 relative z-10" onClick={() => setExpandedClass(isExpanded ? null : c.id)}>
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-50 to-red-50 text-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-orange-100/50 group-hover:scale-110 transition-transform">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-xl text-gray-800 group-hover:text-orange-600 transition-colors">{c.name}</p>
                    <p className="text-sm text-gray-800 font-medium mt-1 bg-gray-50 px-2.5 py-0.5 rounded-full inline-block border border-gray-100">{classSubjects.length} Subjects</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  <button onClick={() => {
                    setClassToEdit(c);
                    setEditClassName(c.name);
                    setEditClassLevel(c.level as 'primary' | 'secondary' || 'primary');
                  }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2.5 rounded-xl transition-colors font-medium text-sm">
                    Edit
                  </button>
                  <button onClick={() => setClassToDelete(c.id)} className="text-gray-800 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors">
                    <Trash2 size={20} />
                  </button>
                  <button onClick={() => setExpandedClass(isExpanded ? null : c.id)} className={`text-gray-800 hover:text-gray-800 hover:bg-gray-50 p-2.5 rounded-xl transition-colors ${isExpanded ? 'bg-gray-50 text-gray-800' : ''}`}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100/50 bg-gray-50/50"
                  >
                    <div className="p-4 space-y-5">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-medium text-sm text-gray-800 uppercase tracking-widest">Subjects</h4>
                        <button
                          onClick={() => setShowAddSubject(c.id)}
                          className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full hover:bg-blue-50 transition-colors border border-blue-100/50"
                        >
                          <Plus size={16} /> Add Subject
                        </button>
                      </div>

                      {classSubjects.length === 0 ? (
                        <p className="text-sm text-gray-800 font-medium text-center py-8 bg-white/50 rounded-2xl border border-dashed border-gray-200">No subjects added yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {classSubjects.map(s => {
                            const teacher = teachers.find(t => t.uid === s.teacherId);
                            return (
                              <div key={s.id} className="flex justify-between items-center p-4 rounded-2xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group/subject">
                                <div>
                                  <p className="font-medium text-gray-800 text-lg group-hover/subject:text-blue-600 transition-colors">{s.name}</p>
                                  <p className="text-sm text-gray-800 font-medium mt-1 flex items-center gap-2">
                                    Teacher: 
                                    <span className="text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                      {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}
                                    </span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover/subject:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => {
                                      setSubjectToEdit(s);
                                      setEditSubjectName(s.name);
                                      setEditSubjectTeacher(s.teacherId || '');
                                    }} 
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2.5 rounded-xl transition-colors font-medium text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button onClick={() => setSubjectToDelete(s.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors">
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {classes.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-800 bg-white rounded-2xl border border-white/40 shadow-sm font-medium flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-800 mb-4 border border-gray-100">
              <BookOpen size={20} />
            </div>
            <p className="text-gray-800 font-medium text-lg">No classes found.</p>
            <p className="text-gray-800 font-medium mt-1">Add one to get started.</p>
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      <AnimatePresence>
        {showAddClass && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 w-full max-w-md shadow-2xl border border-white/40 relative overflow-hidden"
            >
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-lg font-medium text-gray-800">Add New Class</h3>
                <button onClick={() => setShowAddClass(false)} className="p-2 text-gray-800 hover:text-gray-800 hover:bg-gray-100/50 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium mb-6 border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddClass} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Class Name</label>
                  <input
                    type="text"
                    required
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                    placeholder="e.g. Grade 1A"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 py-2.5 rounded-full font-medium  hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  {loading ? 'Adding...' : 'Add Class'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Class Modal */}
      <AnimatePresence>
        {classToEdit && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 w-full max-w-md shadow-2xl border border-white/40 relative overflow-hidden"
            >
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-lg font-medium text-gray-800">Edit Class</h3>
                <button onClick={() => setClassToEdit(null)} className="p-2 text-gray-800 hover:text-gray-800 hover:bg-gray-100/50 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium mb-6 border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleEditClass} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Class Name</label>
                  <input
                    type="text"
                    required
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                    placeholder="e.g. Grade 1A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Level</label>
                  <select
                    value={editClassLevel}
                    onChange={(e) => setEditClassLevel(e.target.value as 'primary' | 'secondary')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 py-2.5 rounded-full font-medium  hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  {loading ? 'Updating...' : 'Update Class'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Subject Modal */}
      <AnimatePresence>
        {showAddSubject && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 w-full max-w-md shadow-2xl border border-white/40 max-h-[90vh] overflow-y-auto relative"
            >
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-lg font-medium text-gray-800">Add Subject</h3>
                <button onClick={() => {
                  setShowAddSubject(null);
                  setSelectedPredefinedSubjects([]);
                  setNewSubjectName('');
                }} className="p-2 text-gray-800 hover:text-gray-800 hover:bg-gray-100/50 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium mb-6 border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddSubject} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-3">Preloaded Subjects</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto p-4 border border-gray-200/50 rounded-2xl bg-white/50 custom-scrollbar">
                    {([...(classes.find(c => c.id === showAddSubject)?.level === 'secondary' ? SECONDARY_SUBJECTS : PRIMARY_SUBJECTS)].sort((a, b) => a.localeCompare(b))).map(subject => (
                      <label key={subject} className="flex items-center gap-3 cursor-pointer p-3 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-100 hover:shadow-sm">
                        <input
                          type="checkbox"
                          checked={selectedPredefinedSubjects.includes(subject)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPredefinedSubjects(prev => [...prev, subject]);
                            } else {
                              setSelectedPredefinedSubjects(prev => prev.filter(s => s !== subject));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                        />
                        <span className="text-sm font-medium text-gray-800">{subject}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Custom Subject Name (Optional)</label>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                    placeholder="e.g. Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Assign Teacher (Optional)</label>
                  <select
                    value={newSubjectTeacher}
                    onChange={(e) => setNewSubjectTeacher(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                  >
                    <option value="">Select a teacher...</option>
                    {teachers.map(t => (
                      <option key={t.uid} value={t.uid}>{`${t.firstName} ${t.lastName}`}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 py-2.5 rounded-full font-medium  hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  {loading ? 'Adding...' : 'Add Subject'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Subject Modal */}
      <AnimatePresence>
        {subjectToEdit && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 w-full max-w-md shadow-2xl border border-white/40 relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-lg font-medium text-gray-800">Edit Subject</h3>
                <button onClick={() => setSubjectToEdit(null)} className="p-2 text-gray-800 hover:text-gray-800 hover:bg-gray-100/50 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium mb-6 border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleEditSubject} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={editSubjectName}
                    onChange={(e) => setEditSubjectName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                    placeholder="e.g. Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Assign Teacher</label>
                  <select
                    value={editSubjectTeacher}
                    onChange={(e) => setEditSubjectTeacher(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 cursor-text"
                  >
                    <option value="">Unassigned (No Teacher)</option>
                    {teachers.map(t => (
                      <option key={t.uid} value={t.uid}>{`${t.firstName} ${t.lastName}`}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 py-2.5 rounded-full font-medium  hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  {loading ? 'Updating...' : 'Update Subject'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Class Modal */}
      <AnimatePresence>
        {classToDelete && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 w-full max-w-md shadow-2xl border border-white/40 relative overflow-hidden text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-800">Delete Class</h3>
              <p className="text-gray-800 font-medium mb-8">Are you sure you want to delete this class? This will not delete its subjects.</p>
              <div className="flex gap-4">
                <button onClick={() => setClassToDelete(null)} className="flex-1 py-2.5 rounded-full border border-gray-200/50 font-medium text-gray-800 hover:bg-gray-50 hover:text-gray-800 transition-colors bg-white/50">Cancel</button>
                <button onClick={handleDeleteClass} className="flex-1 py-2.5 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30 transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Subject Modal */}
      <AnimatePresence>
        {subjectToDelete && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 w-full max-w-md shadow-2xl border border-white/40 relative overflow-hidden text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-800">Delete Subject</h3>
              <p className="text-gray-800 font-medium mb-8">Are you sure you want to delete this subject?</p>
              <div className="flex gap-4">
                <button onClick={() => setSubjectToDelete(null)} className="flex-1 py-2.5 rounded-full border border-gray-200/50 font-medium text-gray-800 hover:bg-gray-50 hover:text-gray-800 transition-colors bg-white/50">Cancel</button>
                <button onClick={handleDeleteSubject} className="flex-1 py-2.5 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30 transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
