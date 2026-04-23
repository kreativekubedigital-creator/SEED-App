import React, { useState, useEffect, useMemo, useRef } from'react';
import { School, UserProfile, UserRole, Class, Subject } from'../../types';
import Papa from'papaparse';
import { 
 ArrowLeft, 
 Users, 
 GraduationCap, 
 ShieldCheck, 
 BookOpen, 
 Plus, 
 Search, 
 Edit2, 
 Trash2, 
 Mail, 
 Phone, 
 MapPin,
 LayoutDashboard,
 MoreVertical,
 CheckCircle,
 X,
 UserPlus,
 Upload,
 Eye,
 EyeOff,
 Key,
 AlertTriangle,
 Bell,
 Settings,
 ChevronDown,
 ChevronRight,
 Award,
 ChevronUp,
 School as SchoolIcon,
 Menu
} from'lucide-react';
import { motion, AnimatePresence } from'motion/react';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, onSnapshot, OperationType, handleFirestoreError, setDoc, secondaryAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, auth } from'../../firebase';
import { SchoolClasses } from'./SchoolClasses';
import { SchoolAnnouncements } from'./SchoolAnnouncements';
import { SchoolSettings } from'./SchoolSettings';
import { GradingSystemConfig } from'./GradingSystemConfig';
import { ClassReportCards } from'./ClassReportCards';
import ClassTimetable from'./ClassTimetable';
import { SchoolFinance } from'./SchoolFinance';
import { sortByName, sortByFullName } from'../../lib/utils';

interface SchoolManagementProps {
 school: School;
 onBack: () => void;
 currentUserRole?: UserRole;
}

