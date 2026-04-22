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
  X,
  Activity,
  History,
  Database,
  Globe,
  DollarSign,
  Menu
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
  const [activeTab, setActiveTab] = useState<'overview' | 'schools' | 'financials' | 'logs' | 'system'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'schools', label: 'Institutions', icon: SchoolIcon },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'logs', label: 'Audit Logs', icon: History },
    { id: 'system', label: 'System Health', icon: Activity },
  ] as const;

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="hidden md:flex flex-col border-r border-white/5 bg-[#0a0a0a] relative z-20"
      >
        <div className="p-6 mb-8 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Shield size={18} className="text-white" />
                </div>
                <span className="font-bold text-white tracking-tight uppercase text-sm">System Command</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <tab.icon size={20} className={cn(
                "shrink-0",
                activeTab === tab.id ? "text-white" : "group-hover:text-blue-400"
              )} />
              {isSidebarOpen && (
                <span className="font-medium text-sm">{tab.label}</span>
              )}
              {activeTab === tab.id && isSidebarOpen && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white" 
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl bg-white/5",
            !isSidebarOpen && "justify-center"
          )}>
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
              {user.firstName?.charAt(0) || 'A'}
            </div>
            {isSidebarOpen && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-tighter">Root Administrator</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#050505] relative custom-scrollbar">
        {/* Top Navbar for Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[#0a0a0a] border-b border-white/5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <span className="font-bold text-white text-xs uppercase tracking-tighter">System Command</span>
          </div>
          <button className="p-2 text-white">
            <Menu size={24} />
          </button>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Header */}
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">System Overview</h1>
                  <p className="text-slate-400 mt-1 font-medium">Global platform health and administrative intelligence.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Schools', value: schools.length, icon: SchoolIcon, trend: '+12%', color: 'blue' },
                    { label: 'Active Users', value: '42.5k', icon: Users, trend: '+5.2%', color: 'emerald' },
                    { label: 'System Uptime', value: '99.99%', icon: Activity, trend: 'Stable', color: 'blue' },
                    { label: 'Revenue (MTD)', value: '₦8.4M', icon: DollarSign, trend: '+18.3%', color: 'amber' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/[0.07] transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={cn(
                          "p-3 rounded-2xl group-hover:scale-110 transition-transform",
                          stat.color === 'blue' ? "bg-blue-600/20 text-blue-400" :
                          stat.color === 'emerald' ? "bg-emerald-600/20 text-emerald-400" :
                          "bg-amber-600/20 text-amber-400"
                        )}>
                          <stat.icon size={24} />
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full",
                          stat.trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                        )}>
                          {stat.trend}
                        </span>
                      </div>
                      <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stat.value}</p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Analytics Mock Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-8 relative z-10">
                      <div>
                        <h3 className="text-xl font-bold text-white">Enrollment Growth</h3>
                        <p className="text-slate-400 text-sm">Platform-wide student acquisition</p>
                      </div>
                      <select className="bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white px-3 py-2 outline-none">
                        <option>Last 6 Months</option>
                        <option>Last Year</option>
                      </select>
                    </div>
                    {/* Placeholder for SVG Chart */}
                    <div className="h-48 flex items-end justify-between gap-2 relative z-10">
                      {[40, 65, 45, 90, 75, 100].map((height, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                          className="flex-1 bg-gradient-to-t from-blue-600/20 to-blue-500 rounded-t-xl relative group/bar"
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">
                            {height}k
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 group">
                    <h3 className="text-xl font-bold text-white mb-8">System Activity</h3>
                    <div className="space-y-6">
                      {[
                        { action: 'New School Onboarded', time: '2 mins ago', detail: 'St. Andrews College', icon: Plus },
                        { action: 'Subscription Updated', time: '45 mins ago', detail: 'Lighthouse Academy moved to Pro', icon: CreditCard },
                        { action: 'Backup Successful', time: '2 hours ago', detail: 'Region: Lagos-West', icon: Database },
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 border border-white/5 group-hover:border-blue-500/30 transition-colors">
                            <item.icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{item.action}</p>
                            <p className="text-xs text-slate-500 font-medium">{item.detail} • {item.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full mt-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-blue-400 uppercase tracking-widest transition-all">
                      View Audit Log
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'schools' && (
              <motion.div
                key="schools"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Institutional Network</h2>
                    <p className="text-slate-400 mt-1 font-medium">Monitor and control individual school environments.</p>
                  </div>
                  <button
                    onClick={() => setShowAddSchool(true)}
                    className="w-full md:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl flex justify-center items-center gap-3 text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:translate-y-[-2px] transition-all active:translate-y-0"
                  >
                    <Plus size={20} /> Register Institution
                  </button>
                </div>

                {/* Existing Filter and Search UI wrapped in dark containers */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xl font-bold text-white">Active Management</h3>
                      {filterStatus !== 'all' && (
                        <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                          {filterStatus}
                          <button onClick={() => setFilterStatus('all')} className="hover:text-white"><X size={14} /></button>
                        </span>
                      )}
                    </div>
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="text"
                        placeholder="Filter by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#0a0a0a] border border-white/10 text-white placeholder-slate-600 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Table content from existing implementation, updated with dark theme classes */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#0a0a0a] text-[10px] uppercase text-slate-500 font-bold tracking-[0.2em] border-b border-white/5">
                        <tr>
                          <th className="pl-8 pr-4 py-5 font-bold">Institution</th>
                          <th className="px-4 py-5 font-bold">Infrastructure</th>
                          <th className="px-4 py-5 font-bold">Status</th>
                          <th className="px-4 py-5 text-right font-bold pr-8">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredSchools.map((school, i) => (
                          <motion.tr 
                            key={school.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="group hover:bg-white/[0.02] transition-all cursor-default"
                          >
                            <td className="px-4 py-6 pl-8">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-400 font-bold text-xl shadow-inner border border-white/5 group-hover:scale-110 transition-transform overflow-hidden">
                                  {school.logoUrl ? (
                                    <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover" />
                                  ) : (
                                    school.name?.charAt(0) || '?'
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors truncate">{school.name}</p>
                                  <p className="text-xs text-slate-500 font-medium truncate">{school.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-6">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-white capitalize flex items-center gap-2">
                                  <Globe size={12} className="text-blue-400" />
                                  {school.slug}.seedify.ng
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{school.planId} Tier</span>
                              </div>
                            </td>
                            <td className="px-4 py-6">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block",
                                school.status === 'active' 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              )}>
                                {school.status}
                              </span>
                            </td>
                            <td className="px-4 py-6 pr-8">
                              <div className="flex gap-2 justify-end items-center">
                                <button
                                  onClick={() => setSelectedSchoolId(school.id)}
                                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10"
                                >
                                  Console
                                </button>
                                <div className="relative group/actions">
                                  <button className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                    <MoreVertical size={18} />
                                  </button>
                                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-2 hidden group-hover/actions:block z-50">
                                    <button onClick={() => toggleSchoolStatus(school)} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/5 text-xs font-medium text-slate-300 flex items-center gap-2">
                                      <Shield size={14} /> {school.status === 'active' ? 'Suspend' : 'Activate'} Access
                                    </button>
                                    <button onClick={() => handleEditSchool(school)} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/5 text-xs font-medium text-slate-300 flex items-center gap-2">
                                      <Settings size={14} /> Update Config
                                    </button>
                                    <button onClick={() => setShowDeleteConfirm(school.id)} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-red-500/10 text-xs font-medium text-red-400 flex items-center gap-2">
                                      <Trash2 size={14} /> Terminate
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'financials' && (
              <motion.div
                key="financials"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Financial Intelligence</h2>
                  <p className="text-slate-400 mt-1 font-medium">Subscription revenue and market distribution.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-8">Monthly Recurring Revenue (MRR)</h3>
                    <div className="h-64 flex items-end gap-3">
                      {[30, 45, 35, 60, 80, 70, 95].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-4">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            className="w-full bg-gradient-to-t from-emerald-600/20 to-emerald-500 rounded-t-xl"
                          />
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Month {i+1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-8">Plan Distribution</h3>
                    <div className="space-y-6">
                      {[
                        { label: 'Free Tier', count: schools.filter(s => s.planId === 'free').length, color: 'bg-slate-500' },
                        { label: 'Starter', count: schools.filter(s => s.planId === 'starter').length, color: 'bg-blue-500' },
                        { label: 'Professional', count: schools.filter(s => s.planId === 'pro').length, color: 'bg-emerald-500' },
                        { label: 'Enterprise', count: schools.filter(s => s.planId === 'enterprise').length, color: 'bg-amber-500' },
                      ].map((plan, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                            <span>{plan.label}</span>
                            <span>{Math.round((plan.count / (schools.length || 1)) * 100)}%</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(plan.count / (schools.length || 1)) * 100}%` }}
                              className={cn("h-full", plan.color)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'system' && (
              <motion.div
                key="system"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">System Infrastructure</h2>
                  <p className="text-slate-400 mt-1 font-medium">Real-time server and database monitoring.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { label: 'Compute Engine', status: 'Operational', usage: '24%', icon: Activity },
                    { label: 'Cloud SQL Cluster', status: 'Operational', usage: '12%', icon: Database },
                    { label: 'Asset Storage', status: 'Healthy', usage: '8.4TB', icon: Globe },
                  ].map((sys, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <div className="p-3 bg-white/5 rounded-2xl text-blue-400">
                          <sys.icon size={20} />
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                          {sys.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">{sys.label}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Current Load: {sys.usage}</p>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-1/4 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Audit Trail</h2>
                  <p className="text-slate-400 mt-1 font-medium">Immutable record of all administrative activities.</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                    <h3 className="text-xl font-bold text-white">Security Events</h3>
                    <button className="text-xs font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">Export CSV</button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {[
                      { user: 'Admin (Root)', event: 'School Suspended', target: 'Green Valley Academy', time: '10 mins ago', status: 'warning' },
                      { user: 'System', event: 'Database Backup', target: 'Daily Automated', time: '1 hour ago', status: 'success' },
                      { user: 'Admin (Root)', event: 'New School Created', target: 'Lighthouse Primary', time: '3 hours ago', status: 'success' },
                      { user: 'System', event: 'Security Patch Applied', target: 'v2.4.1', time: '5 hours ago', status: 'info' },
                      { user: 'Admin (Root)', event: 'Plan Downgrade', target: 'St. Marys High', time: 'Yesterday', status: 'error' },
                    ].map((log, i) => (
                      <div key={i} className="p-4 px-8 flex items-center justify-between hover:bg-white/[0.01] transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-2 h-2 rounded-full shadow-[0_0_8px]",
                            log.status === 'warning' ? "bg-amber-500 shadow-amber-500/50" :
                            log.status === 'success' ? "bg-emerald-500 shadow-emerald-500/50" :
                            log.status === 'error' ? "bg-red-500 shadow-red-500/50" :
                            "bg-blue-500 shadow-blue-500/50"
                          )} />
                          <div>
                            <p className="text-sm font-bold text-white">{log.event}</p>
                            <p className="text-xs text-slate-500 font-medium">By {log.user} on {log.target}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

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
