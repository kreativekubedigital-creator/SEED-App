import React, { useEffect, useState, useRef } from'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation, useSearchParams } from'react-router-dom';
import { auth, db, onAuthStateChanged, doc, getDoc, signInWithPopup, signInWithRedirect, getRedirectResult, googleProvider, signOut, setDoc, updateDoc, collection, getDocs, query, where, onSnapshot, signInWithEmailAndPassword, handleFirestoreError, OperationType, createUserWithEmailAndPassword, sendPasswordResetEmail, logAuditAction } from'./firebase';
import { UserProfile, UserRole, School, Announcement } from'./types';
import { Logo } from'./components/Logo';
import { useTheme } from'./components/ThemeProvider';
import {  LogIn, LogOut, LayoutDashboard, User, Users, BookOpen, Bell, Settings, CreditCard, Menu, X, Home, Sparkles, Info, Mail, Clock, CheckCircle2, CheckCircle, Eye, EyeOff, Search, ChevronDown, Check, Shield, School as SchoolIcon, Lock, AlertTriangle, ArrowLeft
} from'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from'motion/react';
import { cn } from'./lib/utils';


// Dashboards
import { SuperAdminDashboard } from'./components/dashboards/SuperAdminDashboard';
import { SchoolAdminDashboard } from'./components/dashboards/SchoolAdminDashboard';
import { TeacherDashboard } from'./components/dashboards/TeacherDashboard';
import { StudentDashboard } from'./components/dashboards/StudentDashboard';
import { ParentDashboard } from'./components/dashboards/ParentDashboard';
import { UserProfile as UserProfileComponent } from'./components/UserProfile';
import { LandingPage } from'./components/LandingPage';
import { PasswordChangeModal } from './components/PasswordChangeModal';
const SUPER_ADMIN_EMAILS = ['kreativekubesolutions@gmail.com', 'seedd.ng@gmail.com', 'abahjohnakor@gmail.com'];

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
 ({ className, ...props }, ref) => {
 return (
 <button
 className={`inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:pointer-events-none disabled:opacity-50 bg-[#2563EB] text-slate-900 hover:bg-blue-600 h-10 px-6 py-2 shadow-lg shadow-blue-500/20 active:scale-95 ${ className }`}
 ref={ ref }
 {...props }
 />
 )
 },
)
Button.displayName ="Button"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
 ({ className, type, ...props }, ref) => {
 return (
 <input
 type={ type }
 className={`flex h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-800 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-text font-medium text-gray-800 ${ className }`}
 ref={ ref }
 {...props }
 />
 )
 },
)
Input.displayName ="Input"

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: string | null }> {
 constructor(props: { children: React.ReactNode }) {
 super(props);
 this.state = { hasError: false, errorInfo: null };
 }

 static getDerivedStateFromError(error: any) {
 return { hasError: true, errorInfo: error.message };
 }

 componentDidCatch(error: any, errorInfo: any) {
 console.error("ErrorBoundary caught an error", error, errorInfo);
 }

 render() {
 const { hasError, errorInfo } = this.state;
 if (hasError) {
 let displayMessage ="Something went wrong.";
 try {
 const parsed = JSON.parse(errorInfo ||"");
 if (parsed.error && parsed.error.includes("permission-denied")) {
 displayMessage ="You don't have permission to view this data. Please ensure you are logged in with the correct account.";
 }
 } catch (e) {
 // Not a JSON error
 }

 return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4 text-center">
 <div className="bg-white p-6 rounded-2xl shadow-xl max-w-2xl border border-red-100 text-left">
 <h2 className="text-2xl font-serif font-medium text-red-600 mb-4 flex items-center gap-2">
 <LogOut className="rotate-180"/> Oops! Something went wrong
 </h2>
 <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 mb-6 font-mono text-sm overflow-auto max-h-60">
 <p className="text-red-700 font-bold mb-2">{ errorInfo }</p>
 </div>
 <p className="text-gray-800 mb-6">{ displayMessage } The application encountered an unexpected error. This often happens due to missing data or a connection issue.</p>
 <Button onClick={() => window.location.href ='/'} className="bg-red-600 hover:bg-red-700 w-full">
 Try Restarting
 </Button>
 </div>
 </div>
 );
 }

 return this.props.children;
 }
}

const LoadingScreen = () => (
 <div className="flex flex-col items-center justify-center min-h-screen bg-white text-slate-900 transition-colors duration-500">
 <div className="relative">
 <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full animate-pulse"/>
 <Logo variant="mark" size="xl"className="mb-12 relative z-10 animate-float h-20 md:h-32"/>
 </div>
 <div className="w-64 h-1 bg-slate-100 rounded-full overflow-hidden relative z-10">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width:"100%"}}
 transition={{ duration: 1.5, repeat: Infinity, ease:"easeInOut"}}
 className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(37, 99, 235, 0.5)]"
 />
 </div>
 <motion.p 
 initial={{ opacity: 0 }}
 animate={{ opacity: [0.4, 1, 0.4] }}
 transition={{ duration: 2, repeat: Infinity }}
 className="mt-8 font-mono text-xs tracking-[0.5em] text-blue-600 uppercase"
 >
 SEEDDING THE FUTURE
 </motion.p>
 </div>
);

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
 <motion.div
 initial={{ opacity: 0, scale: 0.99, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 1.01, y: -10 }}
 transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
 >
 { children }
 </motion.div>
);

const ScrollToTop = () => {
 const { pathname, search } = useLocation();
 useEffect(() => {
 window.scrollTo(0, 0);
 }, [pathname, search]);
 return null;
};




