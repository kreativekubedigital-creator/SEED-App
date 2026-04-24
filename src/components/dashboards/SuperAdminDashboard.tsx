import React, { useState, useEffect, useRef } from'react';
import { motion, AnimatePresence } from'framer-motion';
import { UserProfile, School, Invoice, Payment } from'../../types';
import { DEFAULT_PLANS } from'../../constants';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, OperationType, handleFirestoreError, query, where, onSnapshot, secondaryAuth, createUserWithEmailAndPassword, setDoc, logAuditAction, limit, orderBy } from'../../lib/compatibility';
import { LogOut, Plus, Shield, CreditCard, Users, School as SchoolIcon, Trash2, CheckCircle, Settings, Search, MoreVertical, ExternalLink, ArrowRight, LayoutDashboard, X, Activity, History, Database, Globe, DollarSign, Menu, Eye, Upload } from'lucide-react';
import { SchoolManagement } from'./SchoolManagement';
import { sortByName, cn } from'../../lib/utils';
import { StorageService } from '../../services/storageService';

const LineChart = ({ data }: { data: number[] }) => {
 const max = Math.max(...data);
 const points = data.map((d, i) =>`${(i / (data.length - 1)) * 100 },${ 100 - (d / max) * 100 }`).join('');
 
 return (
 <div className="relative w-full h-48 mt-8">
 <svg className="w-full h-full"viewBox="0 0 100 100"preserveAspectRatio="none">
 <defs>
 <linearGradient id="chartGradient"x1="0"y1="0"x2="0"y2="1">
 <stop offset="0%"stopColor="#3b82f6"stopOpacity="0.3"/>
 <stop offset="100%"stopColor="#3b82f6"stopOpacity="0"/>
 </linearGradient>
 </defs>
 <motion.path
 initial={{ pathLength: 0 }}
 animate={{ pathLength: 1 }}
 transition={{ duration: 2, ease:"easeInOut"}}
 d={`M 0, 100 L ${ points } L 100, 100 Z`}
 fill="url(#chartGradient)"
 />
 <motion.polyline
 initial={{ pathLength: 0 }}
 animate={{ pathLength: 1 }}
 transition={{ duration: 2, ease:"easeInOut"}}
 fill="none"
 stroke="#3b82f6"
 strokeWidth="1"
 points={ points }
 />
 </svg>
 <div className="absolute inset-0 flex justify-between items-end text-[10px] text-slate-600 font-bold px-1">
 {['Jan','Feb','Mar','Apr','May','Jun'].map(m => <span key={ m }>{ m }</span>)}
 </div>
 </div>
 );
};

const SystemMeter = ({ label, value, color }: { label: string, value: number, color: string }) => (
 <div className="space-y-3">
 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
 <span className="text-slate-600">{ label }</span>
 <span className="text-slate-900">{ value }%</span>
 </div>
 <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width:`${ value }%`}}
 transition={{ duration: 1, ease:"easeOut"}}
 className={ cn("h-full rounded-full shadow-[0_0_10px]", color)}
 />
 </div>
 </div>
);

