import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, School } from '../../types';
import { DEFAULT_PLANS } from '../../constants';
import { 
  Plus, 
  Shield, 
  CreditCard, 
  Users, 
  School as SchoolIcon, 
  Trash2, 
  CheckCircle, 
  Settings, 
  Search, 
  MoreVertical,
  ExternalLink,
  ArrowRight,
  LayoutDashboard,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, OperationType, handleFirestoreError, query, where, onSnapshot, secondaryAuth, createUserWithEmailAndPassword, setDoc, logAuditAction } from '../../firebase';
import { SchoolManagement } from './SchoolManagement';
import { sortByName } from '../../lib/utils';

export const SuperAdminDashboard = ({ user }: { user: UserProfile }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [newSchool, setNewSchool] = useState({ name: '', slug: '', email: '', address: '', phone: '', planId: 'free' });
  const [adminDetails, setAdminDetails] = useState({ firstName: '', lastName: '', password: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'schools'), (snapshot) => {
      const schoolsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as School[];
      setSchools(sortByName(schoolsData));
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch schools:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'schools');
      } catch (err: any) {
        setError(`Failed to load schools: ${err.message}`);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSchool && onboardingStep < 3) {
      setOnboardingStep(onboardingStep + 1);
      return;
    }

    const schoolData = {
      ...newSchool,
      status: editingSchool ? editingSchool.status : 'active',
      createdAt: editingSchool ? (editingSchool as any).createdAt : new Date().toISOString()
    };

    try {
      setError(null);
      if (!newSchool.slug) {
        setError("Subdomain slug is required.");
        return;
      }
      if (!editingSchool || newSchool.slug !== editingSchool.slug) {
        const slugQuery = query(collection(db, 'schools'), where('slug', '==', newSchool.slug));
        const slugSnap = await getDocs(slugQuery);
        if (!slugSnap.empty) {
          setError("This subdomain slug is already in use. Please choose another.");
          return;
        }
      }

      if (editingSchool) {
        const schoolRef = doc(db, 'schools', editingSchool.id);
        await updateDoc(schoolRef, schoolData);
        await logAuditAction('UPDATE_SCHOOL', `Updated school: ${schoolData.name}`, editingSchool.id, 'school');
        setSuccess("School updated successfully");
      } else {
        if (!adminDetails.password || adminDetails.password.length < 6) {
          setError("Admin password must be at least 6 characters long.");
          return;
        }

        // 1. Create School
        const schoolDocRef = await addDoc(collection(db, 'schools'), schoolData);
        
        // 2. Create Initial Admin User
        const trimmedEmail = newSchool.email.trim();
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, trimmedEmail, adminDetails.password);
        const newUid = userCredential.user.uid;
        
        const adminUserData = {
          uid: newUid,
          email: trimmedEmail,
          firstName: adminDetails.firstName,
          lastName: adminDetails.lastName,
          role: 'school_admin',
          schoolId: schoolDocRef.id,
          createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'users', newUid), adminUserData);
        await secondaryAuth.signOut(); // Clean up secondary auth session

        await logAuditAction('CREATE_SCHOOL', `Created school: ${schoolData.name} with admin ${trimmedEmail}`, schoolDocRef.id, 'school');

        setSuccess("School and initial admin created successfully");
      }
      setShowAddSchool(false);
      setEditingSchool(null);
      setOnboardingStep(1);
      setNewSchool({ name: '', slug: '', email: '', address: '', phone: '', planId: 'free' });
      setAdminDetails({ firstName: '', lastName: '', password: '' });
    } catch (error: any) {
      console.error("Failed to save school:", error);
      if (error.code === 'auth/email-already-in-use') {
        setError("The admin email is already in use by another account.");
      } else {
        try {
          handleFirestoreError(error, OperationType.WRITE, 'schools');
        } catch (err: any) {
          setError(`Failed to save school: ${err.message}`);
        }
      }
    }
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleEditSchool = (school: School) => {
    setEditingSchool(school);
    setNewSchool({ 
      name: school.name, 
      slug: school.slug || '',
      email: school.email, 
      address: school.address || '', 
      phone: school.phone || '', 
      planId: school.planId 
    });
    setShowAddSchool(true);
  };

  const toggleSchoolStatus = async (school: School) => {
    const newStatus = school.status === 'active' ? 'suspended' : 'active';
    try {
      setError(null);
      const schoolRef = doc(db, 'schools', school.id);
      await updateDoc(schoolRef, { status: newStatus });
      await logAuditAction('TOGGLE_SCHOOL_STATUS', `Changed status of ${school.name} to ${newStatus}`, school.id, 'school');
      setSuccess(`School ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
    } catch (error) {
      console.error("Failed to update status:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, 'schools');
      } catch (err: any) {
        setError(`Failed to update status: ${err.message}`);
      }
    }
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteSchool = async (id: string) => {
    try {
      setError(null);
      const schoolToDelete = schools.find(s => s.id === id);
      await deleteDoc(doc(db, 'schools', id));
      if (schoolToDelete) {
        await logAuditAction('DELETE_SCHOOL', `Deleted school: ${schoolToDelete.name}`, id, 'school');
      }
      setSuccess("School deleted successfully");
    } catch (error) {
      console.error("Failed to delete school:", error);
      try {
        handleFirestoreError(error, OperationType.DELETE, 'schools');
      } catch (err: any) {
        setError(`Failed to delete school: ${err.message}`);
      }
    }
    setShowDeleteConfirm(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const filteredSchools = schools.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  if (selectedSchoolId) {
    const school = schools.find(s => s.id === selectedSchoolId);
    if (school) {
      return <SchoolManagement school={school} onBack={() => setSelectedSchoolId(null)} />;
    }
  }

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-24 h-24 bg-white dark:bg-slate-900/80 backdrop-blur-sm rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 dark:border-slate-800">
        <Settings size={48} className="animate-spin-slow" />
      </div>
      <p className="text-blue-600 font-medium">Loading platform data...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20 px-4 md:px-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="w-full">
          <h2 className="text-2xl md:text-3xl font-medium text-slate-900 dark:text-white transition-colors flex items-center gap-3">
            <div className="p-3 bg-blue-600/10 dark:bg-blue-600/20 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
              <Shield size={24} className="md:w-7 md:h-7" />
            </div>
            Platform Overview
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm md:text-base font-medium">Manage your educational ecosystem and school subscriptions.</p>
        </div>
        <button
          onClick={() => setShowAddSchool(true)}
          className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 md:py-3 rounded-2xl md:rounded-xl flex justify-center items-center gap-3 text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:translate-y-[-2px] transition-all active:translate-y-0"
        >
          <Plus size={20} /> Add New School
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Schools', value: schools.length, icon: SchoolIcon, colorClasses: 'bg-blue-600/10 text-blue-600 dark:text-blue-400', onClick: () => { setFilterStatus('all'); tableRef.current?.scrollIntoView({ behavior: 'smooth' }); } },
          { label: 'Active Subscriptions', value: schools.filter(s => s.status === 'active').length, icon: CreditCard, colorClasses: 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400', onClick: () => { setFilterStatus('active'); tableRef.current?.scrollIntoView({ behavior: 'smooth' }); } },
          { label: 'System Health', value: '99.9%', icon: CheckCircle, colorClasses: 'bg-amber-600/10 text-amber-600 dark:text-amber-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={stat.onClick}
            className={`bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none transition-all ${stat.onClick ? 'cursor-pointer hover:shadow-2xl hover:translate-y-[-4px] active:translate-y-0' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${stat.colorClasses}`}>
                  <stat.icon size={24} />
                </div>
                <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">{stat.label}</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div ref={tableRef} className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/20 dark:shadow-none overflow-hidden scroll-mt-24">
        <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white transition-colors">Managed Schools</h3>
            {filterStatus !== 'all' && (
              <span className="px-3 py-1 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold capitalize flex items-center gap-2">
                {filterStatus} Only
                <button onClick={() => setFilterStatus('all')} className="hover:text-blue-800 dark:hover:text-blue-200"><X size={14} /></button>
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-4 md:py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-950 text-slate-900 dark:text-white hover:border-blue-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm"
            />
          </div>
        </div>
        
        <div className="w-full">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-[0.2em] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="pl-8 pr-4 py-5 font-bold">School Info</th>
                  <th className="px-4 py-5 font-bold">Plan & Billing</th>
                  <th className="px-4 py-5 font-bold">Status</th>
                  <th className="px-4 py-5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSchools.map((school, i) => (
                  <motion.tr 
                    key={school.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                  >
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-4 pl-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl shadow-inner group-hover:scale-110 transition-transform overflow-hidden border border-slate-100 dark:border-slate-800">
                          {school.logoUrl ? (
                            <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            school.name?.charAt(0) || '?'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">{school.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{school.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">{school.planId} Plan</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Billing Active</span>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block shadow-sm",
                        school.status === 'active' 
                          ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                          : "bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      )}>
                        {school.status}
                      </span>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex gap-2 justify-end items-center">
                        <button
                          onClick={() => setSelectedSchoolId(school.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 hover:translate-y-[-1px] transition-all active:translate-y-0 shadow-md shadow-blue-600/10"
                        >
                          Manage <ArrowRight size={14} />
                        </button>
                        <button
                          onClick={() => toggleSchoolStatus(school)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title={school.status === 'active' ? 'Suspend' : 'Activate'}
                        >
                          <Settings size={18} />
                        </button>
                        <button
                          onClick={() => handleEditSchool(school)}
                          className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 transition-colors"
                          title="Edit School"
                        >
                          <ExternalLink size={18} />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(school.id)}
                          className="p-2.5 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 hover:bg-red-600/20 transition-colors"
                          title="Delete School"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filteredSchools.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500">
                          <SchoolIcon size={64} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">No schools found matching your search.</p>
                        <button onClick={() => {setSearchQuery(''); setFilterStatus('all');}} className="text-blue-600 font-bold hover:underline">Clear all filters</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col gap-4 p-4">
            {filteredSchools.map((school, i) => (
              <motion.div 
                key={school.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/20 dark:shadow-none border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-xl shrink-0 shadow-inner overflow-hidden border border-slate-100 dark:border-slate-800">
                    {school.logoUrl ? (
                      <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      school.name?.charAt(0) || '?'
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-base text-slate-900 dark:text-white truncate">{school.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{school.email}</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Pricing Plan</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                      {school.planId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">License Status</span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full",
                      school.status === 'active' 
                        ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                        : "bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20"
                    )}>
                      {school.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setSelectedSchoolId(school.id)}
                    className="flex-1 flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    Manage <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => toggleSchoolStatus(school)}
                    className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                  >
                    <Settings size={18} />
                  </button>
                  <button
                    onClick={() => handleEditSchool(school)}
                    className="p-3 rounded-xl bg-blue-600/10 text-blue-600' dark:text-blue-400 hover:bg-blue-600/20 transition-colors"
                    title="Edit School"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(school.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                    title="Delete School"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
            {filteredSchools.length === 0 && (
              <div className="py-8 text-center text-slate-900 dark:text-slate-100 text-sm">No schools found matching your search.</div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddSchool && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 p-4 md:p-4 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 my-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-8">
                <h3 className="text-2xl md:text-xl font-medium text-slate-900 dark:text-slate-100">{editingSchool ? 'Edit School' : 'Onboard New School'}</h3>
                <p className="text-slate-900 dark:text-slate-100 mt-2 font-medium">Enter the details to create a new school ecosystem.</p>
              </div>

              {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium">{error}</div>}
              
              <form onSubmit={handleAddSchool} className="space-y-5">
                {editingSchool || onboardingStep === 1 ? (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">{editingSchool ? 'School Details' : 'Step 1: School Details'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 dark:text-slate-100 text-slate-900 dark:text-slate-100 ml-1">School Name</label>
                        <input
                          required
                          type="text"
                          value={newSchool.name}
                          onChange={e => {
                            const val = e.target.value;
                            const currentGenerated = newSchool.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                            const newSlug = (!newSchool.slug || newSchool.slug === currentGenerated)
                              ? val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
                              : newSchool.slug;
                            setNewSchool({ ...newSchool, name: val, slug: newSlug });
                          }}
                          className="w-full p-4 rounded-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
                          placeholder="e.g. Green Valley Academy"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 dark:text-slate-100 text-slate-900 dark:text-slate-100 ml-1">Admin Email</label>
                        <input
                          required
                          type="email"
                          value={newSchool.email}
                          onChange={e => setNewSchool({ ...newSchool, email: e.target.value })}
                          className="w-full p-4 rounded-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
                          placeholder="admin@school.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 dark:text-slate-100 ml-1">Subdomain Slug</label>
                      <div className="flex">
                        <input
                          required
                          type="text"
                          value={newSchool.slug}
                          onChange={e => setNewSchool({ ...newSchool, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                          className="w-full p-4 rounded-l-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
                          placeholder="e.g. green-valley"
                        />
                        <div className="p-4 bg-gray-100 border-t border-b border-r border-gray-200 rounded-r-xl text-gray-500 font-medium whitespace-nowrap flex items-center">
                          .{window.location.hostname.replace('www.', '').split('.').slice(-2).join('.')}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 dark:text-slate-100 text-slate-900 dark:text-slate-100 ml-1">Physical Address</label>
                      <input
                        required
                        type="text"
                        value={newSchool.address}
                        onChange={e => setNewSchool({ ...newSchool, address: e.target.value })}
                        className="w-full p-4 rounded-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
                        placeholder="123 Education Way, Lagos"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 dark:text-slate-100 text-slate-900 dark:text-slate-100 ml-1">Phone Number</label>
                      <input
                        required
                        type="tel"
                        value={newSchool.phone}
                        onChange={e => setNewSchool({ ...newSchool, phone: e.target.value })}
                        className="w-full p-4 rounded-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
                        placeholder="+234..."
                      />
                    </div>

                    {editingSchool && (
                      <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Subscription Plan</h4>
                        <div className="space-y-4">
                          {DEFAULT_PLANS.map(plan => (
                            <label key={plan.id} className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${newSchool.planId === plan.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:bg-slate-50 dark:bg-slate-800'}`}>
                              <input
                                type="radio"
                                name="plan"
                                value={plan.id}
                                checked={newSchool.planId === plan.id}
                                onChange={(e) => setNewSchool({ ...newSchool, planId: e.target.value })}
                                className="mt-1.5"
                              />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{plan.name}</p>
                                <p className="text-sm text-slate-900 dark:text-slate-100 font-medium mt-1">₦{plan.price.toLocaleString()} / term</p>
                                <p className="text-xs text-slate-900 dark:text-slate-100 font-medium mt-2">Up to {plan.studentLimit} students</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : onboardingStep === 2 ? (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Step 2: Subscription Plan</h4>
                    <div className="space-y-6">
                      {DEFAULT_PLANS.map(plan => (
                        <label key={plan.id} className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${newSchool.planId === plan.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:bg-slate-50 dark:bg-slate-800'}`}>
                          <input
                            type="radio"
                            name="plan"
                            value={plan.id}
                            checked={newSchool.planId === plan.id}
                            onChange={(e) => setNewSchool({ ...newSchool, planId: e.target.value })}
                            className="mt-1.5"
                          />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{plan.name}</p>
                            <p className="text-sm text-slate-900 dark:text-slate-100 font-medium mt-1">₦{plan.price.toLocaleString()} / term</p>
                            <p className="text-xs text-slate-900 dark:text-slate-100 font-medium mt-2">Up to {plan.studentLimit} students</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Step 3: Initial Admin Setup</h4>
                    <p className="text-sm text-slate-900 dark:text-slate-100 font-medium mb-6">Create the first administrative user for {newSchool.name}. They will use this to log in.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 dark:text-slate-100 text-slate-900 dark:text-slate-100 ml-1">First Name</label>
                        <input
                          required
                          type="text"
                          value={adminDetails.firstName}
                          onChange={e => setAdminDetails({ ...adminDetails, firstName: e.target.value })}
                          className="w-full p-4 rounded-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 dark:text-slate-100 text-slate-900 dark:text-slate-100 ml-1">Last Name</label>
                        <input
                          required
                          type="text"
                          value={adminDetails.lastName}
                          onChange={e => setAdminDetails({ ...adminDetails, lastName: e.target.value })}
                          className="w-full p-4 rounded-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 dark:text-slate-100 text-slate-900 dark:text-slate-100 ml-1">Temporary Password</label>
                      <input
                        required
                        type="password"
                        value={adminDetails.password}
                        onChange={e => setAdminDetails({ ...adminDetails, password: e.target.value })}
                        className="w-full p-4 rounded-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
                        placeholder="At least 6 characters"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-4 pt-6">
                  {onboardingStep > 1 && !editingSchool ? (
                    <button
                      type="button"
                      onClick={() => setOnboardingStep(onboardingStep - 1)}
                      className="flex-1 p-4 rounded-xl border border-gray-200 font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:bg-slate-800 transition-all"
                    >
                      Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setShowAddSchool(false); setEditingSchool(null); setOnboardingStep(1); }}
                      className="flex-1 p-4 rounded-xl border border-gray-200 font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 p-4 rounded-xl bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-[0.98]"
                  >
                    {editingSchool ? 'Save Changes' : onboardingStep < 3 ? 'Next Step' : 'Complete Onboarding'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-4 md:p-4 rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Trash2 size={40} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 text-center mb-4">Delete School?</h3>
              <p className="text-slate-900 dark:text-slate-100 font-medium text-center mb-10 leading-relaxed">
                This action is <span className="text-red-600 font-medium">permanent</span>. All students, teachers, and data associated with this school will be removed from the system.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 p-4 rounded-xl border border-gray-200 font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSchool(showDeleteConfirm)}
                  className="flex-1 p-4 rounded-xl bg-red-600 text-white font-medium shadow-lg shadow-red-600/20 hover:bg-red-700 hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {success && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-10 right-10 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-2xl z-[110] flex items-center gap-3 border border-gray-800"
        >
          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle size={14} className="text-white" />
          </div>
          <span className="font-medium text-sm tracking-wide">{success}</span>
        </motion.div>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