export const SchoolManagement = ({ school, onBack, currentUserRole ='super_admin'}: SchoolManagementProps) => {
 const [activeTab, setActiveTab] = useState<'overview'|'users'|'parents'|'classes'|'announcements'|'settings'|'grading'|'reports'|'timetable'|'finance'>('overview');
 const [roleFilter, setRoleFilter] = useState<UserRole |'all'>('all');
 const [classFilter, setClassFilter] = useState<string>('all');
 const [users, setUsers] = useState<UserProfile[]>([]);
 const [classes, setClasses] = useState<Class[]>([]);
 const [loading, setLoading] = useState(true);
 const [showAddUser, setShowAddUser] = useState(false);
 const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
 const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
 const [newUser, setNewUser] = useState<Partial<UserProfile> & { password?: string, _rawParentStudentIds?: string }>({ 
 firstName:'', 
 middleName:'', 
 lastName:'', 
 registrationNumber:'', 
 email:'', 
 password:'', 
 role:'teacher'as UserRole, 
 classId:'', 
 studentId:'', 
 parentStudentId:'', 
 parentStudentIds: [],
 _rawParentStudentIds:'',
 photoUrl:'', 
 dob:''
 });
 const [showPassword, setShowPassword] = useState(false);
 const [userToDelete, setUserToDelete] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState<string | null>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [showScrollTop, setShowScrollTop] = useState(false);
 const [isUploadingBulk, setIsUploadingBulk] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
 users: true,
 academics: true,
 finance: true,
 settings: true
 });

 useEffect(() => {
 const handleScroll = () => {
 setShowScrollTop(window.scrollY > 400);
 };
 window.addEventListener('scroll', handleScroll);
 return () => window.removeEventListener('scroll', handleScroll);
 }, []);

 const toggleSection = (section: string) => {
 setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
 };

 const downloadCsvTemplate = () => {
 const headers = ['firstName','middleName','lastName','email','password','role','registrationNumber','classId','studentId'];
 const sampleRow = ['John','','Doe','john.doe@example.com','password123','student','STU001','',''];
 const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
 
 const blob = new Blob([csvContent], { type:'text/csv;charset=utf-8;'});
 const link = document.createElement('a');
 const url = URL.createObjectURL(blob);
 link.setAttribute('href', url);
 link.setAttribute('download','seed_users_template.csv');
 link.style.visibility ='hidden';
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 setIsUploadingBulk(true);
 setError(null);

 Papa.parse(file, {
 header: true,
 skipEmptyLines: true,
 complete: async (results) => {
 try {
 let successCount = 0;
 let errorCount = 0;

 for (const row of results.data as any[]) {
 try {
 const email = row.email?.trim();
 const password = row.password?.trim() || '1234567'; // Default password
 const firstName = row.firstName?.trim();
 const lastName = row.lastName?.trim();
 const role = row.role?.trim().toLowerCase() as UserRole;
 
 if (!email || !firstName || !lastName || !role) {
 errorCount++;
 continue;
 }

 // Create user in Firebase Auth
 const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password, { data: { email_confirm: true } });
 const newUid = userCredential.user.uid;

 // Save to Firestore
 const userData: Partial<UserProfile> = {
 uid: newUid,
 email,
 firstName,
 lastName,
 role,
 schoolId: school.id,
 createdAt: new Date().toISOString(),
  forcePasswordChange: true,
 ...(row.middleName && { middleName: row.middleName.trim() }),
 ...(row.registrationNumber && { registrationNumber: row.registrationNumber.trim() }),
 ...(row.classId && { classId: row.classId.trim() }),
 ...(row.studentId && { studentId: row.studentId.trim() }),
 };

 await setDoc(doc(db,'users', newUid), userData);
 await secondaryAuth.signOut();
 successCount++;
 } catch (err) {
 console.error("Error creating user from CSV:", err);
 errorCount++;
 }
 }

 setSuccess(`Bulk upload complete: ${ successCount } added, ${ errorCount } failed.`);
 } catch (err: any) {
 setError(`Bulk upload failed: ${ err.message }`);
 } finally {
 setIsUploadingBulk(false);
 if (fileInputRef.current) {
 fileInputRef.current.value ='';
 }
 }
 },
 error: (error) => {
 setError(`Failed to parse CSV: ${ error.message }`);
 setIsUploadingBulk(false);
 if (fileInputRef.current) {
 fileInputRef.current.value ='';
 }
 }
 });
 };

 useEffect(() => {
 window.scrollTo(0, 0);
 // Push state to history for back button support
 if (activeTab !=='overview') {
 window.history.pushState({ tab: activeTab },'','');
 }
 }, [activeTab]);

 useEffect(() => {
 const handlePopState = (event: PopStateEvent) => {
 if (event.state?.tab) {
 setActiveTab(event.state.tab);
 } else {
 setActiveTab('overview');
 }
 };
 window.addEventListener('popstate', handlePopState);
 return () => window.removeEventListener('popstate', handlePopState);
 }, []);

 useEffect(() => {
 setLoading(true);
 // Real-time users listener for this school
 const unsubUsers = onSnapshot(query(collection(db,'users'), where('schoolId','==', school.id)), (snap) => {
 setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
 setLoading(false);
 });

 // Real-time classes listener
 const unsubClasses = onSnapshot(collection(db,`schools/${ school.id }/classes`), (snap) => {
 setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class)));
 });

 return () => {
 unsubUsers();
 unsubClasses();
 };
 }, [school.id]);

 const sortedClasses = useMemo(() => 
 sortByName([...classes]), 
 [classes]);

 const sortedUsers = useMemo(() => 
 sortByFullName([...users]), 
 [users]);

 const stats = useMemo(() => ({
 admins: users.filter(u => u.role  === 'school_admin').length,
 teachers: users.filter(u => u.role  === 'teacher').length,
 students: users.filter(u => u.role  === 'student').length,
 parents: users.filter(u => u.role  === 'parent').length,
 }), [users]);

 const handleSaveUser = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 setError(null);
 const { password, _rawParentStudentIds, ...userDataWithoutPassword } = newUser;
 
 // Use default password if not provided
 const finalPassword = password || '1234567';
 
 const userData = {
 ...userDataWithoutPassword,
 schoolId: school.id,
 createdAt: editingUser ? editingUser.createdAt : new Date().toISOString()
 };

 if (editingUser) {
 await updateDoc(doc(db, 'users', editingUser.uid), userData);
 setSuccess("User updated successfully");
 } else {
 const trimmedEmail = userData.email?.trim();
 if (!trimmedEmail) {
 setError("Email is required.");
 return;
 }

 // Create user in Firebase Auth using secondary app to avoid logging out current admin
 const userCredential = await createUserWithEmailAndPassword(secondaryAuth, trimmedEmail, finalPassword, { data: { email_confirm: true } });
 const newUid = userCredential.user.uid;
 
 const finalUserData = { 
 ...userData, 
 email: trimmedEmail, 
 uid: newUid,
 forcePasswordChange: true // Always force password change for new users
 };
 await setDoc(doc(db, 'users', newUid), finalUserData);
 await secondaryAuth.signOut(); // Clean up secondary auth session
 setSuccess(`User added successfully. Temporary password: ${finalPassword}`);
 }
 setShowAddUser(false);
 setEditingUser(null);
 setNewUser({ firstName:'', middleName:'', lastName:'', email:'', password:'', role:'teacher', classId:'', studentId:'', parentStudentId:'', parentStudentIds: [], _rawParentStudentIds:'', photoUrl:'', dob:'', registrationNumber:''});
 } catch (error: any) {
 console.error("Failed to save user:", error);
 if (error.code  === 'auth/email-already-in-use') {
 setError("This email is already in use by another account.");
 } else if (error.code?.startsWith('auth/')) {
 setError(error.message ||"Failed to create user authentication.");
 } else {
 try {
 handleFirestoreError(error, OperationType.WRITE,'users');
 } catch (err: any) {
 setError(err.message ||"An error occurred while saving the user.");
 }
 }
 }
 setTimeout(() => setSuccess(null), 3000);
 };

 const handleDeleteUser = (uid: string) => {
 setUserToDelete(uid);
 };

 const confirmDelete = async () => {
 if (!userToDelete) return;
 try {
 await deleteDoc(doc(db,'users', userToDelete));
 setSuccess("User removed successfully");
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE,'users');
 }
 setUserToDelete(null);
 setTimeout(() => setSuccess(null), 3000);
 };

 const handleResetPassword = async (email: string) => {
 try {
 await sendPasswordResetEmail(auth, email);
 setSuccess(`Password reset email sent to ${ email }`);
 setTimeout(() => setSuccess(null), 3000);
 } catch (error: any) {
 console.error("Failed to send reset email:", error);
 setError(error.message ||"Failed to send password reset email.");
 }
 };

 const filteredUsers = users.filter(u => {
 const matchesSearch = (u.firstName +''+ (u.middleName ||'') +''+ u.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesRole = roleFilter  === 'all'|| u.role === roleFilter;
 const matchesClass = classFilter  === 'all'|| u.classId === classFilter;
 
 // Restrict visibility based on current user role
 const isAllowedRole = (currentUserRole  === 'super_admin'|| currentUserRole  === 'school_admin') 
 ? true 
 : (u.role  === 'teacher'|| u.role  === 'student');

 // In overview, show all (for stats). In users tab, apply filters.
 if (activeTab  === 'overview') return matchesSearch;
 return matchesSearch && matchesRole && matchesClass && isAllowedRole;
 }).sort((a, b) => {
 if (a.createdAt && b.createdAt) {
 return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
 }
 return 0;
 });

 const handleBack = () => {
 if (activeTab !=='overview') {
 setActiveTab('overview');
 setRoleFilter('all');
 setClassFilter('all');
 } else {
 onBack();
 }
 };

 return (
 <div className="min-h-screen bg-transparent flex flex-col md:flex-row font-sans text-[#1A1A1A]">
 {/* Mobile Header */}
 <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-300 sticky top-0 z-50 shadow-sm">
 <button onClick={ handleBack } className="p-2 text-slate-900 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 rounded-xl">
 <ArrowLeft size={ 20 } />
 </button>
 <span className="font-medium text-lg truncate px-4 text-slate-900">{ school.name }</span>
 <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-900 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 rounded-xl">
 { isMobileMenuOpen ? <X size={ 20 } /> : <LayoutDashboard size={ 20 } />}
 </button>
 </div>

 {/* Sidebar - Desktop */}
 <aside className="hidden lg:flex w-72 bg-white backdrop-blur-xl border-r border-slate-300 flex-col p-4 gap-4 sticky top-0 h-screen shadow-[4px_0_24px_rgb(0, 0, 0, 0.02)]">
 <button 
 onClick={ handleBack }
 className="flex items-center gap-2 text-slate-900 hover:text-blue-600 transition-colors font-medium text-sm bg-slate-50 hover:bg-blue-50/50 px-4 py-2 rounded-xl w-fit"
 >
 <ArrowLeft size={ 18 } /> { activeTab !=='overview'?'Back to Overview': (currentUserRole  === 'super_admin'?'Back to Schools':'Logout')}
 </button>

 <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm">
 { school.logoUrl ? (
 <img src={ school.logoUrl } alt={ school.name } className="w-10 h-10 rounded-2xl object-cover shadow-sm border-2 border-white"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-medium text-2xl shadow-md border-2 border-slate-100">
 { school.name?.charAt(0) ||'?'}
 </div>
 )}
 <div className="overflow-hidden">
 <h3 className="font-medium text-slate-900 truncate text-base">{ school.name }</h3>
 <p className="text-[10px] text-blue-600 font-medium uppercase tracking-widest mt-0.5">{ school.planId } Plan</p>
 </div>
 </div>

 <nav className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
 <button
 onClick={() => {
 setActiveTab('overview');
 setRoleFilter('all');
 setIsMobileMenuOpen(false);
 }}
 className={ cn(
"flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all w-full text-left",
 activeTab  === 'overview'?"bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30":"text-slate-900 hover:bg-slate-50 hover:text-slate-900"
 )}
 >
 <LayoutDashboard size={ 18 } /> Overview
 </button>

 {/* User Management Section */}
 <div className="space-y-1">
 <button 
 onClick={() => toggleSection('users')}
 className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-medium uppercase tracking-widest text-slate-900 hover:text-slate-900 transition-colors"
 >
 <span>User Management</span>
 { expandedSections.users ? <ChevronDown size={ 14 } /> : <ChevronRight size={ 14 } />}
 </button>
 <AnimatePresence>
 { expandedSections.users && (
 <motion.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="space-y-1 overflow-hidden"
 >
 {[
 { id:'users', label:'User Directory', icon: Users, role:'all'},
 ...(currentUserRole  === 'super_admin'|| currentUserRole  === 'school_admin'? [{ id:'users', label: 'School Admins', icon: ShieldCheck, role:'school_admin'}] : []),
 { id:'users', label:'Teachers', icon: Users, role:'teacher'},
 { id:'users', label:'Students', icon: GraduationCap, role:'student'},
 ...(currentUserRole  === 'super_admin'|| currentUserRole  === 'school_admin'? [{ id:'parents', label:'Parents', icon: Users, role:'parent'}] : []),
 ].map(item => {
 const isActive = activeTab === item.id && (item.id  === 'parents'|| roleFilter === item.role);
 return (
 <button
 key={ item.label }
 onClick={() => {
 setActiveTab(item.id as any);
 setRoleFilter(item.role as any);
 setIsMobileMenuOpen(false);
 }}
 className={ cn(
"flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all w-full text-left",
 isActive ?"bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100/50":"text-slate-900 hover:bg-slate-50 hover:text-slate-900"
 )}
 >
 <item.icon size={ 18 } /> { item.label }
 </button>
 );
 })}
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Academics Section */}
 <div className="space-y-1">
 <button 
 onClick={() => toggleSection('academics')}
 className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-medium uppercase tracking-widest text-slate-900 hover:text-slate-900 transition-colors"
 >
 <span>Academics</span>
 { expandedSections.academics ? <ChevronDown size={ 14 } /> : <ChevronRight size={ 14 } />}
 </button>
 <AnimatePresence>
 { expandedSections.academics && (
 <motion.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="space-y-1 overflow-hidden"
 >
 <button
 onClick={() => {
 setActiveTab('classes');
 setIsMobileMenuOpen(false);
 }}
 className={ cn(
"flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all w-full text-left",
 activeTab  === 'classes'?"bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100/50":"text-slate-900 hover:bg-slate-50 hover:text-slate-900"
 )}
 >
 <BookOpen size={ 18 } /> Classes & Subjects
 </button>
 <button
 onClick={() => {
 setActiveTab('grading');
 setIsMobileMenuOpen(false);
 }}
 className={ cn(
"flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all w-full text-left",
 activeTab  === 'grading'?"bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100/50":"text-slate-900 hover:bg-slate-50 hover:text-slate-900"
 )}
 >
 <Award size={ 18 } /> Grading System
 </button>
 <button
 onClick={() => {
 setActiveTab('reports');
 setIsMobileMenuOpen(false);
 }}
 className={ cn(
"flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all w-full text-left",
 activeTab  === 'reports'?"bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100/50":"text-slate-900 hover:bg-slate-50 hover:text-slate-900"
 )}
 >
 <BookOpen size={ 18 } /> Report Cards
 </button>
 <button
 onClick={() => {
 setActiveTab('timetable');
 setIsMobileMenuOpen(false);
 }}
 className={ cn(
"flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all w-full text-left",
 activeTab  === 'timetable'?"bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100/50":"text-slate-900 hover:bg-slate-50 hover:text-slate-900"
 )}
 >
 <BookOpen size={ 18 } /> Timetable
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Finance Section */}
 {(currentUserRole  === 'school_admin'|| currentUserRole  === 'super_admin') && (
 <div className="space-y-1">
 <button 
 onClick={() => toggleSection('finance')}
 className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-medium uppercase tracking-widest text-slate-900 hover:text-slate-900 transition-colors"
 >
 <span>Finance</span>
 { expandedSections.finance ? <ChevronDown size={ 14 } /> : <ChevronRight size={ 14 } />}
 </button>
 <AnimatePresence>
 { expandedSections.finance && (
 <motion.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="space-y-1 overflow-hidden"
 >
 <button
 onClick={() => {
 setActiveTab('finance');
 setIsMobileMenuOpen(false);
 }}
 className={ cn(
"flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all w-full text-left",
 activeTab  === 'finance'?"bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100/50":"text-slate-900 hover:bg-slate-50 hover:text-slate-900"
 )}
 >
 <Award size={ 18 } /> Fees & Payments
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}

 {/* Settings Section */}
 {(currentUserRole  === 'school_admin'|| currentUserRole  === 'super_admin') && (
 <div className="space-y-1">
 <button 
 onClick={() => toggleSection('settings')}
 className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-medium uppercase tracking-widest text-slate-900 hover:text-slate-900 transition-colors"
 >
 <span>Settings & Comms</span>
 { expandedSections.settings ? <ChevronDown size={ 14 } /> : <ChevronRight size={ 14 } />}
 </button>
 <AnimatePresence>
 { expandedSections.settings && (
 <motion.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="space-y-1 overflow-hidden"
 >
 {[
 { id:'announcements', label:'Announcements', icon: Bell },
 { id:'settings', label:'School Settings', icon: Settings }
 ].map(item => {
 const isActive = activeTab === item.id;
 return (
 <button
 key={ item.label }
 onClick={() => {
 setActiveTab(item.id as any);
 setIsMobileMenuOpen(false);
 }}
 className={ cn(
"flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all w-full text-left",
 isActive ?"bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100/50":"text-slate-900 hover:bg-slate-50 hover:text-slate-900"
 )}
 >
 <item.icon size={ 18 } /> { item.label }
 </button>
 );
 })}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}
 </nav>
 </aside>

 {/* Mobile Top Bar */}
 <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white backdrop-blur-md border-b border-slate-100 px-4 flex items-center justify-between z-50">
 <div className="flex items-center gap-3">
 { school.logoUrl ? (
 <img src={ school.logoUrl } alt={ school.name } className="w-8 h-8 rounded-lg object-cover shadow-sm border border-slate-100"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm font-medium text-sm">
 { school.name?.charAt(0) ||'?'}
 </div>
 )}
 <span className="font-medium text-lg text-slate-900 truncate max-w-[150px]">{ school.name }</span>
 </div>
 <button 
 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
 className="p-2 text-slate-900 hover:bg-gray-100 rounded-lg transition-colors"
 >
 { isMobileMenuOpen ? <X size={ 24 } /> : <Menu size={ 24 } />}
 </button>
 </div>

 {/* Mobile Sidebar Overlay */}
 <AnimatePresence>
 { isMobileMenuOpen && (
 <>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setIsMobileMenuOpen(false)}
 className="lg:hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60]"
 />
 <motion.aside
 initial={{ x:'-100%'}}
 animate={{ x: 0 }}
 exit={{ x:'-100%'}}
 transition={{ type:'spring', damping: 25, stiffness: 200 }}
 className="lg:hidden fixed top-0 left-0 bottom-0 w-[300px] bg-white z-[70] p-6 shadow-2xl flex flex-col overflow-y-auto"
 >
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-3">
 { school.logoUrl ? (
 <img src={ school.logoUrl } alt={ school.name } className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-100 border border-slate-100"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 font-medium text-xl">
 { school.name?.charAt(0) ||'?'}
 </div>
 )}
 <h1 className="font-medium text-xl text-slate-900 truncate max-w-[180px]">{ school.name }</h1>
 </div>
 <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-900 hover:text-slate-900">
 <X size={ 24 } />
 </button>
 </div>

 <button 
 onClick={ handleBack }
 className="flex items-center gap-2 text-slate-900 hover:text-blue-600 transition-colors font-medium text-sm bg-slate-50 hover:bg-blue-50/50 px-4 py-3 rounded-xl w-full mb-6"
 >
 <ArrowLeft size={ 18 } /> { activeTab !=='overview'?'Back to Overview': (currentUserRole  === 'super_admin'?'Back to Schools':'Logout')}
 </button>

 <nav className="flex flex-col gap-2 flex-1">
 <button
 onClick={() => {
 setActiveTab('overview');
 setRoleFilter('all');
 setIsMobileMenuOpen(false);
 }}
 className={ cn(
"flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-medium transition-all w-full text-left",
 activeTab  === 'overview'?"bg-blue-600 text-white shadow-lg shadow-blue-500/30":"text-slate-900 hover:bg-slate-50"
 )}
 >
 <LayoutDashboard size={ 20 } /> Overview
 </button>
 
 {/* Re-using the same navigation structure for mobile */}
 <div className="space-y-4 mt-4">
 <div className="space-y-1">
 <p className="px-4 text-[10px] font-medium uppercase tracking-widest text-slate-900 mb-2">User Management</p>
 {[
 { id:'users', label:'User Directory', icon: Users, role:'all'},
 { id:'users', label:'Teachers', icon: Users, role:'teacher'},
 { id:'users', label:'Students', icon: GraduationCap, role:'student'},
 ].map(item => (
 <button
 key={ item.label }
 onClick={() => {
 setActiveTab(item.id as any);
 setRoleFilter(item.role as any);
 setIsMobileMenuOpen(false);
 }}
 className={ cn(
"flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left",
 activeTab === item.id && roleFilter === item.role ?"bg-blue-50 text-blue-700":"text-slate-900"
 )}
 >
 <item.icon size={ 18 } /> { item.label }
 </button>
 ))}
 </div>

 <div className="space-y-1">
 <p className="px-4 text-[10px] font-medium uppercase tracking-widest text-slate-900 mb-2">Academics</p>
 <button onClick={() => { setActiveTab('classes'); setIsMobileMenuOpen(false); }} className={ cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left", activeTab  === 'classes'?"bg-blue-50 text-blue-700":"text-slate-900")}>
 <BookOpen size={ 18 } /> Classes & Subjects
 </button>
 <button onClick={() => { setActiveTab('grading'); setIsMobileMenuOpen(false); }} className={ cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left", activeTab  === 'grading'?"bg-blue-50 text-blue-700":"text-slate-900")}>
 <Award size={ 18 } /> Grading System
 </button>
 <button onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} className={ cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left", activeTab  === 'reports'?"bg-blue-50 text-blue-700":"text-slate-900")}>
 <BookOpen size={ 18 } /> Report Cards
 </button>
 </div>
 </div>
 </nav>
 </motion.aside>
 </>
 )}
 </AnimatePresence>

 {/* Main Content */}
 <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden overflow-y-auto w-full pt-20 lg:pt-10">
 <div className="max-w-7xl mx-auto space-y-6 pb-20 lg:pb-0">
 <header className="mb-8 hidden lg:block">
 { activeTab  === 'overview'? (
 <div className="bg-white p-4 rounded-3xl border border-slate-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
 <span className="text-2xl">👋</span>
 </div>
 <div>
 <h3 className="text-xl font-medium text-slate-900">Welcome back, { school.name }</h3>
 <p className="text-sm text-slate-900 font-medium">Manage your school's operations</p>
 </div>
 </div>
 <div className="text-sm font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 shadow-sm">
 { school.planId.toUpperCase()} PLAN
 </div>
 </div>
 ) : (
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-4">
 <div>
 <h2 className="text-2xl md:text-xl font-medium text-slate-900 capitalize tracking-tight">
 {`${ activeTab } Management`}
 </h2>
 <p className="text-slate-900 mt-1 md:mt-2 text-sm md:text-base font-medium">
 {`Add, edit, and manage school ${ activeTab }.`}
 </p>
 </div>
 {['users'].includes(activeTab) && (
 <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
 <button
 onClick={ downloadCsvTemplate }
 className="w-full sm:w-auto bg-transparent text-blue-600 hover:bg-blue-50 px-4 py-3 md:py-4 rounded-2xl flex items-center justify-center text-sm font-medium transition-all shrink-0"
 >
 Template
 </button>
 <input
 type="file"
 accept=".csv"
 ref={ fileInputRef }
 onChange={ handleBulkUpload }
 className="hidden"
 />
 <button
 onClick={() => fileInputRef.current?.click()}
 disabled={ isUploadingBulk }
 className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-50 px-6 md:px-8 py-3 md:py-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-medium shadow-sm border border-gray-200 hover:scale-[1.02] transition-all shrink-0 disabled:opacity-50"
 >
 <Upload size={ 20 } /> { isUploadingBulk ?'Uploading...':'Bulk Upload'}
 </button>
 <button
 onClick={() => {
 setEditingUser(null);
 setNewUser({ firstName:'', middleName:'', lastName:'', registrationNumber:'', email:'', password:'', role: roleFilter !=='all'? roleFilter as UserRole :'student', classId:'', studentId:'', parentStudentId:'', parentStudentIds: [], _rawParentStudentIds:'', photoUrl:'', dob:''});
 setShowAddUser(true);
 }}
 className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 px-6 md:px-8 py-3 md:py-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-medium shadow-lg shadow-blue-500/30 hover:scale-[1.02] transition-all shrink-0 border border-slate-300"
 >
 <UserPlus size={ 20 } /> Add User
 </button>
 </div>
 )}
 </div>
 )}
 </header>

 { activeTab  === 'overview'? (
 <div className="space-y-5 md:space-y-12">
 {/* School Info Card */}
 <div className="bg-white p-4 md:p-4 rounded-2xl md:rounded-2xl border border-slate-300 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-4 relative overflow-hidden">
 

 <div className="flex items-center gap-4 relative z-10">
 <div className="p-3 md:p-4 bg-indigo-50 rounded-2xl text-indigo-600 shrink-0 shadow-sm border border-indigo-100/50"><Mail size={ 20 } /></div>
 <div className="overflow-hidden">
 <p className="text-[10px] font-medium uppercase tracking-widest text-slate-900">Email</p>
 <p className="font-medium text-sm text-slate-900 truncate mt-1">{ school.email }</p>
 </div>
 </div>
 <div className="flex items-center gap-4 relative z-10">
 <div className="p-3 md:p-4 bg-purple-50 rounded-2xl text-purple-600 shrink-0 shadow-sm border border-purple-100/50"><Phone size={ 20 } /></div>
 <div className="overflow-hidden">
 <p className="text-[10px] font-medium uppercase tracking-widest text-slate-900">Phone</p>
 <p className="font-medium text-sm text-slate-900 truncate mt-1">{ school.phone }</p>
 </div>
 </div>
 </div>

 {/* Stats Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { label: 'School Admins', value: stats.admins, icon: ShieldCheck, colorClass:'from-blue-50 to-blue-100 text-blue-600 border-blue-200/50'},
 { label:'Teachers', value: stats.teachers, icon: Users, colorClass:'from-indigo-50 to-indigo-100 text-indigo-600 border-indigo-200/50'},
 { label:'Students', value: stats.students, icon: GraduationCap, colorClass:'from-purple-50 to-purple-100 text-purple-600 border-purple-200/50'},
 { label:'Parents', value: stats.parents, icon: Users, colorClass:'from-pink-50 to-pink-100 text-pink-600 border-pink-200/50'},
 ].map(stat => (
 <div key={ stat.label } className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
 <div className={`w-10 h-10 bg-gradient-to-br ${ stat.colorClass } rounded-2xl flex items-center justify-center shadow-sm border`}>
 <stat.icon size={ 20 } />
 </div>
 <div>
 <p className="text-[10px] font-medium text-slate-900 uppercase tracking-wider">{ stat.label }</p>
 <p className="text-xl font-medium text-slate-900 mt-1">{ stat.value }</p>
 </div>
 </div>
 ))}
 </div>
 {/* Quick Actions */}
 <div>
 <h3 className="text-[10px] font-medium text-slate-900 mb-4 uppercase tracking-wider">Quick Actions</h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {[
 { label:'Manage Students', desc:'Add, edit & assign students', icon: Users, tab:'users', role:'student', colorClass:'from-blue-50 to-blue-100 text-blue-600 border-blue-200/50'},
 { label:'Manage Teachers', desc:'Add & manage teachers', icon: Users, tab:'users', role:'teacher', colorClass:'from-indigo-50 to-indigo-100 text-indigo-600 border-indigo-200/50'},
 { label:'Classes & Subjects', desc:'Set up school structure', icon: BookOpen, tab:'classes', colorClass:'from-purple-50 to-purple-100 text-purple-600 border-purple-200/50'},
 ...(currentUserRole  === 'school_admin'|| currentUserRole  === 'super_admin'? [
 { label:'Announcements', desc:'Post school-wide updates', icon: Bell, tab:'announcements', colorClass:'from-pink-50 to-pink-100 text-pink-600 border-pink-200/50'},
 { label:'Manage Users', desc:'Create & manage user accounts', icon: Users, tab:'users', role:'all', colorClass:'from-rose-50 to-rose-100 text-rose-600 border-rose-200/50'},
 { label:'School Settings', desc:'Update school info & logo', icon: Settings, tab:'settings', colorClass:'from-orange-50 to-orange-100 text-orange-600 border-orange-200/50'}
 ] : [])
 ].map(action => (
 <div key={ action.label } onClick={() => { setActiveTab(action.tab as any); if (action.role) setRoleFilter(action.role as any); }} className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4 hover:border-blue-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer min-w-0 group">
 <div className={`w-10 h-10 bg-gradient-to-br ${ action.colorClass } rounded-2xl flex items-center justify-center shrink-0 shadow-sm border group-hover:scale-110 transition-transform duration-300`}>
 <action.icon size={ 20 } />
 </div>
 <div className="min-w-0">
 <p className="text-base font-medium text-slate-900 truncate">{ action.label }</p>
 <p className="text-xs text-slate-900 font-medium truncate mt-0.5">{ action.desc }</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 ) : activeTab  === 'users'? (
 <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
 <div className="p-4 md:p-4 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50">
 <div>
 <h3 className="font-medium text-2xl text-slate-900 capitalize">User Directory</h3>
 <p className="text-sm text-slate-900 font-medium mt-1">Manage all school users</p>
 </div>
 <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
 <select
 value={ roleFilter }
 onChange={(e) => setRoleFilter(e.target.value as UserRole |'all')}
 className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-200/50 bg-white backdrop-blur-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-medium text-slate-900 transition-all shadow-sm"
 >
 <option value="all">All Roles</option>
 {(currentUserRole  === 'super_admin'|| currentUserRole  === 'school_admin') && <option value="school_admin">Admins</option>}
 <option value="parent">Parents</option>
 <option value="student">Students</option>
 <option value="teacher">Teachers</option>
 </select>
 <select
 value={ classFilter }
 onChange={(e) => setClassFilter(e.target.value)}
 className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-200/50 bg-white backdrop-blur-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-medium text-slate-900 transition-all shadow-sm"
 >
 <option value="all">All Classes</option>
 { sortedClasses.map(c => (
 <option key={ c.id } value={ c.id }>{ c.name }</option>
 ))}
 </select>
 <div className="relative w-full sm:w-64">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900" size={ 18 } />
 <input
 type="text"
 placeholder="Search users..."
 value={ searchQuery }
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-11 pr-5 py-3 rounded-2xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-slate-900 transition-all shadow-sm cursor-text"
 />
 </div>
 <div className="flex gap-2 w-full sm:w-auto">
 <button
 onClick={() => {
 setEditingUser(null);
 setNewUser({ firstName:'', middleName:'', lastName:'', registrationNumber:'', email:'', password:'', role: roleFilter !=='all'? roleFilter as UserRole :'student', classId:'', studentId:'', parentStudentId:'', parentStudentIds: [], _rawParentStudentIds:'', photoUrl:'', dob:''});
 setShowAddUser(true);
 }}
 className="flex-1 sm:flex-none bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-blue-500/30 hover:scale-[1.02] transition-all shrink-0"
 >
 <UserPlus size={ 18 } /> Add User
 </button>
 </div>
 </div>
 </div>
 <div className="w-full">
 {/* Desktop Table */}
 <div className="hidden md:block overflow-x-auto">
 <table className="w-full text-left min-w-[600px]">
 <thead className="bg-slate-50 text-[10px] uppercase text-slate-900 font-medium tracking-[0.2em] border-b border-slate-100">
 <tr>
 <th className="px-6 md:px-8 py-4 md:py-5">Name & Email</th>
 <th className="px-6 md:px-8 py-4 md:py-5">Role & Details</th>
 <th className="px-6 md:px-8 py-4 md:py-5">Joined</th>
 <th className="px-6 md:px-8 py-4 md:py-5 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 { filteredUsers.map((u, i) => (
 <motion.tr 
 key={ u.uid }
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: i * 0.05 }}
 className="hover:bg-blue-50/30 transition-colors group"
 >
 <td className="px-6 md:px-8 py-4 md:py-6">
 <div className="flex items-center gap-4">
 { u.photoUrl ? (
 <img src={ u.photoUrl } alt="Profile"className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-gray-200 group-hover:scale-105 transition-transform shrink-0"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center font-medium text-blue-600 shrink-0 shadow-sm border border-blue-100/50 group-hover:scale-105 transition-transform">
 { u.firstName?.charAt(0) ||'?'}
 </div>
 )}
 <div className="overflow-hidden">
 <p className="font-medium text-sm text-slate-900 truncate">{ u.firstName } { u.lastName }</p>
 <p className="text-xs text-slate-900 font-medium truncate mt-0.5">{ u.email }</p>
 </div>
 </div>
 </td>
 <td className="px-6 md:px-8 py-4 md:py-6">
 <div className="overflow-hidden">
 <span className="text-[10px] font-medium uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100/50 px-3 py-1 rounded-full whitespace-nowrap inline-block mb-1.5 shadow-sm">
 { u.role.replace('_','')}
 </span>
 {(u.role  === 'student'|| u.role  === 'teacher') && (
 <p className="text-xs text-slate-900 font-medium mt-1">
 { u.role  === 'student'? (u.studentId ||'No ID') :'Teacher'} • { classes.find(c => c.id === u.classId)?.name ||'Unassigned'}
 </p>
 )}
 </div>
 </td>
 <td className="px-6 md:px-8 py-4 md:py-6 text-sm text-slate-900 font-medium whitespace-nowrap">
 { u.createdAt ? new Date(u.createdAt).toLocaleDateString() :'---'}
 </td>
 <td className="px-6 md:px-8 py-4 md:py-6">
 <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
 <button 
 onClick={() => {
 setViewingUser(u);
 }}
 className="p-2.5 hover:bg-gray-100 text-slate-900 rounded-xl transition-colors hover:shadow-sm"
 title="View Details"
 >
 <Eye size={ 18 } />
 </button>
 <button 
 onClick={() => {
 setEditingUser(u);
 setNewUser({ firstName: u.firstName ||'', middleName: u.middleName ||'', lastName: u.lastName ||'', registrationNumber: u.registrationNumber ||'', email: u.email, phone: u.phone ||'', password:'', role: u.role, classId: u.classId ||'', studentId: u.studentId ||'', parentStudentId: u.parentStudentId ||'', parentStudentIds: u.parentStudentIds || [], _rawParentStudentIds: u.parentStudentIds?.join(',') || u.parentStudentId ||'', photoUrl: u.photoUrl ||'', dob: u.dob ||''});
 setShowAddUser(true);
 }}
 className="p-2.5 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors hover:shadow-sm"
 title="Edit User"
 >
 <Edit2 size={ 18 } />
 </button>
 <button 
 onClick={() => handleResetPassword(u.email)}
 className="p-2.5 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-colors hover:shadow-sm"
 title="Send Password Reset Email"
 >
 <Key size={ 18 } />
 </button>
 <button 
 onClick={() => handleDeleteUser(u.uid)}
 className="p-2.5 hover:bg-red-100 text-red-600 rounded-xl transition-colors hover:shadow-sm"
 title="Delete User"
 >
 <Trash2 size={ 18 } />
 </button>
 </div>
 </td>
 </motion.tr>
 ))}
 { filteredUsers.length === 0 && (
 <tr>
 <td colSpan={ 4 } className="px-6 md:px-8 py-16 text-center text-slate-900 font-medium bg-transparent">No users found matching your filters.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Mobile Cards */}
 <div className="md:hidden flex flex-col gap-4 p-4">
 { filteredUsers.map((u, i) => (
 <motion.div 
 key={ u.uid }
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-4"
 >
 <div className="flex items-center gap-3">
 { u.photoUrl ? (
 <img src={ u.photoUrl } alt="Profile"className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200 shrink-0"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-medium text-blue-600 shrink-0">
 { u.firstName?.charAt(0) ||'?'}
 </div>
 )}
 <div className="overflow-hidden">
 <p className="font-medium text-sm text-slate-900 truncate">{ u.firstName } { u.lastName }</p>
 <p className="text-xs text-slate-900 truncate">{ u.email }</p>
 </div>
 </div>
 
 <div className="flex flex-col gap-2">
 <div className="flex justify-between items-center">
 <span className="text-xs text-slate-900">Role</span>
 <span className="text-[10px] font-medium uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded-full">
 { u.role.replace('_','')}
 </span>
 </div>
 {(u.role  === 'student'|| u.role  === 'teacher') && (
 <div className="flex justify-between items-center">
 <span className="text-xs text-slate-900">Class/Details</span>
 <span className="text-xs text-slate-900">
 { u.role  === 'student'? (u.studentId ||'No ID') :'Teacher'} • { classes.find(c => c.id === u.classId)?.name ||'Unassigned'}
 </span>
 </div>
 )}
 <div className="flex justify-between items-center">
 <span className="text-xs text-slate-900">Joined</span>
 <span className="text-xs text-slate-900">
 { u.createdAt ? new Date(u.createdAt).toLocaleDateString() :'---'}
 </span>
 </div>
 </div>

 <div className="flex gap-2 justify-end pt-3 border-t border-gray-50">
 <button 
 onClick={() => {
 setViewingUser(u);
 }}
 className="p-2 hover:bg-gray-100 text-slate-900 rounded-lg transition-colors"
 >
 <Eye size={ 16 } />
 </button>
 <button 
 onClick={() => {
 setEditingUser(u);
 setNewUser({ firstName: u.firstName ||'', middleName: u.middleName ||'', lastName: u.lastName ||'', registrationNumber: u.registrationNumber ||'', email: u.email, phone: u.phone ||'', password:'', role: u.role, classId: u.classId ||'', studentId: u.studentId ||'', parentStudentId: u.parentStudentId ||'', parentStudentIds: u.parentStudentIds || [], _rawParentStudentIds: u.parentStudentIds?.join(',') || u.parentStudentId ||'', photoUrl: u.photoUrl ||'', dob: u.dob ||''});
 setShowAddUser(true);
 }}
 className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
 >
 <Edit2 size={ 16 } />
 </button>
 <button 
 onClick={() => handleResetPassword(u.email)}
 className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
 >
 <Key size={ 16 } />
 </button>
 <button 
 onClick={() => handleDeleteUser(u.uid)}
 className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
 >
 <Trash2 size={ 16 } />
 </button>
 </div>
 </motion.div>
 ))}
 { filteredUsers.length === 0 && (
 <div className="py-8 text-center text-slate-900 text-sm">No users found matching your filters.</div>
 )}
 </div>
 </div>
 </div>
 ) : activeTab  === 'parents'? (
 <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
 <div className="p-4 md:p-4 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50">
 <div>
 <h3 className="font-medium text-2xl text-slate-900">Parents Directory</h3>
 <p className="text-sm text-slate-900 font-medium mt-1">View and manage parent accounts and their children</p>
 </div>
 <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
 <div className="relative w-full sm:w-64">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900" size={ 18 } />
 <input
 type="text"
 placeholder="Search parents..."
 value={ searchQuery }
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-11 pr-5 py-3 rounded-2xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-slate-900 transition-all shadow-sm cursor-text"
 />
 </div>
 <button
 onClick={() => {
 setEditingUser(null);
 setNewUser({ firstName:'', middleName:'', lastName:'', registrationNumber:'', email:'', phone:'', password:'', role:'parent', classId:'', studentId:'', parentStudentId:'', parentStudentIds: [], _rawParentStudentIds:'', photoUrl:'', dob:''});
 setShowAddUser(true);
 }}
 className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-blue-500/30 hover:scale-[1.02] transition-all shrink-0"
 >
 <UserPlus size={ 18 } /> Add Parent
 </button>
 </div>
 </div>
 <div className="w-full">
 <div className="overflow-x-auto">
 <table className="w-full text-left min-w-[600px]">
 <thead className="bg-slate-50 text-[10px] uppercase text-slate-900 font-medium tracking-[0.2em] border-b border-slate-100">
 <tr>
 <th className="px-6 md:px-8 py-4 md:py-5">Parent Name</th>
 <th className="px-6 md:px-8 py-4 md:py-5">Contact</th>
 <th className="px-6 md:px-8 py-4 md:py-5">Children</th>
 <th className="px-6 md:px-8 py-4 md:py-5 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 { sortedUsers.filter(u => u.role  === 'parent'&& (
 u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 u.phone?.includes(searchQuery)
 )).map((u, i) => (
 <motion.tr 
 key={ u.uid }
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: i * 0.05 }}
 className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
 onClick={() => setViewingUser(u)}
 >
 <td className="px-6 md:px-8 py-4 md:py-6">
 <div className="flex items-center gap-4">
 { u.photoUrl ? (
 <img src={ u.photoUrl } alt="Profile"className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-gray-200 group-hover:scale-105 transition-transform"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center font-medium text-blue-600 shrink-0 shadow-sm border border-blue-100/50 group-hover:scale-105 transition-transform">
 { u.firstName?.charAt(0) ||'?'}
 </div>
 )}
 <div className="overflow-hidden">
 <p className="font-medium text-sm text-slate-900 truncate">{ u.firstName } { u.lastName }</p>
 <p className="text-xs text-slate-900 font-medium truncate mt-0.5">{ u.email }</p>
 </div>
 </div>
 </td>
 <td className="px-6 md:px-8 py-4 md:py-6">
 <div className="flex items-center gap-2 text-slate-900">
 <Phone size={ 14 } className="text-slate-900"/>
 <span className="text-sm font-medium">{ u.phone ||'No phone'}</span>
 </div>
 </td>
 <td className="px-6 md:px-8 py-4 md:py-6">
 <div className="flex flex-wrap gap-1">
 {(u.parentStudentIds || (u.parentStudentId ? [u.parentStudentId] : [])).map(sid => (
 <span key={ sid } className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded-full">
 { sid }
 </span>
 ))}
 {!(u.parentStudentIds?.length || u.parentStudentId) && <span className="text-xs text-slate-900">No children linked</span>}
 </div>
 </td>
 <td className="px-6 md:px-8 py-4 md:py-6">
 <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
 <button 
 onClick={(e) => {
 e.stopPropagation();
 setViewingUser(u);
 }}
 className="p-2.5 hover:bg-gray-100 text-slate-900 rounded-xl transition-colors hover:shadow-sm"
 >
 <Eye size={ 18 } />
 </button>
 <button 
 onClick={(e) => {
 e.stopPropagation();
 setEditingUser(u);
 setNewUser({ firstName: u.firstName ||'', middleName: u.middleName ||'', lastName: u.lastName ||'', registrationNumber: u.registrationNumber ||'', email: u.email, phone: u.phone ||'', password:'', role: u.role, classId: u.classId ||'', studentId: u.studentId ||'', parentStudentId: u.parentStudentId ||'', parentStudentIds: u.parentStudentIds || [], _rawParentStudentIds: u.parentStudentIds?.join(',') || u.parentStudentId ||'', photoUrl: u.photoUrl ||'', dob: u.dob ||''});
 setShowAddUser(true);
 }}
 className="p-2.5 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors hover:shadow-sm"
 >
 <Edit2 size={ 18 } />
 </button>
 </div>
 </td>
 </motion.tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 ) : activeTab  === 'classes'? (
 <SchoolClasses school={ school } />
 ) : activeTab  === 'grading'? (
 <GradingSystemConfig schoolId={ school.id } />
 ) : activeTab  === 'reports'? (
 <ClassReportCards school={ school } />
 ) : activeTab  === 'timetable'? (
 <ClassTimetable user={{ schoolId: school.id } as UserProfile } mode="edit"/>
 ) : activeTab  === 'finance'&& (currentUserRole  === 'school_admin'|| currentUserRole  === 'super_admin') ? (
 <SchoolFinance school={ school } />
 ) : activeTab  === 'announcements'&& (currentUserRole  === 'school_admin'|| currentUserRole  === 'super_admin') ? (
 <SchoolAnnouncements school={ school } />
 ) : activeTab  === 'settings'&& (currentUserRole  === 'school_admin'|| currentUserRole  === 'super_admin') ? (
 <SchoolSettings school={ school } />
 ) : (
 <div className="bg-white p-16 md:p-20 rounded-2xl border border-slate-300 shadow-sm text-center max-w-2xl mx-auto relative overflow-hidden">
 
 <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-blue-600 shadow-sm border border-blue-100/50 relative z-10">
 <Settings size={ 40 } className="animate-spin-slow"/>
 </div>
 <h2 className="text-xl font-medium text-slate-900 mb-4 capitalize relative z-10">{ activeTab.replace('_','')} Module</h2>
 <p className="text-slate-900 max-w-md mx-auto font-medium relative z-10">
 We are currently refining the { activeTab.replace('_','')} management experience to match our new design standards.
 </p>
 </div>
 )}

 {/* Add/Edit User Modal */}
 <AnimatePresence>
 { showAddUser && (
 <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[100] overflow-y-auto">
 <motion.div
 initial={{ scale: 0.95, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.95, opacity: 0, y: 20 }}
 className="bg-white backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl my-4 max-h-[95vh] overflow-y-auto border border-slate-100 relative"
 >
 <div className="flex justify-between items-start mb-6 sm:mb-8 relative z-10">
 <div>
 <h3 className="text-xl font-medium text-slate-900">{ editingUser ?'Edit User':`Add New ${ newUser.role.replace('_','')}`}</h3>
 <p className="text-slate-900 text-sm mt-1 font-medium">Manage school staff and student accounts.</p>
 </div>
 <button onClick={() => setShowAddUser(false)} className="p-2 text-slate-900 hover:text-slate-900 hover:bg-gray-100 rounded-full transition-colors shrink-0">
 <X size={ 20 } />
 </button>
 </div>

 { error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 shadow-sm">{ error }</div>}

 <form onSubmit={ handleSaveUser } className="space-y-6 md:space-y-5 relative z-10">
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Role</label>
 <select
 value={ newUser.role }
 onChange={ e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 disabled={!!editingUser }
 >
 {(currentUserRole  === 'super_admin'|| currentUserRole  === 'school_admin') && <option value="school_admin">Admin</option>}
 <option value="parent">Parent</option>
 <option value="student">Student</option>
 <option value="teacher">Teacher</option>
 </select>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">First Name</label>
 <input
 required
 type="text"
 value={ newUser.firstName }
 onChange={ e => setNewUser({ ...newUser, firstName: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 placeholder="John"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Middle Name (Optional)</label>
 <input
 type="text"
 value={ newUser.middleName }
 onChange={ e => setNewUser({ ...newUser, middleName: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 placeholder="Middle Name"
 />
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Last Name</label>
 <input
 required
 type="text"
 value={ newUser.lastName }
 onChange={ e => setNewUser({ ...newUser, lastName: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 placeholder="Doe"
 />
 </div>
 { newUser.role  === 'student'&& (
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Registration Number</label>
 <input
 type="text"
 value={ newUser.registrationNumber }
 onChange={ e => setNewUser({ ...newUser, registrationNumber: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 placeholder="e.g. REG-2023-001"
 />
 </div>
 )}
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Photo</label>
 <input
 type="file"
 accept="image/*"
 onChange={ e => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setNewUser({ ...newUser, photoUrl: reader.result as string });
 };
 reader.readAsDataURL(file);
 }
 }}
 className="w-full px-4 py-2.5 rounded-2xl border border-gray-200/50 bg-white focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
 />
 { newUser.photoUrl && (
 <div className="mt-3">
 <img src={ newUser.photoUrl } alt="Preview"className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"referrerPolicy="no-referrer"/>
 </div>
 )}
 </div>
 { newUser.role  === 'student'&& (
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Date of Birth</label>
 <input
 type="date"
 value={ newUser.dob }
 onChange={ e => setNewUser({ ...newUser, dob: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 />
 </div>
 )}
 </div>
 
 { newUser.role  === 'student'&& (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Gender</label>
 <select
 value={ newUser.gender ||''}
 onChange={ e => setNewUser({ ...newUser, gender: e.target.value as'male'|'female'})}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 >
 <option value="">Select Gender</option>
 <option value="male">Male</option>
 <option value="female">Female</option>
 </select>
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Email Address</label>
 <input
 required
 type="email"
 value={ newUser.email }
 onChange={ e => setNewUser({ ...newUser, email: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 placeholder="john@example.com"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Phone Number</label>
 <input
 type="tel"
 value={ newUser.phone }
 onChange={ e => setNewUser({ ...newUser, phone: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 placeholder="e.g. +234..."
 />
 </div>
 </div>
 
 {!editingUser && (
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Temporary Password</label>
 <div className="relative">
 <input
 required
 type={ showPassword ?"text":"password"}
 value={ newUser.password }
 onChange={ e => setNewUser({ ...newUser, password: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200/50 bg-white focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 pr-12"
 placeholder="Min 6 characters"
 minLength={ 6 }
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 hover:text-slate-900 transition-colors"
 >
 { showPassword ? <EyeOff size={ 18 } /> : <Eye size={ 18 } />}
 </button>
 </div>
 <p className="text-[10px] text-slate-900 ml-1 font-medium">User can log in with this password.</p>
 </div>
 )}

 {(newUser.role  === 'student'|| newUser.role  === 'teacher') && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 { newUser.role  === 'student'&& (
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Student ID</label>
 <input
 type="text"
 value={ newUser.studentId ||''}
 onChange={ e => setNewUser({ ...newUser, studentId: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 placeholder="e.g. STU-2023-001"
 />
 </div>
 )}
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">
 { newUser.role  === 'student'?'Assign Class':'Primary Class'}
 </label>
 <select
 value={ newUser.classId }
 onChange={ e => setNewUser({ ...newUser, classId: e.target.value })}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 >
 <option value="">Select Class</option>
 { sortedClasses.map(c => <option key={ c.id } value={ c.id }>{ c.name }</option>)}
 </select>
 </div>
 </div>
 )}

 { newUser.role  === 'parent'&& (
 <div className="space-y-1.5">
 <label className="text-[10px] font-medium uppercase tracking-widest text-slate-900 ml-1">Children Student IDs (Comma separated)</label>
 <input
 type="text"
 value={ newUser._rawParentStudentIds !== undefined ? newUser._rawParentStudentIds : (newUser.parentStudentIds?.join(',') || newUser.parentStudentId ||'')}
 onChange={ e => {
 const val = e.target.value;
 const ids = val.split(',').map(id => id.trim()).filter(id => id.length > 0);
 setNewUser({ ...newUser, parentStudentIds: ids, parentStudentId: ids[0] ||'', _rawParentStudentIds: val });
 }}
 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 cursor-text"
 placeholder="e.g. STU-001, STU-002"
 />
 <p className="text-[10px] text-slate-900 ml-1 font-medium">Enter the Student IDs of the parent's children, separated by commas.</p>
 </div>
 )}

 <div className="flex flex-col sm:flex-row gap-3 pt-4">
 <button
 type="button"
 onClick={() => setShowAddUser(false)}
 className="w-full sm:flex-1 py-4 rounded-2xl border border-gray-200/50 font-medium text-slate-900 hover:bg-slate-50 hover:text-slate-900 transition-all text-sm shadow-sm"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="w-full sm:flex-1 py-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-md transition-all text-sm border border-slate-300"
 >
 { editingUser ?'Save Changes':'Add User'}
 </button>
 </div>
 </form>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* User Details Modal */}
 <AnimatePresence>
 { viewingUser && (
 <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-white p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
 >
 <div className="flex justify-between items-start mb-8">
 <div className="flex items-center gap-4">
 { viewingUser.photoUrl ? (
 <img src={ viewingUser.photoUrl } alt="Profile"className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-gray-200"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center font-medium text-blue-600 text-2xl shadow-sm border border-blue-100/50">
 { viewingUser.firstName?.charAt(0) ||'?'}
 </div>
 )}
 <div>
 <h3 className="text-2xl font-medium text-slate-900">{ viewingUser.firstName } { viewingUser.lastName }</h3>
 <p className="text-blue-600 font-medium text-sm uppercase tracking-widest">{ viewingUser.role.replace('_','')} Profile</p>
 </div>
 </div>
 <button onClick={() => setViewingUser(null)} className="p-2 text-slate-900 hover:text-slate-900 hover:bg-gray-100 rounded-full transition-colors">
 <X size={ 24 } />
 </button>
 </div>

 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-1">
 <p className="text-[10px] font-medium uppercase tracking-widest text-slate-900">Email Address</p>
 <p className="text-slate-900 font-medium break-all">{ viewingUser.email }</p>
 </div>
 <div className="space-y-1">
 <p className="text-[10px] font-medium uppercase tracking-widest text-slate-900">Phone Number</p>
 <p className="text-slate-900 font-medium">{ viewingUser.phone ||'Not provided'}</p>
 </div>
 </div>

 { viewingUser.role  === 'student'&& (
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-1">
 <p className="text-[10px] font-medium uppercase tracking-widest text-slate-900">Student ID</p>
 <p className="text-slate-900 font-medium">{ viewingUser.studentId ||'Not provided'}</p>
 </div>
 <div className="space-y-1">
 <p className="text-[10px] font-medium uppercase tracking-widest text-slate-900">Class</p>
 <p className="text-slate-900 font-medium">{ classes.find(c => c.id === viewingUser.classId)?.name ||'Not assigned'}</p>
 </div>
 </div>
 )}

 { viewingUser.role  === 'parent'&& (
 <div className="space-y-3">
 <p className="text-[10px] font-medium uppercase tracking-widest text-slate-900">Linked Children</p>
 <div className="space-y-2">
 {(viewingUser.parentStudentIds || (viewingUser.parentStudentId ? [viewingUser.parentStudentId] : [])).map(sid => {
 const student = users.find(u => u.studentId === sid);
 return (
 <div key={ sid } className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
 <div className="flex items-center gap-3">
 { student?.photoUrl ? (
 <img src={ student.photoUrl } alt="Profile"className="w-8 h-8 rounded-lg object-cover border border-gray-200"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-600 font-medium text-xs border border-gray-200">
 { student?.firstName?.charAt(0) ||'?'}
 </div>
 )}
 <div>
 <p className="text-sm font-medium text-slate-900">{ student ?`${ student.firstName } ${ student.lastName }`:'Unknown Student'}</p>
 <p className="text-[10px] text-slate-900 font-medium">{ sid }</p>
 </div>
 </div>
 { student && (
 <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/50">
 { classes.find(c => c.id === student.classId)?.name ||'No Class'}
 </span>
 )}
 </div>
 );
 })}
 {!(viewingUser.parentStudentIds?.length || viewingUser.parentStudentId) && (
 <p className="text-sm text-slate-900 italic">No children linked to this parent account.</p>
 )}
 </div>
 </div>
 )}

 <div className="pt-6 border-t border-slate-100 flex gap-3">
 <button
 onClick={() => {
 setEditingUser(viewingUser);
 setNewUser({ firstName: viewingUser.firstName ||'', middleName: viewingUser.middleName ||'', lastName: viewingUser.lastName ||'', registrationNumber: viewingUser.registrationNumber ||'', email: viewingUser.email, phone: viewingUser.phone ||'', password:'', role: viewingUser.role, classId: viewingUser.classId ||'', studentId: viewingUser.studentId ||'', parentStudentId: viewingUser.parentStudentId ||'', parentStudentIds: viewingUser.parentStudentIds || [], _rawParentStudentIds: viewingUser.parentStudentIds?.join(',') || viewingUser.parentStudentId ||'', photoUrl: viewingUser.photoUrl ||'', dob: viewingUser.dob ||''});
 setViewingUser(null);
 setShowAddUser(true);
 }}
 className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
 >
 Edit Profile
 </button>
 <button
 onClick={() => setViewingUser(null)}
 className="flex-1 py-3 bg-slate-50 text-slate-900 rounded-xl font-medium hover:bg-gray-100 transition-all border border-gray-200"
 >
 Close
 </button>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Delete Confirmation Modal */}
 <AnimatePresence>
 { userToDelete && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-300"
 >
 <div className="p-4">
 <div className="flex items-center gap-4 mb-6 text-red-600">
 <div className="p-3 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
 <AlertTriangle size={ 20 } />
 </div>
 <h2 className="text-lg font-medium text-slate-900">Delete User</h2>
 </div>
 <p className="text-slate-900 font-medium mb-8">
 Are you sure you want to remove this user? This action cannot be undone and will permanently delete their data from the system.
 </p>
 <div className="flex gap-4">
 <button
 onClick={() => setUserToDelete(null)}
 className="flex-1 py-4 rounded-2xl border border-gray-200/50 font-medium text-slate-900 hover:bg-slate-50 hover:text-slate-900 transition-all text-sm shadow-sm"
 >
 Cancel
 </button>
 <button
 onClick={ confirmDelete }
 className="flex-1 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-medium hover:shadow-lg hover:shadow-red-500/30 transition-all shadow-md text-sm border border-slate-300"
 >
 Delete User
 </button>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 { success && (
 <motion.div
 initial={{ y: 50, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 50, opacity: 0 }}
 className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-[#1A1A1A] text-slate-900 px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl shadow-2xl z-[110] flex items-center gap-3 border border-slate-200"
 >
 <div className="w-5 h-5 md:w-6 md:h-6 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
 <CheckCircle size={ 14 } className="text-white"/>
 </div>
 <span className="font-medium text-xs md:text-sm tracking-wide">{ success }</span>
 </motion.div>
 )}
 </div>
 </main>

 {/* Return to Top Button */}
 <AnimatePresence>
 { showScrollTop && (
 <motion.button
 initial={{ opacity: 0, scale: 0.8, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.8, y: 20 }}
 onClick={() => window.scrollTo({ top: 0, behavior:'smooth'})}
 className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:bg-blue-700 transition-all z-50 group border-4 border-white"
 title="Return to Top"
 >
 <ChevronUp size={ 24 } className="group-hover:-translate-y-1 transition-transform"/>
 </motion.button>
 )}
 </AnimatePresence>
 </div>
 );
};

function cn(...inputs: any[]) {
 return inputs.filter(Boolean).join('');
}