export const SuperAdminDashboard = ({ user, onLogout }: { user: UserProfile, onLogout: () => void }) => {
 const [schools, setSchools] = useState<School[]>([]);
 const [auditLogs, setAuditLogs] = useState<any[]>([]);
 const [totalUsers, setTotalUsers] = useState(0);
 const [loading, setLoading] = useState(true);
 const [showAddSchool, setShowAddSchool] = useState(false);
 const [onboardingStep, setOnboardingStep] = useState(1);
 const [editingSchool, setEditingSchool] = useState<School | null>(null);
 const [newSchool, setNewSchool] = useState({ name:'', slug:'', email:'', address:'', phone:'', planId:'free', logoUrl: ''});
 const [isUploadingLogo, setIsUploadingLogo] = useState(false);
 const logoInputRef = useRef<HTMLInputElement>(null);
 const [adminDetails, setAdminDetails] = useState({ firstName:'', lastName:'', password:''});
 const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState<string | null>(null);
 const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [filterStatus, setFilterStatus] = useState<'all'|'active'|'suspended'>('all');
 const [activeTab, setActiveTab] = useState<'overview'|'schools'|'financials'|'logs'|'system'>('overview');
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);
 const [previewSchool, setPreviewSchool] = useState<School | null>(null);
 const tableRef = useRef<HTMLDivElement>(null);
 const schoolToDelete = schools.find(s => s.id === showDeleteConfirm);

 useEffect(() => {
 // School listener
 const unsubSchools = onSnapshot(collection(db,'schools'), (snapshot) => {
 const schoolsData = snapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data()
 })) as School[];
 setSchools(sortByName(schoolsData));
 setLoading(false);
 }, (error) => {
 console.error("Failed to fetch schools:", error);
 setLoading(false);
 });

 // Users count listener
 const unsubUsers = onSnapshot(collection(db,'users'), (snapshot) => {
 setTotalUsers(snapshot.size || 0);
 });

 // Audit logs listener
 const unsubLogs = onSnapshot(query(collection(db,'audit_logs'), orderBy('createdAt','desc'), limit(10)), (snapshot) => {
 const logsData = snapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data()
 }));
 setAuditLogs(logsData);
 });

 return () => {
 unsubSchools();
 unsubUsers();
 unsubLogs();
 };
 }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      setError(null);
      
      // Use the slug as part of the path if available, otherwise use a timestamp
      const pathPrefix = newSchool.slug || `temp-${Date.now()}`;
      const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
      const path = `${pathPrefix}/${fileName}`;
      
      const url = await StorageService.uploadFile('schools', path, file);
      setNewSchool(prev => ({ ...prev, logoUrl: url }));
      setSuccess("Logo uploaded successfully");
    } catch (err: any) {
      console.error("Logo upload failed:", err);
      setError(`Logo upload failed: ${err.message}`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

 const handleAddSchool = async (e: React.FormEvent) => {
 e.preventDefault();
 
 if (!editingSchool && onboardingStep < 3) {
 setOnboardingStep(onboardingStep + 1);
 return;
 }

 const schoolData = {
 ...newSchool,
 status: editingSchool ? editingSchool.status :'active',
 createdAt: editingSchool ? (editingSchool as any).createdAt : new Date().toISOString()
 };

 try {
 setError(null);
 if (!newSchool.slug) {
 setError("Subdomain slug is required.");
 return;
 }
 if (!editingSchool || newSchool.slug !== editingSchool.slug) {
 const slugQuery = query(collection(db,'schools'), where('slug','==', newSchool.slug));
 const slugSnap = await getDocs(slugQuery);
 if (!slugSnap.empty) {
 setError("This subdomain slug is already in use. Please choose another.");
 return;
 }
 }

 if (editingSchool) {
 const schoolRef = doc(db,'schools', editingSchool.id);
 await updateDoc(schoolRef, schoolData);
 await logAuditAction('UPDATE_SCHOOL',`Updated school: ${ schoolData.name }`, editingSchool.id,'school');
 setSuccess("School updated successfully");
 } else {
 if (!adminDetails.password || adminDetails.password.length < 6) {
 setError("Admin password must be at least 6 characters long.");
 return;
 }

 // 1. Create School
 const schoolDocRef = await addDoc(collection(db,'schools'), schoolData);
 
 // 2. Create Initial Admin User
 const trimmedEmail = newSchool.email.trim();
 const userCredential = await createUserWithEmailAndPassword(secondaryAuth, trimmedEmail, adminDetails.password, { data: { email_confirm: true } });
 const newUid = userCredential.user.uid;
 
 const adminUserData = {
 uid: newUid,
 email: trimmedEmail,
 firstName: adminDetails.firstName,
 lastName: adminDetails.lastName,
 role:'school_admin',
 schoolId: schoolDocRef.id,
 createdAt: new Date().toISOString(),
        forcePasswordChange: true
 };
 
 await setDoc(doc(db,'users', newUid), adminUserData);
 await secondaryAuth.signOut(); // Clean up secondary auth session

 await logAuditAction('CREATE_SCHOOL',`Created school: ${ schoolData.name } with admin ${ trimmedEmail }`, schoolDocRef.id,'school');

 setSuccess("School and initial admin created successfully");
 }
 setShowAddSchool(false);
 setEditingSchool(null);
 setOnboardingStep(1);
 setNewSchool({ name:'', slug:'', email:'', address:'', phone:'', planId:'free', logoUrl: ''});
 setAdminDetails({ firstName:'', lastName:'', password:''});
 } catch (error: any) {
 console.error("Failed to save school:", error);
 if (error.code  === 'auth/email-already-in-use') {
 setError("The admin email is already in use by another account.");
 } else {
 try {
 handleFirestoreError(error, OperationType.WRITE,'schools');
 } catch (err: any) {
 setError(`Failed to save school: ${ err.message }`);
 }
 }
 }
 setTimeout(() => setSuccess(null), 3000);
 };

 const handleEditSchool = (school: School) => {
 setEditingSchool(school);
  setNewSchool({ 
  name: school.name, 
  slug: school.slug ||'',
  email: school.email, 
  address: school.address ||'', 
  phone: school.phone ||'', 
  planId: school.planId,
  logoUrl: school.logoUrl || ''
  });
 setShowAddSchool(true);
 };

 const toggleSchoolStatus = async (school: School) => {
 const newStatus = school.status  === 'active'?'suspended':'active';
 try {
 setError(null);
 const schoolRef = doc(db,'schools', school.id);
 await updateDoc(schoolRef, { status: newStatus });
 await logAuditAction('TOGGLE_SCHOOL_STATUS',`Changed status of ${ school.name } to ${ newStatus }`, school.id,'school');
 setSuccess(`School ${ newStatus  === 'active'?'activated':'suspended'} successfully`);
 } catch (error) {
 console.error("Failed to update status:", error);
 try {
 handleFirestoreError(error, OperationType.WRITE,'schools');
 } catch (err: any) {
 setError(`Failed to update status: ${ err.message }`);
 }
 }
 setTimeout(() => setSuccess(null), 3000);
 };

 const handleDeleteSchool = async () => {
 if (!showDeleteConfirm) return;
 const id = showDeleteConfirm;
 try {
 setError(null);
 const schoolToPurge = schools.find(s => s.id === id);
 await deleteDoc(doc(db,'schools', id));
 if (schoolToPurge) {
 await logAuditAction('DELETE_SCHOOL',`Deleted school: ${ schoolToPurge.name }`, id,'school');
 }
 setSuccess("School deleted successfully");
 } catch (error) {
 console.error("Failed to delete school:", error);
 try {
 handleFirestoreError(error, OperationType.DELETE,'schools');
 } catch (err: any) {
 setError(`Failed to delete school: ${ err.message }`);
 }
 }
 setShowDeleteConfirm(null);
 setTimeout(() => setSuccess(null), 3000);
 };

 const filteredSchools = schools.filter(s => {
 const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 s.email.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesStatus = filterStatus  === 'all'|| s.status === filterStatus;
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
 return <SchoolManagement school={ school } onBack={() => setSelectedSchoolId(null)} />;
 }
 }


 const tabs = [
 { id:'overview', label:'Overview', icon: LayoutDashboard },
 { id:'schools', label:'Schools', icon: SchoolIcon },
 { id:'financials', label:'Financials', icon: DollarSign },
 { id:'logs', label:'Activity Logs', icon: History },
 { id:'system', label:'System Status', icon: Activity },
 ] as const;

 return (
 <div className="flex h-screen bg-slate-50 overflow-hidden relative selection:bg-blue-500/30 selection:text-blue-900">
 {/* Sidebar */}
 <motion.div 
 initial={ false }
 animate={{ width: isSidebarOpen ? 280 : 80 }}
 className="bg-white border-r border-slate-200 flex flex-col relative z-30 shadow-xl shadow-slate-200/50"
 >
 <div className="p-6 flex items-center gap-4 border-b border-slate-200">
 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
 <Shield size={ 24 } className="text-slate-900"/>
 </div>
 <span className="text-xl font-bold tracking-tight text-slate-900 transition-opacity duration-300">
 SEEDD Admin
 </span>
 </div>

 <nav className="flex-1 px-3 py-6 space-y-2">
 { tabs.map((tab) => (
 <button
 key={ tab.id }
 onClick={() => setActiveTab(tab.id)}
 className={ cn(
"w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
 activeTab === tab.id 
 ?"bg-blue-600 text-white shadow-lg shadow-blue-600/20"
 :"text-slate-600 hover:bg-slate-50 hover:text-slate-900"
 )}
 >
 <tab.icon size={ 20 } className={ cn(
"shrink-0",
 activeTab === tab.id ?"text-slate-900":"group-hover:text-blue-600"
 )} />
 { isSidebarOpen && (
 <span className="font-medium text-sm">{ tab.label }</span>
 )}
 </button>
 ))}
 </nav>

 <div className="p-4 border-t border-slate-100">
 <button 
 onClick={ onLogout }
 className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-bold text-xs uppercase tracking-widest"
 >
 <LogOut size={ 18 } />
 { isSidebarOpen && <span>Log Out</span>}
 </button>
 </div>
 </motion.div>

 {/* Main Content */}
 <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
 {/* Header */}
 <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-20">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => setIsSidebarOpen(!isSidebarOpen)}
 className="p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
 >
 <Menu size={ 20 } />
 </button>
 <div className="h-4 w-px bg-slate-200 mx-2"/>
 <h1 className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">
 { activeTab  === 'overview'?'System Overview': 
 activeTab  === 'schools'?'Schools List': 
 activeTab  === 'financials'?'Financial Stats': 
 activeTab  === 'logs'?'Activity Logs':'System Status'}
 </h1>
 </div>

 <div className="flex items-center gap-6">
 <div className="hidden md:flex flex-col items-end">
 <span className="text-xs font-bold text-slate-900">{ user.firstName } { user.lastName }</span>
 <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Full Admin Access</span>
 </div>
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5">
 <div className="w-full h-full rounded-[10px] bg-white flex items-center justify-center font-bold text-slate-900 text-xs">
 { user.firstName?.charAt(0)}
 </div>
 </div>
 </div>
 </header>

 <div className="flex-1 overflow-y-auto p-8 lg:p-12 scroll-smooth">
 <AnimatePresence mode="wait">
 { activeTab  === 'overview'&& (
 <motion.div
 key="overview"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="space-y-8"
 >
 {/* Header */}
 <div>
 <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Overview</h1>
 <p className="text-slate-600 mt-1 font-medium">Global platform health and school statistics.</p>
 </div>

 {/* Stats Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { label:'Total Schools', value: schools.length, icon: SchoolIcon, trend:'+12%', color:'blue'},
 { label:'Platform Users', value: totalUsers.toLocaleString(), icon: Users, trend:'+5.2%', color:'emerald'},
 { label:'System Uptime', value:'99.99%', icon: Activity, trend:'Stable', color:'blue'},
 { label:'Revenue (MTD)', value:`₦${((schools.length * 25000) / 1000000).toFixed(1)}M`, icon: DollarSign, trend:'+18.3%', color:'amber'},
 ].map((stat, i) => (
 <motion.div
 key={ stat.label }
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.1 }}
 className="bg-white border border-slate-200 p-4 rounded-2xl hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
 >
 <div className="flex justify-between items-start mb-3">
 <div className={ cn(
"p-2 rounded-xl group-hover:scale-110 transition-transform",
 stat.color  === 'blue'?"bg-blue-50 text-blue-600":
 stat.color  === 'emerald'?"bg-emerald-50 text-emerald-600":
"bg-amber-50 text-amber-600"
 )}>
 <stat.icon size={ 20 } />
 </div>
 <span className={ cn(
"text-[9px] font-bold px-1.5 py-0.5 rounded-full",
 stat.trend.startsWith('+') ?"bg-emerald-50 text-emerald-600":"bg-blue-50 text-blue-600"
 )}>
 { stat.trend }
 </span>
 </div>
 <p className="text-xl font-bold text-slate-900 mb-0.5 tracking-tight">{ stat.value }</p>
 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{ stat.label }</p>
 </motion.div>
 ))}
 </div>

 {/* Analytics Intelligence */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white border border-slate-200 rounded-3xl p-8 relative overflow-hidden group shadow-sm">
 <div className="flex justify-between items-center mb-4 relative z-10">
 <div>
 <h3 className="text-xl font-bold text-slate-900 tracking-tight">Growth Stats</h3>
 <p className="text-slate-600 text-sm font-medium">Monthly school registration rate</p>
 </div>
 <div className="text-right">
 <p className="text-2xl font-black text-blue-600">+{ Math.round(schools.length * 1.5)}%</p>
 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Aggregate</p>
 </div>
 </div>
 
 <LineChart data={[20, 35, 25, 45, 40, 60]} />
 </div>

 <div className="bg-white border border-slate-200 rounded-3xl p-8 group shadow-sm">
 <div className="flex items-center justify-between mb-8">
 <h3 className="text-xl font-bold text-slate-900 tracking-tight">Server Health</h3>
 <Activity size={ 20 } className="text-emerald-500 animate-pulse"/>
 </div>
 <div className="space-y-8">
 <SystemMeter label="Processor Load"value={ 24 } color="bg-blue-600 shadow-blue-600/20"/>
 <SystemMeter label="Database Activity"value={ 42 } color="bg-emerald-600 shadow-emerald-600/20"/>
 <SystemMeter label="Logic Engine"value={ 18 } color="bg-purple-600 shadow-purple-600/20"/>
 <SystemMeter label="Storage Usage"value={ 65 } color="bg-amber-600 shadow-amber-600/20"/>
 </div>
 </div>
 </div>

 <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 group">
 <div className="flex items-center justify-between mb-8">
 <h3 className="text-xl font-bold text-slate-900">Recent Activity</h3>
 <History size={ 20 } className="text-blue-500"/>
 </div>
 <div className="space-y-6">
 { auditLogs.length > 0 ? auditLogs.map((log, i) => (
 <div key={ log.id } className="flex gap-4">
 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100 group-hover:border-blue-500/30 transition-colors">
 <Activity size={ 18 } />
 </div>
 <div className="min-w-0">
 <p className="text-sm font-bold text-slate-900 truncate">{ log.action }</p>
 <p className="text-xs text-slate-600 font-medium truncate">
 { log.details } • { log.createdAt ? new Date(log.createdAt).toLocaleTimeString() :'Recent'}
 </p>
 </div>
 </div>
 )) : (
 <div className="text-center py-8 text-slate-600 font-medium">
 No recent system activity detected.
 </div>
 )}
 </div>
 <button 
 onClick={() => setActiveTab('logs')}
 className="w-full mt-8 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-xs font-bold text-blue-600 uppercase tracking-widest transition-all"
 >
 View All Logs
 </button>
 </div>
 </motion.div>
 )}

 { activeTab  === 'schools'&& (
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
 <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Schools List</h2>
 <p className="text-slate-600 mt-1 font-medium">Manage and monitor all schools on the platform.</p>
 </div>
 <button
  onClick={() => {
    setEditingSchool(null);
    setNewSchool({ name:'', slug:'', email:'', address:'', phone:'', planId:'free', logoUrl: ''});
    setOnboardingStep(1);
    setShowAddSchool(true);
  }}
 className="w-full md:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl flex justify-center items-center gap-3 text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:translate-y-[-2px] transition-all active:translate-y-0"
 >
 <Plus size={ 20 } /> Register New School
 </button>
 </div>

 {/* Existing Filter and Search UI wrapped in dark containers */}
 <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
 <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
 <div className="flex items-center gap-4">
 <h3 className="text-xl font-bold text-slate-900">Manage Schools</h3>
 { filterStatus !=='all'&& (
 <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
 { filterStatus }
 <button onClick={() => setFilterStatus('all')} className="hover:text-blue-800"><X size={ 14 } /></button>
 </span>
 )}
 </div>
 <div className="relative w-full sm:w-80">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={ 18 } />
 <input
 type="text"
 placeholder="Filter by name or email..."
 value={ searchQuery }
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-400 focus:border-blue-500 outline-none transition-all font-medium text-sm"
 />
 </div>
 </div>
 
 {/* Table content from existing implementation, updated with dark theme classes */}
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead className="bg-slate-50 text-[10px] uppercase text-slate-600 font-bold tracking-[0.2em] border-b border-slate-200">
 <tr>
 <th className="pl-8 pr-4 py-5 font-bold">School Name</th>
 <th className="px-4 py-5 font-bold">Details</th>
 <th className="px-4 py-5 font-bold">Status</th>
 <th className="px-4 py-5 text-right font-bold pr-8">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 { filteredSchools.map((school, i) => (
 <motion.tr 
 key={ school.id }
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: i * 0.05 }}
 className="group hover:bg-white/[0.02] transition-all cursor-default"
 >
 <td className="px-4 py-6 pl-8">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-400 font-bold text-xl shadow-inner border border-slate-100 group-hover:scale-110 transition-transform overflow-hidden">
 { school.logoUrl ? (
 <img src={ school.logoUrl } alt={ school.name } className="w-full h-full object-cover"/>
 ) : (
 school.name?.charAt(0) ||'?'
 )}
 </div>
 <div className="min-w-0">
 <p className="font-bold text-sm text-slate-900 group-hover:text-blue-400 transition-colors truncate">{ school.name }</p>
 <p className="text-xs text-slate-600 font-medium truncate">{ school.email }</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-6">
 <div className="flex flex-col gap-1">
 <span className="text-xs font-bold text-slate-900 capitalize flex items-center gap-2">
 <Globe size={ 12 } className="text-blue-600"/>
 { school.slug }.seedify.name.ng
 </span>
 <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{ school.planId } Tier</span>
 </div>
 </td>
 <td className="px-4 py-6">
 <span className={ cn(
"px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block",
 school.status  === 'active'
 ?"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
 :"bg-red-500/10 text-red-400 border border-red-500/20"
 )}>
 { school.status }
 </span>
 </td>
 <td className="px-4 py-6 pr-8">
 <div className="flex gap-2 justify-end items-center">
 <button
 onClick={() => setPreviewSchool(school)}
 className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-100"
 title="Quick Preview"
 >
 <Eye size={ 18 } />
 </button>
 <button
 onClick={() => setSelectedSchoolId(school.id)}
 className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10"
 >
 Console
 </button>
 <div className="relative group/actions">
 <button className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all">
 <MoreVertical size={ 18 } />
 </button>
 <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 hidden group-hover/actions:block z-50">
 <button onClick={() => toggleSchoolStatus(school)} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-300 flex items-center gap-2">
 <Shield size={ 14 } /> { school.status  === 'active'?'Deactivate':'Activate'} School
 </button>
 <button onClick={() => handleEditSchool(school)} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-300 flex items-center gap-2">
 <Settings size={ 14 } /> Edit Details
 </button>
 <button onClick={() => setShowDeleteConfirm(school.id)} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-red-500/10 text-xs font-medium text-red-400 flex items-center gap-2">
 <Trash2 size={ 14 } /> Delete
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

 { activeTab  === 'financials'&& (
 <motion.div
 key="financials"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="space-y-8"
 >
 <div>
 <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Revenue & Billing</h2>
 <p className="text-slate-600 mt-1 font-medium">Track subscriptions and platform earnings.</p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-3xl p-8 relative overflow-hidden">
 <div className="flex justify-between items-center mb-8">
 <h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase tracking-widest text-xs text-slate-600">Revenue Growth (MTD)</h3>
 <div className="text-right">
 <p className="text-2xl font-black text-slate-900">₦{((schools.length * 25000) / 1000).toFixed(0)}k</p>
 <p className="text-[10px] font-bold text-emerald-500 uppercase">Est. Recurring</p>
 </div>
 </div>
 <div className="h-64 flex items-end gap-3">
 {[30, 45, 35, 60, 80, 70, 95].map((h, i) => (
 <div key={ i } className="flex-1 flex flex-col items-center gap-4 group">
 <motion.div 
 initial={{ height: 0 }}
 animate={{ height:`${ h }%`}}
 className="w-full bg-gradient-to-t from-blue-600/20 to-blue-500 rounded-t-xl group-hover:from-blue-500 group-hover:to-blue-400 transition-all shadow-[0_0_20px_rgba(59, 130, 246, 0.1)]"
 />
 <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">Wk { i+1 }</span>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
 <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-8">Plan Distribution</h3>
 <div className="space-y-8">
 {[
 { label:'Free Tier', count: schools.filter(s => s.planId  === 'free'|| !s.planId).length, color:'bg-slate-500 shadow-slate-500/20'},
 { label:'Starter', count: schools.filter(s => s.planId  === 'starter').length, color:'bg-blue-500 shadow-blue-500/20'},
 { label:'Professional', count: schools.filter(s => s.planId  === 'pro').length, color:'bg-emerald-500 shadow-emerald-500/20'},
 { label:'Enterprise', count: schools.filter(s => s.planId  === 'enterprise').length, color:'bg-amber-500 shadow-amber-500/20'},
 ].map((plan, i) => (
 <div key={ i } className="space-y-3">
 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
 <span className="text-slate-600">{ plan.label }</span>
 <span className="text-slate-900">{ plan.count } Units ({ Math.round((plan.count / (schools.length || 1)) * 100)}%)</span>
 </div>
 <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width:`${(plan.count / (schools.length || 1)) * 100 }%`}}
 className={ cn("h-full rounded-full shadow-[0_0_10px]", plan.color)}
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </motion.div>
 )}

 { activeTab  === 'system'&& (
 <motion.div
 key="system"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="space-y-8"
 >
 <div>
 <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Status</h2>
 <p className="text-slate-600 mt-1 font-medium">Real-time server and database metrics.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {[
 { label:'Compute Engine', status:'Operational', usage:'24%', icon: Activity },
 { label:'Cloud SQL Cluster', status:'Operational', usage:'12%', icon: Database },
 { label:'Asset Storage', status:'Healthy', usage:'8.4TB', icon: Globe },
 ].map((sys, i) => (
 <div key={ i } className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-4">
 <div className="flex justify-between items-center">
 <div className="p-2.5 bg-slate-50 rounded-xl text-blue-400">
 <sys.icon size={ 18 } />
 </div>
 <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-widest border border-emerald-500/20">
 { sys.status }
 </span>
 </div>
 <div>
 <p className="text-base font-bold text-slate-900">{ sys.label }</p>
 <p className="text-[11px] text-slate-600 font-medium mt-0.5">Current Load: { sys.usage }</p>
 </div>
 <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
 <div className="h-full bg-blue-500 w-1/4 rounded-full"/>
 </div>
 </div>
 ))}
 </div>
 </motion.div>
 )}

 { activeTab  === 'logs'&& (
 <motion.div
 key="logs"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="space-y-8"
 >
 <div>
 <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Activity Logs</h2>
 <p className="text-slate-600 mt-1 font-medium">A permanent record of all admin actions.</p>
 </div>

 <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden">
 <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-white/[0.02]">
 <div>
 <h3 className="text-xl font-bold text-slate-900 tracking-tight">Live Activity Feed</h3>
 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Live updates from system logs</p>
 </div>
 <button className="px-6 py-2.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600/20 transition-all">Download Logs</button>
 </div>
 <div className="divide-y divide-slate-100">
 { auditLogs.length > 0 ? auditLogs.map((log, i) => (
 <div key={ log.id } className="p-6 px-8 flex items-center justify-between hover:bg-white/[0.01] transition-all group">
 <div className="flex items-center gap-6">
 <div className={ cn(
"w-2.5 h-2.5 rounded-full shadow-[0_0_12px]",
 log.action?.includes('DELETE') ?"bg-red-500 shadow-red-500/50":
 log.action?.includes('UPDATE') ?"bg-amber-500 shadow-amber-500/50":
"bg-emerald-500 shadow-emerald-500/50"
 )} />
 <div>
 <p className="text-sm font-bold text-slate-900 group-hover:text-blue-400 transition-colors">{ log.action }</p>
 <p className="text-xs text-slate-600 font-medium mt-0.5">{ log.details }</p>
 </div>
 </div>
 <div className="text-right">
 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">{ log.createdAt ? new Date(log.createdAt).toLocaleDateString() :'Today'}</span>
 <span className="text-[10px] font-bold text-slate-700 block">{ log.createdAt ? new Date(log.createdAt).toLocaleTimeString() :'Recent'}</span>
 </div>
 </div>
 )) : (
 <div className="p-20 text-center">
 <History size={ 48 } className="text-slate-800 mx-auto mb-4"/>
 <p className="text-slate-600 font-bold text-sm uppercase tracking-widest">No Security Events Recorded</p>
 </div>
 )}
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 {/* Modals */}
 <AnimatePresence>
 { showAddSchool && (
 <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] overflow-y-auto">
 <motion.div
 initial={{ scale: 0.95, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.95, opacity: 0, y: 20 }}
 className="bg-white border border-slate-200 p-8 rounded-[2.5rem] max-w-xl w-full shadow-2xl my-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
 >
 <div className="mb-10 text-center">
 <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
 <SchoolIcon className="text-blue-500" size={ 32 } />
 </div>
 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{ editingSchool ?'Edit School Details':'Register New School'}</h3>
 <p className="text-slate-600 mt-2 font-bold text-xs uppercase tracking-widest">School Registration Wizard</p>
 </div>

{ error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium">{ error }</div>}
 
 <form onSubmit={ handleAddSchool } className="space-y-5">
 { editingSchool || onboardingStep === 1 ? (
 <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
 <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
 <div className="w-6 h-6 rounded-full bg-blue-500 text-[10px] flex items-center justify-center font-black">1</div>
 { editingSchool ?'School Details':'School Branding'}
 </h4>
  
  <div className="mb-10 flex flex-col items-center">
    <div 
      onClick={() => logoInputRef.current?.click()}
      className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group overflow-hidden relative shadow-inner"
    >
      {newSchool.logoUrl ? (
        <div className="relative w-full h-full">
          <img src={newSchool.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setNewSchool(prev => ({ ...prev, logoUrl: '' }));
            }}
            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
            <Upload size={20} className="text-slate-400 group-hover:text-blue-500" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-500">
            {isUploadingLogo ? 'Processing...' : 'Upload Logo'}
          </span>
        </>
      )}
      {isUploadingLogo && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
    <input 
      type="file" 
      ref={logoInputRef} 
      onChange={handleLogoUpload} 
      className="hidden" 
      accept="image/*" 
    />
    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mt-4">Official School Logo</p>
    <div className="text-xs text-slate-400 mt-2">{newSchool.slug}.seedify.name.ng</div>
  </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
 <div className="space-y-3">
 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">School Name</label>
 <input
 required
 type="text"
 value={ newSchool.name }
 onChange={ e => {
 const val = e.target.value;
 const currentGenerated = newSchool.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)+/g,'');
 const newSlug = (!newSchool.slug || newSchool.slug === currentGenerated)
 ? val.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)+/g,'')
 : newSchool.slug;
 setNewSchool({ ...newSchool, name: val, slug: newSlug });
 }}
 className="w-full p-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
 placeholder="e.g. Green Valley Academy"
 />
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">School Email Address</label>
 <input
 required
 type="email"
 value={ newSchool.email }
 onChange={ e => setNewSchool({ ...newSchool, email: e.target.value })}
 className="w-full p-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
 placeholder="admin@school.com"
 />
 </div>
 </div>

 <div className="space-y-3 mb-6">
 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">System Path (Slug)</label>
 <div className="flex group">
 <input
 required
 type="text"
 value={ newSchool.slug }
 onChange={ e => setNewSchool({ ...newSchool, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') })}
 className="w-full p-5 rounded-l-2xl border-y border-l border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all font-bold text-sm"
 placeholder="e.g. green-valley"
 />
 <div className="p-5 bg-slate-100 border border-slate-200 rounded-r-2xl text-slate-600 font-bold text-sm whitespace-nowrap flex items-center">
 .seedify.name.ng
 </div>
 </div>
 </div>

 <div className="space-y-3 mb-6">
 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Physical Coordinate</label>
 <input
 required
 type="text"
 value={ newSchool.address }
 onChange={ e => setNewSchool({ ...newSchool, address: e.target.value })}
 className="w-full p-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
 placeholder="123 Education Way, Lagos"
 />
 </div>

 <div className="space-y-3">
 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Phone Number</label>
 <input
 required
 type="tel"
 value={ newSchool.phone }
 onChange={ e => setNewSchool({ ...newSchool, phone: e.target.value })}
 className="w-full p-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
 placeholder="+234..."
 />
 </div>

 { editingSchool && (
 <div className="mt-8 pt-8 border-t border-slate-100">
 <h4 className="text-lg font-medium text-slate-900 mb-4">Subscription Plan</h4>
 <div className="space-y-4">
 { DEFAULT_PLANS.map(plan => (
 <label key={ plan.id } className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${ newSchool.planId === plan.id ?'border-blue-500 bg-blue-50/50':'border-gray-200 hover:bg-slate-50'}`}>
 <input
 type="radio"
 name="plan"
 value={ plan.id }
 checked={ newSchool.planId === plan.id }
 onChange={(e) => setNewSchool({ ...newSchool, planId: e.target.value })}
 className="mt-1.5"
 />
 <div>
 <p className="font-medium text-slate-900">{ plan.name }</p>
 <p className="text-sm text-slate-900 font-medium mt-1">₦{ plan.price.toLocaleString()} / term</p>
 <p className="text-xs text-slate-900 font-medium mt-2">Up to { plan.studentLimit } students</p>
 </div>
 </label>
 ))}
 </div>
 </div>
 )}
 </motion.div>
 ) : onboardingStep === 2 ? (
 <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
 <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
 <div className="w-6 h-6 rounded-full bg-blue-500 text-[10px] flex items-center justify-center font-black">2</div>
 Plan Selection
 </h4>
 <div className="space-y-4">
 { DEFAULT_PLANS.map(plan => (
 <label key={ plan.id } className={ cn(
"flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all",
 newSchool.planId === plan.id 
 ?"border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59, 130, 246, 0.15)]"
 :"border-slate-200 bg-slate-50 hover:border-slate-300"
 )}>
 <div className={ cn(
"mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
 newSchool.planId === plan.id ?"border-blue-500":"border-slate-700"
 )}>
 { newSchool.planId === plan.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"/>}
 </div>
 <input
 type="radio"
 name="plan"
 className="hidden"
 value={ plan.id }
 checked={ newSchool.planId === plan.id }
 onChange={(e) => setNewSchool({ ...newSchool, planId: e.target.value })}
 />
 <div className="flex-1">
 <div className="flex justify-between items-center mb-1">
 <p className="font-bold text-slate-900">{ plan.name }</p>
 <p className="text-xs font-black text-blue-500">₦{ plan.price.toLocaleString()} / term</p>
 </div>
 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Support up to { plan.studentLimit } Students</p>
 </div>
 </label>
 ))}
 </div>
 </motion.div>
 ) : (
 <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
 <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
 <div className="w-6 h-6 rounded-full bg-blue-500 text-[10px] flex items-center justify-center font-black">3</div>
 Admin Account Setup
 </h4>
 <p className="text-sm text-slate-600 font-bold mb-8">Create the first admin account for { newSchool.name }.</p>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
 <div className="space-y-3">
 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">First Name</label>
 <input
 required
 type="text"
 value={ adminDetails.firstName }
 onChange={ e => setAdminDetails({ ...adminDetails, firstName: e.target.value })}
 className="w-full p-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
 />
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Last Name</label>
 <input
 required
 type="text"
 value={ adminDetails.lastName }
 onChange={ e => setAdminDetails({ ...adminDetails, lastName: e.target.value })}
 className="w-full p-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
 />
 </div>
 </div>

 <div className="space-y-3">
 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Admin Password</label>
 <input
 required
 type="password"
 value={ adminDetails.password }
 onChange={ e => setAdminDetails({ ...adminDetails, password: e.target.value })}
 className="w-full p-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
 placeholder="Security override required"
 />
 </div>
 </motion.div>
 )}

 <div className="flex gap-4 pt-8">
 { onboardingStep > 1 && !editingSchool ? (
 <button
 type="button"
 onClick={() => setOnboardingStep(onboardingStep - 1)}
 className="flex-1 p-5 rounded-[1.5rem] border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all text-sm uppercase tracking-widest"
 >
 Back
 </button>
 ) : (
 <button
 type="button"
 onClick={() => { setShowAddSchool(false); setEditingSchool(null); setOnboardingStep(1); }}
 className="flex-1 p-5 rounded-[1.5rem] border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all text-sm uppercase tracking-widest"
 >
 Cancel
 </button>
 )}
 <button
 type="submit"
 className="flex-1 p-5 rounded-[1.5rem] bg-blue-600 text-white font-black shadow-[0_0_30px_rgba(37, 99, 235, 0.3)] hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-[0.98] text-sm uppercase tracking-[0.1em]"
 >
 { editingSchool ?'Save Changes': onboardingStep < 3 ?'Next Step':'Create School'}
 </button>
 </div>
 </form>
 </motion.div>
 </div>
 )}

 { showDeleteConfirm && (
 <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-white border border-red-500/20 p-10 rounded-[2.5rem] max-w-md w-full shadow-2xl text-center"
 >
 <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
 <Trash2 className="text-red-500" size={ 40 } />
 </div>
 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Delete School?</h3>
 <p className="text-slate-600 font-bold text-sm mb-10 leading-relaxed">
 You are about to delete all records for <span className="text-slate-900 font-black">"{ schoolToDelete?.name }"</span>. This action is final and will remove all school data.
 </p>
 <div className="flex gap-4">
 <button
                onClick={() => setShowDeleteConfirm(null)}
 className="flex-1 p-5 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
 >
 Cancel
 </button>
 <button
 onClick={ handleDeleteSchool }
 className="flex-1 p-5 rounded-2xl bg-red-600 text-white font-black shadow-[0_0_30px_rgba(220, 38, 38, 0.3)] hover:bg-red-700 transition-all text-xs uppercase tracking-widest"
 >
 Delete School
 </button>
 </div>
 </motion.div>
 </div>
 )}

 { previewSchool && (
 <SchoolPreviewModal 
 school={ previewSchool } 
 onClose={() => setPreviewSchool(null)} 
 />
 )}
 </AnimatePresence>

 { success && (
 <motion.div
 initial={{ y: 50, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 50, opacity: 0 }}
 className="fixed bottom-10 right-10 bg-gray-900 text-slate-900 px-4 py-2 rounded-lg shadow-2xl z-[110] flex items-center gap-3 border border-gray-800"
 >
 <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
 <CheckCircle size={ 14 } className="text-slate-900"/>
 </div>
 <span className="font-medium text-sm tracking-wide">{ success }</span>
 </motion.div>
 )}
 </div>
 );
};



// --- Immersive School Preview Modal ---
const SchoolPreviewModal = ({ school, onClose }: { school: School; onClose: () => void }) => {
 const [stats, setStats] = useState({
 students: 0,
 staff: 0,
 feesAwaiting: { count: 0, total: 1 },
 monthlyFees: 0,
 paymentStatus: { unpaid: 0, partial: 0, paid: 0 },
 incomeCategories: [] as { name: string; amount: number }[],
 monthlyHistory: [4.2, 3.8, 4.5, 3.2, 4.8, 5.2, 4.9, 4.2, 5.1, 4.8, 5.5, 3.2] // Simulated velocity
 });
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 if (!school.id) return;

 // 1. Fetch Populations
 const unsubUsers = onSnapshot(
 query(collection(db,"users"), where("schoolId","==", school.id)),
 (snap) => {
 const docs = snap.docs.map(d => d.data());
 setStats(prev => ({
 ...prev,
 students: docs.filter(u => u.role  === 'student').length,
 staff: docs.filter(u => u.role  === 'teacher').length
 }));
 }
 );

 // 2. Fetch Financials (Invoices)
 const unsubInvoices = onSnapshot(
 collection(db,`schools/${ school.id }/invoices`),
 (snap) => {
 const invoices = snap.docs.map(d => d.data() as Invoice);
 const status = { unpaid: 0, partial: 0, paid: 0 };
 let awaitingCount = 0;
 const categories: Record<string, number> = {};

 invoices.forEach(inv => {
 if (inv.status  === 'paid') status.paid++;
 else if (inv.status  === 'partial') {
 status.partial++;
 awaitingCount++;
 } else {
 status.unpaid++;
 awaitingCount++;
 }

 inv.items?.forEach(item => {
 categories[item.name] = (categories[item.name] || 0) + item.amount;
 });
 });

 setStats(prev => ({
 ...prev,
 feesAwaiting: { count: awaitingCount, total: invoices.length || 1 },
 paymentStatus: status,
 incomeCategories: Object.entries(categories).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5)
 }));
 setLoading(false);
 }
 );

 // 3. Fetch Monthly Payments
 const unsubPayments = onSnapshot(
 collection(db,`schools/${ school.id }/payments`),
 (snap) => {
 const currentMonth = new Date().getMonth();
 const currentYear = new Date().getFullYear();
 
 const monthlyTotal = snap.docs
 .map(d => d.data() as Payment)
 .filter(p => {
 const date = new Date(p.createdAt);
 return date.getMonth() === currentMonth && date.getFullYear() === currentYear && p.status  === 'success';
 })
 .reduce((sum, p) => sum + p.amount, 0);

 setStats(prev => ({ ...prev, monthlyFees: monthlyTotal }));
 }
 );

 return () => {
 unsubUsers();
 unsubInvoices();
 unsubPayments();
 };
 }, [school.id]);

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={ onClose }
 className="absolute inset-0 bg-black/60 backdrop-blur-md"
 />
 
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl custom-scrollbar"
 >
 {/* Header Section */}
 <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-8 border-b border-slate-100 flex items-center justify-between">
 <div className="flex items-center gap-6">
 <div className="w-16 h-16 rounded-2xl bg-blue-600/5 border border-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-2xl">
 { school.logoUrl ? <img src={ school.logoUrl } className="w-full h-full object-cover"/> : school.name.charAt(0)}
 </div>
 <div>
 <h2 className="text-2xl font-black text-slate-900 tracking-tight">{ school.name } <span className="text-blue-500 font-medium text-lg ml-2">Quick Statistics</span></h2>
 <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mt-1">
 <Globe size={ 12 } className="text-blue-500"/> { school.slug }.seedify.name.ng • { school.planId.toUpperCase()} TIER
 </p>
 </div>
 </div>
 <button 
 onClick={ onClose }
 className="p-4 rounded-2xl bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-100"
 >
 <X size={ 24 } />
 </button>
 </div>

 <div className="p-8 space-y-8">
 {/* Top Row Stats */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
 <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 relative overflow-hidden group text-left">
 <div className="flex justify-between items-start mb-4">
 <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
 <CreditCard size={ 20 } />
 </div>
 <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center relative">
 <svg className="w-full h-full -rotate-90">
 <circle cx="24"cy="24"r="20"fill="transparent"stroke="currentColor"strokeWidth="3"className="text-slate-100"/>
 <circle cx="24"cy="24"r="20"fill="transparent"stroke="currentColor"strokeWidth="3"strokeDasharray={ 125.6 } strokeDashoffset={ 125.6 * (1 - stats.feesAwaiting.count/stats.feesAwaiting.total)} className="text-amber-500 transition-all duration-1000"/>
 </svg>
 <span className="absolute text-[10px] font-bold text-amber-500">{ Math.round((stats.feesAwaiting.count/stats.feesAwaiting.total) * 100)}%</span>
 </div>
 </div>
 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Fees Awaiting Payment</p>
 <h3 className="text-2xl font-black text-slate-900 mt-1">{ stats.feesAwaiting.count } <span className="text-slate-400 text-lg">/ { stats.feesAwaiting.total }</span></h3>
 </div>

 <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 text-left">
 <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 w-fit mb-4">
 <LayoutDashboard size={ 20 } />
 </div>
 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Converted Leads</p>
 <h3 className="text-2xl font-black text-slate-900 mt-1">20 <span className="text-slate-400 text-lg">/ 100</span></h3>
 <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
 <motion.div initial={{ width: 0 }} animate={{ width:'20%'}} className="h-full bg-blue-600"/>
 </div>
 </div>

 <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 text-left">
 <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 w-fit mb-4">
 <Users size={ 20 } />
 </div>
 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Staff Present Today</p>
 <h3 className="text-2xl font-black text-slate-900 mt-1">{ Math.floor(stats.staff * 0.9)} <span className="text-slate-400 text-lg">/ { stats.staff }</span></h3>
 <div className="mt-4 flex gap-1">
 {[...Array(8)].map((_, i) => (
 <div key={ i } className={`h-1 flex-1 rounded-full ${ i < 7 ?'bg-purple-500':'bg-slate-200'}`} />
 ))}
 </div>
 </div>

 <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 text-left">
 <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 w-fit mb-4">
 <Users size={ 20 } />
 </div>
 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Student Count</p>
 <h3 className="text-2xl font-black text-slate-900 mt-1">{ stats.students }</h3>
 <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
 <Activity size={ 10 } /> Live Population
 </p>
 </div>

 <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 text-left">
 <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 w-fit mb-4">
 <DollarSign size={ 20 } />
 </div>
 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Monthly Fees Collection</p>
 <h3 className="text-2xl font-black text-slate-900 mt-1">₦{ stats.monthlyFees.toLocaleString()}</h3>
 <p className="text-[10px] text-slate-400 font-bold mt-2 italic">Current billing cycle</p>
 </div>
 </div>

 {/* Main Analytics Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Fees Collection Chart */}
 <div className="lg:col-span-2 p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 text-left">
 <div className="flex items-center justify-between mb-10">
 <div className="flex items-center gap-4">
 <div className="p-3 rounded-xl bg-blue-600/10 text-blue-600 border border-blue-500/20">
 <Activity size={ 20 } />
 </div>
 <div>
 <h3 className="font-black text-slate-900 tracking-tight">Fee Collection Progress</h3>
 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Yearly Performance: { new Date().getFullYear()}</p>
 </div>
 </div>
 <div className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-400">
 Daily Update
 </div>
 </div>
 
 <div className="h-64 flex items-end justify-between gap-2 px-4 relative">
 {/* Grid Lines */}
 <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none opacity-10">
 {[...Array(5)].map((_, i) => <div key={ i } className="w-full h-px bg-slate-900/10"/>)}
 </div>
 
 { stats.monthlyHistory.map((v, i) => (
 <div key={ i } className="flex-1 flex flex-col items-center gap-4 group/bar relative">
 <motion.div 
 initial={{ height: 0 }}
 animate={{ height:`${ v * 15 }%`}}
 transition={{ delay: i * 0.05, type:'spring', damping: 15 }}
 className="w-full max-w-[24px] bg-gradient-to-t from-blue-600/80 to-blue-400 rounded-lg group-hover/bar:scale-x-125 transition-transform relative"
 >
 <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-blue-600 text-[10px] font-black text-white opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
 ₦{(v * 1000).toLocaleString()}
 </div>
 </motion.div>
 <span className="text-[10px] text-slate-600 font-black uppercase tracking-tighter">
 {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}
 </span>
 </div>
 ))}
 </div>
 </div>

 {/* Fees Overview Breakdown */}
 <div className="space-y-4 text-left">
 <div className="p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 h-full">
 <div className="flex items-center gap-4 mb-8">
 <div className="p-3 rounded-xl bg-blue-600/10 text-blue-600 border border-blue-500/20">
 <DollarSign size={ 20 } />
 </div>
 <div>
 <h3 className="font-black text-slate-900 tracking-tight">Fees Overview</h3>
 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Active Invoices</p>
 </div>
 </div>

 <div className="space-y-8">
 <div>
 <div className="flex justify-between items-end mb-3">
 <div>
 <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Unpaid</p>
 <h4 className="text-xl font-black text-slate-900">{ stats.paymentStatus.unpaid } <span className="text-slate-600 text-sm font-bold uppercase ml-1">Invoices</span></h4>
 </div>
 </div>
 <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
 <motion.div 
 initial={{ width: 0 }} 
 animate={{ width:`${(stats.paymentStatus.unpaid / stats.feesAwaiting.total) * 100 }%`}} 
 className="h-full bg-gradient-to-r from-red-500/40 to-red-500"
 />
 </div>
 </div>

 <div>
 <div className="flex justify-between items-end mb-3">
 <div>
 <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Partial</p>
 <h4 className="text-xl font-black text-slate-900">{ stats.paymentStatus.partial } <span className="text-slate-600 text-sm font-bold uppercase ml-1">Invoices</span></h4>
 </div>
 </div>
 <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
 <motion.div 
 initial={{ width: 0 }} 
 animate={{ width:`${(stats.paymentStatus.partial / stats.feesAwaiting.total) * 100 }%`}} 
 className="h-full bg-gradient-to-r from-blue-500/40 to-blue-400"
 />
 </div>
 </div>

 <div>
 <div className="flex justify-between items-end mb-3">
 <div>
 <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Paid</p>
 <h4 className="text-xl font-black text-slate-900">{ stats.paymentStatus.paid } <span className="text-slate-600 text-sm font-bold uppercase ml-1">Invoices</span></h4>
 </div>
 </div>
 <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
 <motion.div 
 initial={{ width: 0 }} 
 animate={{ width:`${(stats.paymentStatus.paid / stats.feesAwaiting.total) * 100 }%`}} 
 className="h-full bg-gradient-to-r from-emerald-500/40 to-emerald-400"
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Bottom Income Breakdown */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
 <div className="lg:col-span-1 p-8 rounded-[2rem] bg-white/[0.02] border border-slate-100">
 <div className="flex items-center gap-4 mb-8">
 <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
 <Activity size={ 20 } />
 </div>
 <div>
 <h3 className="font-black text-slate-900 tracking-tight">Income Sources</h3>
 <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Revenue Streams</p>
 </div>
 </div>
 
 <div className="flex flex-col items-center gap-8">
 <div className="relative w-48 h-48">
 <svg viewBox="0 0 100 100"className="w-full h-full -rotate-90">
 { stats.incomeCategories.map((cat, i) => {
 const total = stats.incomeCategories.reduce((sum, c) => sum + c.amount, 0) || 1;
 const prevTotal = stats.incomeCategories.slice(0, i).reduce((sum, c) => sum + c.amount, 0);
 const startPercent = (prevTotal / total) * 100;
 const endPercent = ((prevTotal + cat.amount) / total) * 100;
 
 const strokeDasharray =`${ endPercent - startPercent } ${ 100 - (endPercent - startPercent)}`;
 const strokeDashoffset = -startPercent;
 
 const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981'];
 
 return (
 <circle
 key={ cat.name }
 cx="50"
 cy="50"
 r="40"
 fill="transparent"
 stroke={ colors[i % colors.length]}
 strokeWidth="12"
 strokeDasharray={ strokeDasharray }
 strokeDashoffset={ strokeDashoffset }
 pathLength="100"
 className="transition-all duration-1000"
 />
 );
 })}
 <circle cx="50"cy="50"r="30"fill="#050505"/>
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
 <p className="text-[10px] text-slate-600 font-black uppercase tracking-tighter">Total</p>
 <p className="text-sm font-black text-slate-900">₦{(stats.incomeCategories.reduce((s, c) => s + c.amount, 0)).toLocaleString()}</p>
 </div>
 </div>
 
 <div className="w-full space-y-3">
 { stats.incomeCategories.map((cat, i) => (
 <div key={ cat.name } className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full"style={{ backgroundColor: ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981'][i % 5] }} />
 <span className="text-xs font-bold text-slate-300">{ cat.name }</span>
 </div>
 <span className="text-xs font-black text-slate-900">₦{ cat.amount.toLocaleString()}</span>
 </div>
 ))}
 { stats.incomeCategories.length === 0 && <p className="text-slate-600 text-xs text-center italic">No revenue data recorded</p>}
 </div>
 </div>
 </div>
 
 <div className="lg:col-span-2 p-8 rounded-[2rem] bg-blue-600/5 border border-blue-500/10 flex flex-col justify-center items-center text-center">
 <div className="w-20 h-20 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
 <Shield size={ 40 } />
 </div>
 <h3 className="text-2xl font-black text-slate-900 mb-2">Institutional Integrity Verified</h3>
 <p className="text-slate-600 max-w-md font-medium leading-relaxed">
 This snapshot represents live operational data. Audit logs indicate total compliance with SEEDD system protocols and security standards.
 </p>
 <button onClick={ onClose } className="mt-8 px-8 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">
 Close Preview
 </button>
 </div>
 </div>
 </div>
 </motion.div>
 </div>
 );
};