const Navbar = ({ user, onLogout, tenantSchool, logoVariant }: { user: UserProfile | null, onLogout: () => void, tenantSchool?: School | null, logoVariant:'white'|'black'}) => {
 const [isOpen, setIsOpen] = useState(false);
 const navigate = useNavigate();
 const location = useLocation();
 const { scrollY } = useScroll();
 const [isScrolled, setIsScrolled] = useState(false);

 useEffect(() => {
 return scrollY.on('change', (latest) => {
 // Use a small buffer to prevent rapid toggling
 if (latest > 30 && !isScrolled) setIsScrolled(true);
 if (latest <= 10 && isScrolled) setIsScrolled(false);
 });
 }, [scrollY, isScrolled]);

 const navItems = [
 { name:'Features', path:'#features', icon: Info },
 { name:'Solutions', path:'#solutions', icon: Info },
 { name:'Pricing', path:'#pricing', icon: Info },
 { name:'About', path:'#about', icon: Info },
 ];
 const isActive = (path: string) => {
 if (path  === '/'&& location.pathname !=='/') return false;
 return location.pathname.startsWith(path);
 };

 const { theme } = useTheme();
 const isLandingPage = location.pathname  === '/';
 if (tenantSchool) return null;
 
 return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center w-full px-6 pt-6">
      <motion.nav 
        initial={ false }
        animate={{ 
          backgroundColor: isScrolled 
            ? "rgba(255, 255, 255, 0.9)" 
            : (isLandingPage ? "transparent" : "rgba(255, 255, 255, 0.5)"),
          borderColor: isScrolled 
            ? "rgba(226, 232, 240, 0.5)" 
            : (isLandingPage ? "transparent" : "rgba(255, 255, 255, 0.1)"),
          boxShadow: isScrolled ?"0 20px 40px -10px rgba(0, 0, 0, 0.05)":"none",
          width: isScrolled ?"90%":"100%",
          maxWidth:"1280px",
          height: isScrolled ?"72px":"80px",
          borderRadius: isScrolled ?"24px":"0px",
          paddingLeft: isScrolled ?"2rem":"1.5rem",
          paddingRight: isScrolled ?"2rem":"1.5rem",
        }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={ cn(
          "backdrop-blur-xl flex items-center justify-between border transition-all duration-300",
          isScrolled ? "text-slate-900" : (isLandingPage ? "text-white" : "text-slate-900")
        )}
      >
 <Link to="/"className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
  <Logo 
  variant={isScrolled ? "black" : (isLandingPage ? "white" : "black")}
  size="sm"
  className="h-8 md:h-10"
  customLogo={ tenantSchool?.logoUrl } 
  />
 </Link>


  <div className="hidden md:flex items-center gap-10">
    {!isLandingPage && navItems.map(item => (
      <a 
        key={ item.name } 
        href={ item.path } 
        className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 transition-colors font-space"
      >
        { item.name }
      </a>
    ))}
    
    <div className={cn("flex items-center gap-6", !isLandingPage && "ml-6 border-l border-slate-100 pl-6")}>
      { user ? (
        <button 
          onClick={ onLogout } 
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-all font-space"
        >
          <LogOut size={ 16 } /> Logout
        </button>
      ) : (
        <>
          <Link 
            to="/super-admin" 
            className={cn(
              "text-[11px] font-bold uppercase tracking-[0.2em] transition-colors font-space",
              isScrolled ? "text-slate-950 hover:text-blue-600" : (isLandingPage ? "text-white hover:text-blue-400" : "text-slate-950 hover:text-blue-600")
            )}
          >
            System Login
          </Link>
          <a href="#onboarding" className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 font-space">
            Onboard School
          </a>
        </>
      )}
    </div>
  </div>

 {/* Mobile Menu Toggle */}
 <div className="md:hidden flex items-center gap-3">
 <button 
 onClick={() => setIsOpen(!isOpen)} 
 className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
 >
 { isOpen ? <X size={ 24 } /> : <Menu size={ 24 } />}
 </button>
 </div>

 {/* Mobile Nav Dropdown */}
 <AnimatePresence>
 { isOpen && (
 <motion.div
 initial={{ opacity: 0, y: -20, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -20, scale: 0.95 }}
 className="absolute top-24 left-4 right-4 md:hidden bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-black/5 overflow-hidden p-6 z-[60]"
 >
 <div className="space-y-3">
 { navItems.map(item => (
 <Link
 key={ item.name }
 to={ item.path }
 onClick={() => setIsOpen(false)}
 className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 text-sm font-semibold transition-all group"
 >
 <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
 <item.icon size={ 20 } className="text-blue-600"/>
 </div>
 <span className="text-gray-800">{ item.name }</span>
 </Link>
 ))}
 { user ? (
 <>
 <Link
 to="/dashboard"
 onClick={() => setIsOpen(false)}
 className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 text-sm font-semibold transition-all group"
 >
 <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
 <LayoutDashboard size={ 20 } className="text-emerald-600"/>
 </div>
 <span className="text-gray-800">Dashboard</span>
 </Link>
 <button 
 onClick={() => { onLogout(); setIsOpen(false); }}
 className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 text-sm font-semibold transition-all group"
 >
 <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
 <LogOut size={ 20 } className="text-red-600"/>
 </div>
 <span className="text-red-600">Logout</span>
 </button>
 </>
 ) : (
 <a
 href="#onboard"
 onClick={() => setIsOpen(false)}
 className="w-full h-14 mt-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition-transform"
 >
 Get Started
 </a>
 )}
 </div>
 </motion.div>
 )}
  </AnimatePresence>
      </motion.nav>
    </div>
  );
};

const SchoolLoginPage = ({ onLogin, tenantSchool, subdomainNotFound, logoVariant }: { onLogin: (user: UserProfile) => void, tenantSchool: School | null, subdomainNotFound: boolean, logoVariant: 'white' | 'black' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const step = (searchParams.get('step') as 'role' | 'credentials') || 'role';
  
  const setStep = (newStep: string) => {
    setSearchParams(prev => {
      prev.set('step', newStep);
      return prev;
    });
  };

  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !selectedRole || !tenantSchool) return;

    setLoading(true);
    setError(null);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const result = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        
        // Super Admins can log in anywhere
        const isSuperAdmin = userData.role === 'super_admin' || SUPER_ADMIN_EMAILS.includes(trimmedEmail);
        const isCorrectSchool = userData.schoolId === tenantSchool.id;
        const isCorrectRole = userData.role === selectedRole;

        // Platform Admins (Super Admins) bypass school/role checks
        if (isSuperAdmin || (isCorrectSchool && isCorrectRole)) {
          // Check for forced password change
          if (userData.forcePasswordChange) {
            setShowPasswordChange(userData);
            setLoading(false);
            return;
          }

          // Log login activity
          await logAuditAction(
            'login',
            `User logged in to school: ${tenantSchool.name}${isSuperAdmin ? ' (Platform Admin)' : ''}`,
            user.uid,
            'user'
          );
          onLogin(userData);
          navigate('/dashboard');
        } else {
          setError(`Access denied. Your account is not authorized for this school or role.`);
          await signOut(auth);
        }
      } else {
        setError("User profile not found. Please contact support.");
        await signOut(auth);
      }
    } catch (err: any) {
      console.error("Auth failed:", err);
      let message = "Authentication failed.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        message = "Invalid email or password.";
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const roles: { id: UserRole; label: string; icon: any }[] = [
    { id: 'school_admin', label: 'School Admin', icon: Shield },
    { id: 'teacher', label: 'Teacher', icon: BookOpen },
    { id: 'student', label: 'Student', icon: User },
    { id: 'parent', label: 'Parent', icon: Users },
  ];

  if (!tenantSchool) return null;

  return (
    <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center p-6 relative overflow-hidden font-inter selection:bg-blue-500/30">
      {/* Background Luminous Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [-50, 50, -50],
            y: [-50, 50, -50]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-[#1E40AF] rounded-full blur-[160px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [50, -50, 50],
            y: [50, -50, 50]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-20%] right-[-10%] w-[90%] h-[90%] bg-[#3B82F6] rounded-full blur-[180px]" 
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.05)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[#050811]/40 backdrop-blur-[2px]" />
      </div>

      <AnimatePresence>
        {showPasswordChange && (
          <PasswordChangeModal 
            user={showPasswordChange} 
            onSuccess={() => {
              onLogin({ ...showPasswordChange, forcePasswordChange: false });
              navigate('/dashboard');
            }} 
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg bg-white/5 backdrop-blur-3xl rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] border border-white/10 p-10 md:p-14 relative z-10 overflow-hidden"
      >
        {/* Top Glow Edge */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        
        <AnimatePresence mode="wait">
          {step === 'role' ? (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col items-center"
            >
              <div className="mb-10 text-center w-full">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-8 relative inline-block"
                >
                  <div className="absolute inset-0 bg-blue-600/20 blur-2xl rounded-full" />
                  {tenantSchool.logoUrl ? (
                    <img src={tenantSchool.logoUrl} alt={tenantSchool.name} className="h-24 w-auto relative z-10 object-contain drop-shadow-2xl" />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white relative z-10 shadow-2xl">
                      <SchoolIcon size={40} strokeWidth={1.5} />
                    </div>
                  )}
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-3 font-space tracking-tight">Select your role</h2>
                <p className="text-slate-400 text-sm font-medium">To continue to <span className="text-blue-400 font-bold">{tenantSchool.name}</span></p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full mb-10">
                {roles.map((role) => (
                  <motion.button
                    key={role.id}
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      "group h-24 flex flex-col items-center justify-center gap-2 px-4 rounded-3xl border transition-all duration-300",
                      selectedRole === role.id 
                        ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)]" 
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                    )}
                  >
                    <role.icon size={24} className={cn("transition-colors", selectedRole === role.id ? "text-white" : "text-slate-500 group-hover:text-blue-400")} strokeWidth={1.5} />
                    <span className="font-bold text-xs uppercase tracking-widest">{role.label}</span>
                  </motion.button>
                ))}
              </div>

              <div className="flex gap-4 w-full">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 h-16 rounded-2xl border border-white/10 bg-white/5 text-white font-bold hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center"
                >
                  Home
                </button>
                <button
                  disabled={!selectedRole}
                  onClick={() => setStep('credentials')}
                  className="flex-1 h-16 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-blue-600/20"
                >
                  Continue
                </button>
              </div>

              <p className="mt-10 text-[10px] text-slate-600 font-black text-center leading-relaxed uppercase tracking-[0.4em]">
                Secure Portal <span className="text-white/20 mx-2">|</span> SEEDD
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="credentials-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <div className="mb-12 text-center">
                <motion.button 
                  onClick={() => setStep('role')}
                  whileHover={{ x: -4 }}
                  className="mb-8 text-blue-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mx-auto hover:text-blue-300 transition-colors"
                >
                  <ArrowLeft size={14} /> Change Role
                </motion.button>
                
                 {tenantSchool.logoUrl ? (
                  <img src={tenantSchool.logoUrl} alt={tenantSchool.name} className="h-16 w-auto mb-6 mx-auto object-contain" />
                ) : (
                  <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 mx-auto mb-6 border border-blue-500/20">
                    <SchoolIcon size={32} strokeWidth={1.5} />
                  </div>
                )}
                <h2 className="text-3xl font-bold text-white mb-2 font-space tracking-tight">Welcome Back</h2>
                <p className="text-slate-400 font-medium text-sm">
                  Accessing as <span className="text-blue-400 font-bold uppercase tracking-wider">{selectedRole.replace('_', ' ')}</span>
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-3"
                >
                  <AlertTriangle size={16} />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-5">
                <div className="space-y-2">
                  <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} strokeWidth={1.5} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full h-16 pl-16 pr-6 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} strokeWidth={1.5} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-16 pl-16 pr-16 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-2xl shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center transition-all mt-8 text-lg"
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : "Sign In Account"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Decorative Brand Text */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-30 pointer-events-none">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-white" />
        <span className="text-[10px] font-black text-white uppercase tracking-[0.8em]">SEEDD ECOSYSTEM</span>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-white" />
      </div>
    </div>
);
};
const LoginPage = ({ onLogin, tenantSchool, subdomainNotFound, logoVariant }: { onLogin: (user: UserProfile) => void, tenantSchool: School | null, subdomainNotFound: boolean, logoVariant:'white'|'black'}) => {
  if (tenantSchool && !subdomainNotFound) {
    return <SchoolLoginPage onLogin={ onLogin } tenantSchool={ tenantSchool } subdomainNotFound={ subdomainNotFound } logoVariant={ logoVariant } />;
  }
 const [searchParams, setSearchParams] = useSearchParams();
 const step = (searchParams.get('step') as'school'|'role'|'credentials') ||'school';
 const isSignUp = searchParams.get('signup')  === 'true';
 
 const setStepAndSignUp = (newStep: string, signUp: boolean) => {
 setSearchParams(prev => {
 prev.set('step', newStep);
 if (signUp) prev.set('signup','true');
 else prev.delete('signup');
 return prev;
 });
 };

 useEffect(() => {
 const roleParam = searchParams.get('role');
 const isSuperAdminPath = window.location.pathname  === '/super-admin';
 
 if ((roleParam  === 'super_admin'|| isSuperAdminPath) && step  === 'school') {
 setSelectedRole('super_admin');
 setStep('credentials');
 }
 }, [searchParams, step]);

 const setStep = (newStep: string) => setStepAndSignUp(newStep, isSignUp);
 const setIsSignUp = (val: boolean) => setStepAndSignUp(step, val);

 const [schools, setSchools] = useState<School[]>([]);
 const [selectedSchool, setSelectedSchool] = useState<string>('');
 const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
 const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
 const [selectedRole, setSelectedRole] = useState<UserRole |''>('');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState<string | null>(null);
 const navigate = useNavigate();

 useEffect(() => {
 const fetchSchools = async () => {
 const q = query(collection(db,'schools'));
 const snap = await getDocs(q);
 const fetchedSchools = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School));
 setSchools(fetchedSchools);

 if (tenantSchool) {
 setSelectedSchool(tenantSchool.id);
 if (step  === 'school'&& !searchParams.has('step')) {
 setStep('role');
 }
 }
 };
 fetchSchools();
 }, [step, searchParams, tenantSchool]);

 const filteredSchools = schools.filter(s => s.name.toLowerCase().includes(schoolSearchQuery.toLowerCase()));

 const handleEmailAuth = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!email || !password || (!isSignUp && (!selectedSchool && selectedRole !=='super_admin')) || !selectedRole) return;

 setLoading(true);
 setError(null);
 try {
 let user;
 const trimmedEmail = email.trim();
 if (isSignUp) {
 // Only allow super admin sign up for the specific email
 if (!SUPER_ADMIN_EMAILS.includes(trimmedEmail.toLowerCase())) {
 throw new Error("Only the platform owner can use the one-time setup.");
 }
 const result = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
 user = result.user;

 const superAdminProfile: UserProfile = {
 uid: user.uid,
 email: user.email ||'',
 firstName:'Platform',
 lastName:'Owner',
 role:'super_admin',
 createdAt: new Date().toISOString()
 };
 await setDoc(doc(db,'users', user.uid), superAdminProfile);
 onLogin(superAdminProfile);
 navigate('/dashboard');
 return;
 } else {
 const result = await signInWithEmailAndPassword(auth, trimmedEmail, password);
 user = result.user;
 }
 
 const userDoc = await getDoc(doc(db,'users', user.uid));
 
 if (userDoc.exists()) {
 const userData = userDoc.data() as UserProfile;
 
 // Verify school and role match
 const isSuperAdminMatch = (userData.role  === 'super_admin' || SUPER_ADMIN_EMAILS.includes(trimmedEmail.toLowerCase())) && selectedRole  === 'super_admin';
 const isSchoolRoleMatch = userData.schoolId === selectedSchool && userData.role === selectedRole;

 if (isSuperAdminMatch || isSchoolRoleMatch) {
 onLogin(userData);
 navigate('/dashboard');
 } else {
 setError("Invalid credentials for the selected school or role.");
 await signOut(auth);
 }
 } else {
 setError("User profile not found. Please contact your school administrator.");
 await signOut(auth);
 }
 } catch (err: any) {
 console.error("Auth failed:", err);
 if (err.code  === 'auth/invalid-credential') {
 setError("Invalid email or password. Please check your credentials and try again.");
 } else {
 setError(err.message ||"Authentication failed. Please check your credentials.");
 }
 } finally {
 setLoading(false);
 }
 };

 const handleGoogleLogin = async () => {
 setLoading(true);
 setError(null);
 try {
 // Check if we are on mobile and NOT in an iframe
 const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
 const isIframe = window.self !== window.top;

 if (isMobile && !isIframe) {
 // Use redirect for mobile browsers outside of iframes (more reliable)
 await signInWithRedirect(auth, googleProvider);
 return;
 }

 // Default to popup
 const result = await signInWithPopup(auth, googleProvider);
 const user = result.user;
 
 const userDoc = await getDoc(doc(db,'users', user.uid));
 
 if (userDoc.exists()) {
 onLogin(userDoc.data() as UserProfile);
 navigate('/dashboard');
 } else {
 const superAdminWhitelist = ['kreativekubesolutions@gmail.com', 'seedd.ng@gmail.com', 'abahjohnakor@gmail.com'];
          if (superAdminWhitelist.includes(user.email || '')) {
 const superAdminProfile: UserProfile = {
 uid: user.uid,
 email: user.email ||'',
 firstName: (user.displayName ||'Platform Owner').split('')[0],
 lastName: (user.displayName ||'Platform Owner').split('').slice(1).join('') ||'',
 role:'super_admin',
 createdAt: new Date().toISOString()
 };
 await setDoc(doc(db,'users', user.uid), superAdminProfile);
 onLogin(superAdminProfile);
 navigate('/dashboard');
 } else {
 navigate('/onboarding');
 }
 }
 } catch (err: any) {
 console.error("Google login failed:", err);
 if (err.code  === 'auth/popup-blocked') {
 setError("The sign-in popup was blocked by your browser. Please allow popups or try again.");
 } else {
 setError(err.message ||"Google login failed.");
 }
 } finally {
 setLoading(false);
 }
 };

 const roles: { id: UserRole; label: string }[] = [
 { id:'school_admin', label:'School Admin'},
 { id:'teacher', label:'Teacher'},
 { id:'student', label:'Student'},
 { id:'parent', label:'Parent'},
 ];

  if (selectedRole === 'super_admin' && !isSignUp) {
    return (
      <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center p-6 relative overflow-hidden font-inter selection:bg-blue-500/30">
        {/* Background Luminous Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.15, 0.25, 0.15],
              x: [-50, 50, -50],
              y: [-50, 50, -50]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-[#1E40AF] rounded-full blur-[160px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.2, 0.1],
              x: [50, -50, 50],
              y: [50, -50, 50]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[-20%] right-[-10%] w-[90%] h-[90%] bg-[#3B82F6] rounded-full blur-[180px]" 
          />
          <div className="absolute inset-0 bg-[#050811]/40 backdrop-blur-[2px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-white/5 backdrop-blur-3xl rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] border border-white/10 p-10 md:p-14 relative z-10 overflow-hidden"
        >
          {/* Top Glow Edge */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Shield className="text-blue-400" size={32} />
            </div>
            
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2 font-space">System Command</h1>
            <p className="text-blue-400 font-bold text-[10px] tracking-[0.4em] uppercase">SEEDD Super Admin Portal</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-3"
            >
              <AlertTriangle size={16} />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div className="space-y-2">
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} strokeWidth={1.5} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin identifier"
                  className="w-full h-16 pl-16 pr-6 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} strokeWidth={1.5} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Auth Token"
                  className="w-full h-16 pl-16 pr-6 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium tracking-widest"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-2xl shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center transition-all text-lg mt-8"
            >
              {loading ? "Decrypting..." : "Access System Core"}
            </button>

            <div className="relative py-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.4em]"><span className="bg-[#050811] px-6 text-slate-500">Secure SSO</span></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-16 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 group"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
              <span className="font-bold text-xs uppercase tracking-widest">Sign in with Google</span>
            </button>
          </form>

          <div className="mt-12 text-center">
            <button
              onClick={() => {
                setSelectedRole('');
                setStep('school');
                setSearchParams({});
              }}
              className="text-[10px] font-black text-slate-500 hover:text-blue-400 uppercase tracking-[0.4em] transition-colors"
            >
              Return to Public Grid
            </button>
          </div>
        </motion.div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center p-6 relative overflow-hidden font-inter selection:bg-blue-500/30">
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-lg bg-white/5 backdrop-blur-3xl rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] border border-white/10 p-10 md:p-14 relative z-10 overflow-hidden"
      {/* Top Glow Edge */}
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      
      <div className="text-center mb-10">
        {tenantSchool ? (
          <div className="space-y-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative inline-block"
            >
              <div className="absolute inset-0 bg-blue-600/20 blur-2xl rounded-full" />
              {tenantSchool.logoUrl ? (
                <img src={tenantSchool.logoUrl} alt={tenantSchool.name} className="h-20 w-auto relative z-10 object-contain drop-shadow-2xl mx-auto" />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white relative z-10 shadow-2xl mx-auto">
                  <SchoolIcon size={40} strokeWidth={1.5} />
                </div>
              )}
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white font-space tracking-tight">{tenantSchool.name}</h1>
              <p className="text-blue-400 font-bold text-[10px] tracking-[0.4em] uppercase mt-2">Verified Institution</p>
            </div>
          </div>
        ) : (
          <>
            <Logo variant="white" size="lg" className="mx-auto mb-8 h-12 md:h-16 relative z-10" />
            <h2 className="text-3xl font-bold text-white tracking-tight font-space">{isSignUp ? 'Platform Setup' : 'Login Portal'}</h2>
            <p className="text-slate-400 text-sm mt-3 font-medium">Access your educational ecosystem</p>
          </>
        )}
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-3"
        >
          <AlertTriangle size={16} />
          {error}
        </motion.div>
      )}

      {subdomainNotFound ? (
        <div className="text-center py-8 space-y-6">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xl font-bold text-white font-space">School Not Found</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            We couldn't find a school matching this address. Please check the URL and try again.
          </p>
          <div className="pt-4">
            <button onClick={() => navigate('/')} className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all active:scale-[0.98]">
              Return Home
            </button>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {step === 'school' && !isSignUp && (
            <motion.div
              key="school"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Identity Provider</p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSchoolDropdownOpen(!isSchoolDropdownOpen)}
                    className="w-full h-16 px-6 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-medium text-white flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <SchoolIcon size={20} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <span className={selectedSchool ? "text-white" : "text-slate-500"}>
                        {selectedSchool ? schools.find(s => s.id === selectedSchool)?.name : "Choose your school"}
                      </span>
                    </div>
                    <ChevronDown size={18} className={cn("text-slate-500 transition-transform", isSchoolDropdownOpen ? "rotate-180" : "")} />
                  </button>

                  <AnimatePresence>
                    {isSchoolDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-3 bg-[#0A0F1D] rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl"
                      >
                        <div className="p-4 border-b border-white/5 sticky top-0 bg-[#0A0F1D]/80 backdrop-blur-md">
                          <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Search schools..."
                              value={schoolSearchQuery}
                              onChange={(e) => setSchoolSearchQuery(e.target.value)}
                              className="w-full pl-12 pr-4 h-12 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                            />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2">
                          {filteredSchools.length === 0 ? (
                            <div className="p-8 text-center text-sm text-slate-500">No schools found</div>
                          ) : (
                            filteredSchools.map(school => (
                              <button
                                key={school.id}
                                type="button"
                                onClick={() => {
                                  const hostname = window.location.hostname;
                                  if (school.slug && (hostname === 'seedify.name.ng' || hostname === 'www.seedify.name.ng')) {
                                    window.location.href = `${window.location.protocol}//${school.slug}.seedify.name.ng/login`;
                                    return;
                                  }
                                  setSelectedSchool(school.id);
                                  setIsSchoolDropdownOpen(false);
                                  setSchoolSearchQuery('');
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-4 rounded-xl text-sm flex items-center justify-between transition-all group",
                                  selectedSchool === school.id ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-2 h-2 rounded-full", selectedSchool === school.id ? "bg-blue-400 animate-pulse" : "bg-slate-700")} />
                                  <span className="font-bold tracking-tight">{school.name}</span>
                                </div>
                                {selectedSchool === school.id && <Check size={16} className="text-blue-400" />}
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <button 
                onClick={() => setStep('role')}
                disabled={!selectedSchool}
                className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-2xl shadow-blue-600/20 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-lg mt-4"
              >
                Continue to Roles
              </button>
            </motion.div>
          )}

          {step === 'role' && (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-2 gap-4">
                {roles.map(r => (
                  <motion.button
                    key={r.id}
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRole(r.id)}
                    className={cn(
                      "h-24 p-4 rounded-3xl border text-xs font-black uppercase tracking-widest transition-all text-center flex flex-col items-center justify-center gap-3",
                      selectedRole === r.id 
                        ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)]" 
                        : "border-white/10 bg-white/5 text-slate-500 hover:border-white/20"
                    )}
                  >
                    <span className="text-sm font-space">{r.label}</span>
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setStep('school')}
                  className="flex-1 h-16 rounded-2xl border border-white/10 bg-white/5 text-white font-bold hover:bg-white/10 transition-all active:scale-[0.98]"
                >
                  Back
                </button>
                <button 
                  onClick={() => setStep('credentials')}
                  disabled={!selectedRole}
                  className="flex-[2] h-16 bg-blue-600 text-white rounded-2xl font-bold shadow-2xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-[0.98] disabled:opacity-30"
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {(step === 'credentials' || isSignUp) && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <form onSubmit={handleEmailAuth} className="space-y-5">
                <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} strokeWidth={1.5} />
                  <input 
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-16 pl-16 pr-6 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all font-medium"
                  />
                </div>
                
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} strokeWidth={1.5} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-16 pl-16 pr-16 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {!isSignUp && (
                  <div className="flex justify-end px-1">
                    <button 
                      type="button"
                      onClick={async () => {
                        if (!email) {
                          setError("Please enter your email address first.");
                          return;
                        }
                        try {
                          setLoading(true);
                          await sendPasswordResetEmail(auth, email.trim());
                          setError(null);
                          setSuccess(`Password reset email sent to ${email}`);
                          setTimeout(() => setSuccess(null), 5000);
                        } catch (err: any) {
                          setError(err.message || "Failed to send password reset email.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                    >
                      Reset Security Token
                    </button>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setStep('role')}
                    className="flex-1 h-16 rounded-2xl border border-white/10 bg-white/5 text-white font-bold hover:bg-white/10 transition-all active:scale-[0.98]"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-[2] h-16 bg-blue-600 text-white rounded-2xl font-bold shadow-2xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? (isSignUp ? 'Setting up...' : 'Verifying...') : (isSignUp ? 'Initialize' : 'Sign In')}
                  </button>
                </div>
              </form>

              <div className="relative py-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.4em]"><span className="bg-[#050811] px-6 text-slate-500">SSO Logic</span></div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-16 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 group"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                <span className="font-bold text-xs uppercase tracking-widest">Connect Identity</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className="mt-12 text-center flex flex-col gap-4">
        {!tenantSchool && (
          <button
            onClick={() => {
              setSelectedRole('super_admin');
              setSelectedSchool('');
              setStepAndSignUp('credentials', false);
              setError(null);
            }}
            className="text-[10px] font-black text-slate-500 hover:text-blue-400 uppercase tracking-[0.4em] transition-all"
          >
            Platform Administrator Access
          </button>
        )}
        <p className="text-[9px] text-slate-600 font-medium leading-relaxed max-w-[200px] mx-auto uppercase tracking-wider">
          By accessing SEEDD, you agree to our terms of digital engagement.
        </p>
      </div>
 </div>
 );
};

// --- Main App ---

export default function App() {
 const [user, setUser] = useState<UserProfile | null>(null);
 const [loading, setLoading] = useState(true);
 const location = useLocation();
 const navigate = useNavigate();
 const isLandingPage = location.pathname  === '/';
 const logoVariant ='black';

 useEffect(() => {
 let unsubscribeProfile: (() => void) | null = null;

 // Handle Google Redirect Result
 const checkRedirect = async () => {
 try {
 const result = await getRedirectResult(auth);
 if (result) {
 setLoading(true);
 // The onAuthStateChanged listener will handle the profile fetching and state update
 // We just need to ensure we navigate if they land on a page that doesn't auto-redirect
 if (window.location.pathname  === '/login'|| window.location.pathname  === '/') {
 // Wait a bit for the profile to be fetched by onAuthStateChanged
 setTimeout(() => {
 navigate('/dashboard');
 }, 1500);
 }
 }
 } catch (err: any) {
 console.error("Redirect result error:", err);
 }
 };
 checkRedirect();

 const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
 if (firebaseUser) {
 // Use onSnapshot for real-time profile updates
 unsubscribeProfile = onSnapshot(doc(db,'users', firebaseUser.uid), async (userDoc) => {
 if (userDoc.exists()) {
 let userData = userDoc.data() as UserProfile;
 // Ensure platform owner always has super_admin role
 if ((firebaseUser.email === 'kreativekubesolutions@gmail.com' || firebaseUser.email === 'seedd.ng@gmail.com' || firebaseUser.email === 'abahjohnakor@gmail.com') && userData.role !=='super_admin') {
 userData.role ='super_admin';
 await updateDoc(doc(db,'users', firebaseUser.uid), { role:'super_admin'});
 }
 setUser(userData);
 } else {
 // User exists in Auth but not in Firestore (incomplete onboarding)
 // Check if this is the platform owner
 if (firebaseUser.email === 'kreativekubesolutions@gmail.com' || firebaseUser.email === 'seedd.ng@gmail.com' || firebaseUser.email === 'abahjohnakor@gmail.com') {
 const nameParts = (firebaseUser.displayName ||'Platform Owner').split('');
 const superAdminProfile: UserProfile = {
 uid: firebaseUser.uid,
 email: firebaseUser.email ||'',
 firstName: nameParts[0],
 lastName: nameParts.slice(1).join('') ||'',
 role:'super_admin',
 createdAt: new Date().toISOString()
 };
 await setDoc(doc(db,'users', firebaseUser.uid), superAdminProfile);
 setUser(superAdminProfile);
 } else {
 const nameParts = (firebaseUser.displayName ||'').split('');
 setUser({ 
 uid: firebaseUser.uid, 
 email: firebaseUser.email ||'', 
 firstName: nameParts[0] ||'', 
 lastName: nameParts.slice(1).join('') ||'', 
 role:'student'
 } as UserProfile);
 }
 }
 setLoading(false);
 });
 } else {
 if (unsubscribeProfile) unsubscribeProfile();
 setUser(null);
 setLoading(false);
 }
 });

 return () => {
 unsubscribeAuth();
 if (unsubscribeProfile) unsubscribeProfile();
 };
 }, []);

 const handleLogout = async () => {
 await signOut(auth);
 setUser(null);
 };

 useEffect(() => {
 if (user) {
 window.scrollTo(0, 0);
 }
 }, [user]);

 const [tenantSchool, setTenantSchool] = useState<School | null>(null);
 const [subdomainNotFound, setSubdomainNotFound] = useState(false);

 useEffect(() => {
  const fetchTenantSchool = async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const schoolIdParam = searchParams.get('school');
 const hostname = window.location.hostname;
 const parts = hostname.split('.');
 let slug = null;
 
 const mainDomains = ['seedify.name.ng','seed-app.vercel.app','seed-app.netlify.app'];
 const isMainDomain = mainDomains.includes(hostname) || hostname  === 'localhost'|| hostname  === '127.0.0.1'|| hostname  === 'www.seedify.name.ng';
 
      // 1. Try to fetch by school ID from query param
      if (schoolIdParam) {
        try {
          const docRef = doc(db, 'schools', schoolIdParam);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setTenantSchool({ id: snap.id, ...snap.data() } as School);
            setSubdomainNotFound(false);
            return;
          }
        } catch (error) {
          console.error("Error fetching school by ID:", error);
        }
      }

      // 2. Try to fetch by subdomain slug
      if (!isMainDomain) {
        if (hostname.endsWith('.seedify.name.ng')) {
          slug = parts[0];
        } else if (parts.length >= 3 && parts[0] !== 'www') {
          slug = parts[0];
        } else if (parts.length === 2 && parts[1] === 'localhost') {
          slug = parts[0];
        }
      }

      if (slug) {
        try {
          const q = query(collection(db, 'schools'), where('slug', '==', slug));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const schoolData = { id: snap.docs[0].id, ...snap.docs[0].data() } as School;
            setTenantSchool(schoolData);
            setSubdomainNotFound(false);
          } else {
            setSubdomainNotFound(true);
          }
        } catch (error) {
          console.error("Wildcard Debug - Error fetching tenant school:", error);
        }
      } else {
        setTenantSchool(null);
        setSubdomainNotFound(false);
      }
 };
 fetchTenantSchool();
 }, [window.location.hostname, window.location.search]);

 if (loading) return <LoadingScreen />;

 const isDashboardView = location.pathname.startsWith('/dashboard');

  return (
  <ErrorBoundary>
  <div className="min-h-screen flex flex-col font-sans text-[#1A1A1A] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50">
  <ScrollToTop />
  {user?.forcePasswordChange && (
    <PasswordChangeModal 
      user={user} 
      onSuccess={() => setUser({ ...user, forcePasswordChange: false })} 
    />
  )}
  {!isDashboardView && !tenantSchool && <Navbar user={ user } onLogout={ handleLogout } tenantSchool={ tenantSchool } logoVariant={ logoVariant } />}
 <main className={ cn("flex-grow", isDashboardView &&"pt-0 overflow-hidden")}>
 <AnimatePresence mode="wait">
 <Routes location={ location } key={ location.pathname }>
 <Route path="/" element={ tenantSchool ? <Navigate to="/login" /> : <PageWrapper><LandingPage /></PageWrapper> } />
 <Route path="/login" element={ user ? <Navigate to="/dashboard" /> : <PageWrapper><LoginPage onLogin={ setUser } tenantSchool={ tenantSchool } subdomainNotFound={ subdomainNotFound } logoVariant={ logoVariant } /></PageWrapper> } />
 <Route path="/super-admin"element={ user ? <Navigate to="/dashboard"/> : <PageWrapper><LoginPage onLogin={ setUser } tenantSchool={ tenantSchool } subdomainNotFound={ subdomainNotFound } logoVariant={ logoVariant } /></PageWrapper>} />
 <Route path="/dashboard/*"element={ user?.schoolId || user?.role  === 'super_admin'? <PageWrapper><DashboardRouter user={ user } onLogout={ handleLogout } /></PageWrapper> : <Navigate to="/onboarding"/>} />
 <Route path="/announcements"element={ user ? <PageWrapper><AnnouncementsPage user={ user } /></PageWrapper> : <Navigate to="/login"/>} />
 <Route path="/onboarding"element={ user ? <PageWrapper><OnboardingPage user={ user } onComplete={ setUser } /></PageWrapper> : <Navigate to="/login"/>} />
 <Route path="/profile"element={ user ? <PageWrapper><UserProfileComponent user={ user } onUpdate={ setUser } /></PageWrapper> : <Navigate to="/login"/>} />
 <Route path="*"element={<Navigate to="/"/>} />
 </Routes>
 </AnimatePresence>
 </main>
 {!isDashboardView && (
 <footer className="bg-white border-t border-slate-200 py-12 text-center transition-colors">
 <div className="max-w-7xl mx-auto px-6">
 <Logo variant={ logoVariant } size="sm"className="h-8 mx-auto mb-6 opacity-80"/>
 <p className="text-sm font-bold text-slate-500 tracking-widest uppercase mb-2">&copy; 2026 SEEDD Smart Ecosystem. All rights reserved.</p>
 <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed">The premier multi-tenant infrastructure designed to digitize educational institutions at scale.</p>
 </div>
 </footer>
 )}
 </div>
 </ErrorBoundary>
 );
}

// --- Dashboard Router ---

const DashboardRouter = ({ user, onLogout }: { user: UserProfile, onLogout: () => void }) => {
 const [school, setSchool] = useState<School | null>(null);

 useEffect(() => {
 if (user.schoolId) {
 getDoc(doc(db,'schools', user.schoolId)).then(snap => {
 if (snap.exists()) {
 setSchool({ id: snap.id, ...snap.data() } as School);
 }
 });
 }
 }, [user.schoolId]);

 if (user.role  === 'school_admin') {
 return <SchoolAdminDashboard user={ user } onLogout={ onLogout } />;
 }

 if (user.role  === 'super_admin') {
 return (
 <Routes>
 <Route index element={<SuperAdminDashboard user={ user } onLogout={ onLogout } />} />
 </Routes>
 );
 }

 return (
 <div className="max-w-7xl mx-auto px-4 pt-8 pb-8 min-h-screen">
 {/* School Branding Header */}
 <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-slate-200/50 shadow-2xl shadow-slate-200/20">
 <div className="flex items-center gap-4">
 { school?.logoUrl ? (
 <img src={ school.logoUrl } alt={ school.name } className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-white"referrerPolicy="no-referrer"/>
 ) : (
 <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-slate-900 font-bold text-xl shadow-lg border border-slate-300">
 { school?.name?.charAt(0) ||'S'}
 </div>
 )}
 <div className="min-w-0">
 <h2 className="text-xl font-bold text-slate-900 truncate">{ school?.name ||'School Dashboard'}</h2>
 <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.2em]">{ user.role.replace('_','')} Portal</p>
 </div>
 </div>
 <button onClick={ onLogout } className="flex items-center gap-3 text-sm font-bold text-red-500 hover:text-red-600 px-5 py-3 rounded-xl hover:bg-red-50 transition-all border border-red-500/10 md:w-auto w-full justify-center">
 <LogOut size={ 18 } /> Logout
 </button>
 </div>

 <div className="mb-12">
 <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 flex items-center gap-4 flex-wrap">
 Welcome, { user.firstName } <span className="text-4xl md:text-5xl animate-wave origin-bottom-right">👋</span>
 </h1>
 <p className="text-slate-500 mt-4 text-base md:text-lg font-medium max-w-2xl">
 Empowering your educational journey with data-driven intelligence and dynamic ecosystem management.
 </p>
 </div>
 
 <Routes>
 <Route index element={
 user.role  === 'teacher'? <TeacherDashboard user={ user } /> :
 user.role  === 'student'? <StudentDashboard user={ user } /> :
 <ParentDashboard user={ user } />
 } />
 </Routes>
 </div>
 );
};

const AnnouncementsPage = ({ user }: { user: UserProfile }) => {
 const [announcements, setAnnouncements] = useState<Announcement[]>([]);
 const [loading, setLoading] = useState(true);
 const [studentClassIds, setStudentClassIds] = useState<string[]>([]);

 useEffect(() => {
 if (user.role  === 'parent') {
 const studentIds = user.parentStudentIds || (user.parentStudentId ? [user.parentStudentId] : []);
 if (studentIds.length > 0) {
 const q = query(
 collection(db,'users'),
 where('schoolId','==', user.schoolId),
 where('studentId','in', studentIds)
 );
 getDocs(q).then(snap => {
 const ids = snap.docs.map(d => d.data().classId).filter(Boolean);
 setStudentClassIds(ids);
 });
 }
 }
 }, [user.role, user.parentStudentIds, user.parentStudentId, user.schoolId]);

 useEffect(() => {
 if (!user.schoolId) {
 setLoading(false);
 return;
 }
 const q = query(
 collection(db,'announcements'),
 where('schoolId','==', user.schoolId)
 );
 const unsub = onSnapshot(q, (snap) => {
 const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
 
 // Filter based on user's role and class
 const filtered = all.filter(a => {
 if (a.isSchoolWide) return true;
 if (user.role  === 'student'|| user.role  === 'teacher') {
 return a.classId === user.classId;
 }
 if (user.role  === 'parent') {
 return studentClassIds.includes(a.classId ||'');
 }
 if (user.role  === 'school_admin'|| user.role  === 'super_admin') {
 return true;
 }
 return false;
 });

 // Sort by date descending
 filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
 
 setAnnouncements(filtered);
 setLoading(false);
 });
 return () => unsub();
 }, [user.schoolId, user.classId, user.role, studentClassIds]);

 if (loading) return <LoadingScreen />;

 return (
 <div className="max-w-3xl mx-auto px-4 pt-32 pb-12 min-h-screen">
 <h1 className="text-3xl font-serif font-medium mb-8">Announcements</h1>
 <div className="space-y-6">
 { announcements.length === 0 ? (
 <div className="bg-white p-12 rounded-3xl border border-black/5 shadow-sm text-center">
 <p className="text-gray-800">No announcements yet.</p>
 </div>
 ) : (
 announcements.map(announcement => (
 <div key={ announcement.id } className="bg-white p-4 rounded-3xl border border-black/5 shadow-sm">
 <div className="flex justify-between items-start mb-2">
 <span className="text-[10px] uppercase font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
 { announcement.isSchoolWide ?'School-wide':'Class Notice'}
 </span>
 <span className="text-xs text-gray-800 font-medium">
 { new Date(announcement.createdAt).toLocaleDateString()}
 </span>
 </div>
 <h3 className="text-xl font-medium mb-2">{ announcement.title }</h3>
 <p className="text-gray-800 whitespace-pre-wrap">{ announcement.content }</p>
 </div>
 ))
 )}
 </div>
 </div>
 );
};

const OnboardingPage = ({ user, onComplete }: { user: UserProfile, onComplete: (user: UserProfile) => void }) => {
 const [schools, setSchools] = useState<School[]>([]);
 const [selectedSchool, setSelectedSchool] = useState<string>('');
 const [role, setRole] = useState<UserRole>('student');
 const [loading, setLoading] = useState(false);
 const navigate = useNavigate();

 useEffect(() => {
 const fetchSchools = async () => {
 const q = query(collection(db,'schools'));
 const snap = await getDocs(q);
 setSchools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
 };
 fetchSchools();
 }, []);

 const handleComplete = async () => {
 if (!role) return;
 if (role !=='super_admin'&& !selectedSchool) return;

 setLoading(true);
 try {
 const updatedUser: UserProfile = {
 ...user,
 role,
 schoolId: selectedSchool || undefined
 };
 await setDoc(doc(db,'users', user.uid), updatedUser);
 onComplete(updatedUser);
 navigate('/dashboard');
 } catch (error) {
 console.error("Onboarding failed:", error);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="max-w-md mx-auto px-4 pt-32 pb-20">
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-white p-4 rounded-2xl border border-black/5 shadow-xl"
 >
 <Logo variant="black" size="lg"className="mx-auto mb-4"/>
 <h2 className="text-3xl font-serif font-medium mb-2 text-center">Welcome to SEEDD</h2>
 <p className="text-gray-800 text-center mb-8">Select your role and school to get started.</p>
 
 <div className="space-y-6">
 <div>
 <label className="block text-sm font-medium mb-2">I am a...</label>
 <div className="grid grid-cols-2 gap-3">
 {['school_admin','teacher','student','parent'].map(r => (
 <button
 key={ r }
 onClick={() => setRole(r as UserRole)}
 className={ cn(
"p-3 rounded-xl border text-sm font-medium transition-all capitalize",
 role === r ?"bg-[#2563EB] text-slate-900 border-[#2563EB]":"border-black/10 hover:bg-gray-50"
 )}
 >
 { r.replace('_','')}
 </button>
 ))}
 </div>
 </div>

 { role !=='super_admin'&& (
 <div>
 <label className="block text-sm font-medium mb-2">Select School</label>
 <select
 value={ selectedSchool }
 onChange={ e => setSelectedSchool(e.target.value)}
 className="w-full p-4 rounded-xl border border-black/10 focus:border-[#2563EB] outline-none bg-gray-50"
 >
 <option value="">Choose a school</option>
 { schools.map(s => (
 <option key={ s.id } value={ s.id }>{ s.name }</option>
 ))}
 </select>
 { schools.length === 0 && <p className="text-xs text-red-500 mt-2">No schools found. Please contact the platform owner.</p>}
 </div>
 )}

 <button
 onClick={ handleComplete }
 disabled={ loading || (role !=='super_admin'&& !selectedSchool)}
 className="w-full bg-[#2563EB] text-slate-900 p-4 rounded-2xl font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 mt-4"
 >
 { loading ?'Setting up...':'Complete Setup'}
 </button>
 
 <p className="text-xs text-center text-gray-800">
 Wait! If you're the first admin, you'll need to be onboarded by the platform owner.
 </p>
 </div>
 </motion.div>
 </div>
 );
};
