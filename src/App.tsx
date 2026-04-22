import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { auth, db, onAuthStateChanged, doc, getDoc, signInWithPopup, signInWithRedirect, getRedirectResult, googleProvider, signOut, setDoc, updateDoc, collection, getDocs, query, where, onSnapshot, signInWithEmailAndPassword, handleFirestoreError, OperationType, createUserWithEmailAndPassword, sendPasswordResetEmail } from './firebase';
import { UserProfile, UserRole, School, Announcement } from './types';
import { Logo } from './components/Logo';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './components/ThemeProvider';
import { 
  LogIn, LogOut, LayoutDashboard, User, Users, BookOpen, Bell, Settings, CreditCard, Menu, X, Home, Sparkles, Info, Mail, Clock, CheckCircle2, CheckCircle, Eye, EyeOff, Search, ChevronDown, Check, School as SchoolIcon
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { cn } from './lib/utils';


// Dashboards
import { SuperAdminDashboard } from './components/dashboards/SuperAdminDashboard';
import { SchoolAdminDashboard } from './components/dashboards/SchoolAdminDashboard';
import { TeacherDashboard } from './components/dashboards/TeacherDashboard';
import { StudentDashboard } from './components/dashboards/StudentDashboard';
import { ParentDashboard } from './components/dashboards/ParentDashboard';
import { UserProfile as UserProfileComponent } from './components/UserProfile';
import { LandingPage } from './components/LandingPage';

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    return (
      <button
        className={`inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:pointer-events-none disabled:opacity-50 bg-[#2563EB] text-white hover:bg-blue-600 h-10 px-6 py-2 shadow-lg shadow-blue-500/20 active:scale-95 ${className}`}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-800 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-text font-medium text-gray-800 ${className}`}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

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
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(errorInfo || "");
        if (parsed.error && parsed.error.includes("permission-denied")) {
          displayMessage = "You don't have permission to view this data. Please ensure you are logged in with the correct account.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4 text-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-2xl border border-red-100 text-left">
            <h2 className="text-2xl font-serif font-medium text-red-600 mb-4 flex items-center gap-2">
              <LogOut className="rotate-180" /> Oops! Something went wrong
            </h2>
            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 mb-6 font-mono text-sm overflow-auto max-h-60">
              <p className="text-red-700 font-bold mb-2">{errorInfo}</p>
            </div>
            <p className="text-gray-800 mb-6">{displayMessage} The application encountered an unexpected error. This often happens due to missing data or a connection issue.</p>
            <Button onClick={() => window.location.href = '/'} className="bg-red-600 hover:bg-red-700 w-full">
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
  <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500">
    <div className="relative">
      <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 blur-[100px] rounded-full animate-pulse" />
      <Logo variant="mark" size="xl" className="mb-12 relative z-10 animate-float h-20 md:h-32" />
    </div>
    <div className="w-64 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative z-10">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)]"
      />
    </div>
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="mt-8 font-mono text-xs tracking-[0.5em] text-blue-600 dark:text-blue-400 uppercase"
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
    {children}
  </motion.div>
);

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
};



const Navbar = ({ user, onLogout, tenantSchool }: { user: UserProfile | null, onLogout: () => void, tenantSchool?: School | null }) => {
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
    { name: 'Home', path: '/', icon: Home },
    { name: 'About', path: '/about', icon: Info },
    { name: 'Contact', path: '/contact', icon: Mail },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const { theme } = useTheme();
  const isLandingPage = location.pathname === '/';
  
  // Decide logo variant
  const logoVariant = isLandingPage ? 'white' : (theme === 'dark' ? 'white' : 'black');

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
      <motion.nav 
        initial={false}
        animate={{ 
          backgroundColor: isLandingPage 
            ? (isScrolled ? "rgba(2, 6, 23, 0.9)" : "rgba(2, 6, 23, 0)") 
            : (theme === 'dark' ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)"),
          borderColor: isLandingPage
            ? (isScrolled ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0)")
            : (theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(226, 232, 240, 1)"),
          y: isScrolled ? 0 : 4,
          boxShadow: isScrolled ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "none"
        }}
        transition={{ duration: 0.3 }}
        className={cn(
          "backdrop-blur-xl rounded-full px-6 py-3 flex items-center justify-between w-full max-w-5xl border pointer-events-auto",
          isLandingPage ? "text-white" : "text-slate-900 dark:text-white"
        )}
      >
        <Link to="/" className={cn(
          "flex items-center gap-2 pr-6 border-r transition-colors",
          isLandingPage ? "border-white/10" : "border-gray-100 dark:border-gray-800"
        )}>
          <Logo 
            variant={logoVariant} 
            size="sm" 
            className="h-8 md:h-9" 
            customLogo={tenantSchool?.logoUrl} 
          />
        </Link>


        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2 pl-4">
          {navItems.map(item => (
            <Link 
              key={item.name} 
              to={item.path} 
              className={cn(
                "text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200",
                isActive(item.path) 
                  ? (isLandingPage ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600")
                  : (isLandingPage ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300")
              )}
            >
              {item.name}
            </Link>
          ))}
          
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                className={cn(
                  "text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200",
                   isActive('/dashboard') 
                    ? (isLandingPage ? "bg-white/20 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400")
                    : (isLandingPage ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")
                )}
              >
                Dashboard
              </Link>
              <Link 
                to="/profile" 
                className={`text-sm font-medium px-4 py-2 rounded-full transition-all duration-200 ${
                  isActive('/profile') 
                    ? (isLandingPage ? 'bg-white/20 text-white' : 'bg-blue-600/10 text-blue-600 dark:text-blue-400') 
                    : (isLandingPage ? 'text-slate-300 hover:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white')
                }`}
              >
                Profile
              </Link>
              <button 
                onClick={onLogout} 
                className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 px-4 py-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm ml-4">
              Login
            </Link>
          )}
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-3">
          <ThemeToggle />
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Nav Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-24 left-4 right-4 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden p-6 z-[60]"
          >
            <div className="space-y-3">
              {navItems.map(item => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 text-sm font-semibold transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <item.icon size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-gray-800 dark:text-gray-100">{item.name}</span>
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 text-sm font-semibold transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LayoutDashboard size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-gray-800 dark:text-gray-100">Dashboard</span>
                  </Link>
                  <button 
                    onClick={() => { onLogout(); setIsOpen(false); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LogOut size={20} className="text-red-600 dark:text-red-400" />
                    </div>
                    <span className="text-red-600 dark:text-red-400">Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full h-14 mt-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition-transform"
                >
                  Get Started
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


const LoginPage = ({ onLogin, tenantSchool, subdomainNotFound }: { onLogin: (user: UserProfile) => void, tenantSchool: School | null, subdomainNotFound: boolean }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const step = (searchParams.get('step') as 'school' | 'role' | 'credentials') || 'school';
  const isSignUp = searchParams.get('signup') === 'true';
  
  const setStepAndSignUp = (newStep: string, signUp: boolean) => {
    setSearchParams(prev => {
      prev.set('step', newStep);
      if (signUp) prev.set('signup', 'true');
      else prev.delete('signup');
      return prev;
    });
  };

  const setStep = (newStep: string) => setStepAndSignUp(newStep, isSignUp);
  const setIsSignUp = (val: boolean) => setStepAndSignUp(step, val);

  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchools = async () => {
      const q = query(collection(db, 'schools'));
      const snap = await getDocs(q);
      const fetchedSchools = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School));
      setSchools(fetchedSchools);

      if (tenantSchool) {
        setSelectedSchool(tenantSchool.id);
        if (step === 'school' && !searchParams.has('step')) {
          setStep('role');
        }
      }
    };
    fetchSchools();
  }, [step, searchParams, tenantSchool]);

  const filteredSchools = schools.filter(s => s.name.toLowerCase().includes(schoolSearchQuery.toLowerCase()));

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isSignUp && (!selectedSchool && selectedRole !== 'super_admin')) || !selectedRole) return;

    setLoading(true);
    setError(null);
    try {
      let user;
      const trimmedEmail = email.trim();
      if (isSignUp) {
        // Only allow super admin sign up for the specific email
        if (trimmedEmail !== 'kreativekubesolutions@gmail.com' && trimmedEmail !== 'abahjohnakor@gmail.com') {
          throw new Error("Only the platform owner can use the one-time setup.");
        }
        const result = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        user = result.user;

        const superAdminProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          firstName: 'Platform',
          lastName: 'Owner',
          role: 'super_admin',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), superAdminProfile);
        onLogin(superAdminProfile);
        navigate('/dashboard');
        return;
      } else {
        const result = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        user = result.user;
      }
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        
        // Verify school and role match
        const isSuperAdminMatch = userData.role === 'super_admin' && selectedRole === 'super_admin';
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
      if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else {
        setError(err.message || "Authentication failed. Please check your credentials.");
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
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        onLogin(userDoc.data() as UserProfile);
        navigate('/dashboard');
      } else {
        if (user.email === 'kreativekubesolutions@gmail.com' || user.email === 'abahjohnakor@gmail.com') {
          const superAdminProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            firstName: (user.displayName || 'Platform Owner').split(' ')[0],
            lastName: (user.displayName || 'Platform Owner').split(' ').slice(1).join(' ') || '',
            role: 'super_admin',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), superAdminProfile);
          onLogin(superAdminProfile);
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
        }
      }
    } catch (err: any) {
      console.error("Google login failed:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("The sign-in popup was blocked by your browser. Please allow popups or try again.");
      } else {
        setError(err.message || "Google login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const roles: { id: UserRole; label: string }[] = [
    { id: 'school_admin', label: 'Admin' },
    { id: 'teacher', label: 'Teacher' },
    { id: 'student', label: 'Student' },
    { id: 'parent', label: 'Parent' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 pt-32 transition-colors duration-500">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-2xl shadow-blue-500/5 max-w-md w-full border border-black/5 dark:border-white/5"
      >
        <div className="text-center mb-8">
          {tenantSchool ? (
            <>
              {tenantSchool.logoUrl ? (
                <img src={tenantSchool.logoUrl} alt={tenantSchool.name} className="h-16 mx-auto mb-4 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-medium text-2xl mx-auto mb-4 border border-blue-100/50 dark:border-blue-400/20">
                  {tenantSchool.name.charAt(0)}
                </div>
              )}
              <h2 className="text-2xl md:text-3xl font-medium text-slate-900 dark:text-white leading-tight">{tenantSchool.name} Login</h2>
            </>
          ) : (
            <>
              <Logo variant={theme === 'dark' ? 'white' : 'black'} size="lg" className="mx-auto mb-4 h-12 md:h-16" />
              <h2 className="text-2xl md:text-3xl font-medium text-slate-900 dark:text-white leading-tight">SEEDD {isSignUp ? 'Setup' : 'Login'}</h2>
            </>
          )}
          {!subdomainNotFound && (
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-sm md:text-base">
              {isSignUp ? 'One-time Super Admin Setup' : 
               step === 'school' ? 'Select your school' : 
               step === 'role' ? 'Select your role' : 
               'Enter your credentials'}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-sm border border-red-100 dark:border-red-900/20 font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm border border-emerald-100 dark:border-emerald-900/20 font-medium">
            {success}
          </div>
        )}

        {subdomainNotFound ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-red-100 dark:border-red-900/20">
              <SchoolIcon size={24} />
            </div>
            <h3 className="text-xl font-medium text-slate-900 dark:text-white">School Not Found</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              We couldn't find a school matching this web address. Please check the URL and try again.
            </p>
            <div className="pt-4">
              <a href="/" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-sm transition-colors cursor-pointer">
                Return Home
              </a>
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
          {step === 'school' && !isSignUp && (
            <motion.div
              key="school"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-gray-800">School</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSchoolDropdownOpen(!isSchoolDropdownOpen)}
                    className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 flex items-center justify-between"
                  >
                    <span className={selectedSchool ? "text-gray-800" : "text-gray-800"}>
                      {selectedSchool ? schools.find(s => s.id === selectedSchool)?.name : "Choose a school"}
                    </span>
                    <ChevronDown size={16} className={`text-gray-800 transition-transform ${isSchoolDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isSchoolDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden"
                      >
                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800" size={14} />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Search schools..."
                              value={schoolSearchQuery}
                              onChange={(e) => setSchoolSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1">
                          {filteredSchools.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-800">
                              No schools found
                            </div>
                          ) : (
                            filteredSchools.map(school => (
                              <button
                                key={school.id}
                                type="button"
                                onClick={() => {
                                  // Protocol adaptation: If we are on the main domain, redirect to the school's subdomain
                                  const hostname = window.location.hostname;
                                  if (school.slug && (hostname === 'seedify.name.ng' || hostname === 'www.seedify.name.ng')) {
                                    window.location.href = `${window.location.protocol}//${school.slug}.seedify.name.ng/login`;
                                    return;
                                  }
                                  setSelectedSchool(school.id);
                                  setIsSchoolDropdownOpen(false);
                                  setSchoolSearchQuery('');
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                                  selectedSchool === school.id 
                                    ? 'bg-blue-50 text-blue-700 font-medium' 
                                    : 'text-gray-800 hover:bg-gray-50'
                                }`}
                              >
                                {school.name}
                                {selectedSchool === school.id && <Check size={14} className="text-blue-600" />}
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <Button 
                onClick={() => setStep('role')}
                disabled={!selectedSchool}
                className="w-full"
              >
                Next
              </Button>
            </motion.div>
          )}

          {step === 'role' && (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-3">
                {roles.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={cn(
                      "p-4 rounded-2xl border text-sm font-medium transition-all text-center",
                      selectedRole === r.id 
                        ? "bg-[#2563EB] text-white border-[#2563EB] shadow-lg shadow-[#2563EB]/20" 
                        : "border-black/10 hover:bg-gray-50"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => navigate(-1)}
                  className="flex-1 h-10 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition-all text-sm"
                >
                  Back
                </button>
                <Button 
                  onClick={() => setStep('credentials')}
                  disabled={!selectedRole}
                  className="flex-[2]"
                >
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {(step === 'credentials' || isSignUp) && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">Email Address</label>
                  <Input 
                    type="email" 
                    placeholder="name@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-800">Password</label>
                    {!isSignUp && (
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
                        className="text-xs font-medium text-[#2563EB] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:text-gray-800"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex-1 h-10 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition-all text-sm"
                  >
                    Back
                  </button>
                  <Button 
                    type="submit"
                    disabled={loading}
                    className="flex-[2]"
                  >
                    {loading ? (isSignUp ? 'Setting up...' : 'Signing in...') : (isSignUp ? 'Create Admin' : 'Login')}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 'credentials' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/5"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-800">Or continue with</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-10 flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all disabled:opacity-50 text-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                {loading ? 'Signing in...' : 'Google Account'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )}

        <div className="mt-6 flex flex-col gap-3 text-center">
          <button
            onClick={() => {
              setSelectedRole('super_admin');
              setSelectedSchool('');
              setStepAndSignUp('credentials', false);
              setError(null);
            }}
            className="text-sm font-medium text-[#2563EB] hover:underline"
          >
            Platform Admin Login
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-800">
          <p>By signing in, you agree to our Terms of Service.</p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

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
          if (window.location.pathname === '/login' || window.location.pathname === '/') {
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
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          if (userDoc.exists()) {
            let userData = userDoc.data() as UserProfile;
            // Ensure platform owner always has super_admin role
            if ((firebaseUser.email === 'kreativekubesolutions@gmail.com' || firebaseUser.email === 'abahjohnakor@gmail.com') && userData.role !== 'super_admin') {
              userData.role = 'super_admin';
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'super_admin' });
            }
            setUser(userData);
          } else {
            // User exists in Auth but not in Firestore (incomplete onboarding)
            // Check if this is the platform owner
            if (firebaseUser.email === 'kreativekubesolutions@gmail.com' || firebaseUser.email === 'abahjohnakor@gmail.com') {
              const nameParts = (firebaseUser.displayName || 'Platform Owner').split(' ');
              const superAdminProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                firstName: nameParts[0],
                lastName: nameParts.slice(1).join(' ') || '',
                role: 'super_admin',
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), superAdminProfile);
              setUser(superAdminProfile);
            } else {
              const nameParts = (firebaseUser.displayName || '').split(' ');
              setUser({ 
                uid: firebaseUser.uid, 
                email: firebaseUser.email || '', 
                firstName: nameParts[0] || '', 
                lastName: nameParts.slice(1).join(' ') || '', 
                role: 'student' 
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
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      let slug = null;
      
      const mainDomains = ['seedify.name.ng', 'seed-app.vercel.app', 'seed-app.netlify.app'];
      const isMainDomain = mainDomains.includes(hostname) || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'www.seedify.name.ng';

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
            setTenantSchool({ id: snap.docs[0].id, ...snap.docs[0].data() } as School);
            setSubdomainNotFound(false);
          } else {
            setSubdomainNotFound(true);
          }
        } catch (error) {
          console.error("Error fetching tenant school:", error);
        }
      }
    };
    fetchTenantSchool();
  }, []);

  if (loading) return <LoadingScreen />;

  const isDashboardView = location.pathname.startsWith('/dashboard');

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col font-sans text-[#1A1A1A] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50">
        <ScrollToTop />
        {!isDashboardView && <Navbar user={user} onLogout={handleLogout} tenantSchool={tenantSchool} />}
        <main className={cn("flex-grow", isDashboardView && "pt-0 overflow-hidden")}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
              <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <PageWrapper><LoginPage onLogin={setUser} tenantSchool={tenantSchool} subdomainNotFound={subdomainNotFound} /></PageWrapper>} />
              <Route path="/dashboard/*" element={user?.schoolId || user?.role === 'super_admin' ? <PageWrapper><DashboardRouter user={user} onLogout={handleLogout} /></PageWrapper> : <Navigate to="/onboarding" />} />
              <Route path="/announcements" element={user ? <PageWrapper><AnnouncementsPage user={user} /></PageWrapper> : <Navigate to="/login" />} />
              <Route path="/onboarding" element={user ? <PageWrapper><OnboardingPage user={user} onComplete={setUser} /></PageWrapper> : <Navigate to="/login" />} />
              <Route path="/profile" element={user ? <PageWrapper><UserProfileComponent user={user} onUpdate={setUser} /></PageWrapper> : <Navigate to="/login" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
        </main>
        {!isDashboardView && (
          <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12 text-center transition-colors">
            <div className="max-w-7xl mx-auto px-6">
              <Logo variant={logoVariant} size="sm" className="h-8 mx-auto mb-6 opacity-80" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase mb-2">&copy; 2026 SEEDD Smart Ecosystem. All rights reserved.</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto leading-relaxed">The premier multi-tenant infrastructure designed to digitize educational institutions at scale.</p>
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
      getDoc(doc(db, 'schools', user.schoolId)).then(snap => {
        if (snap.exists()) {
          setSchool({ id: snap.id, ...snap.data() } as School);
        }
      });
    }
  }, [user.schoolId]);

  if (user.role === 'school_admin') {
    return <SchoolAdminDashboard user={user} onLogout={onLogout} />;
  }

  if (user.role === 'super_admin') {
    return (
      <div className="pt-24 lg:pt-32 px-4 min-h-screen bg-transparent container mx-auto mb-20">
        <div className="max-w-7xl mx-auto mb-10 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 md:p-5 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-slate-200/20 dark:shadow-none">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600/10 dark:bg-blue-600/20 rounded-2xl">
              <Shield size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">Platform Admin</h1>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">SEEDD Infrastructure</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-xs md:text-sm font-bold text-red-500 hover:text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shadow-sm border border-red-500/10">
            <LogOut size={16} /> <span className="hidden xs:inline">Logout</span>
          </button>
        </div>
        <Routes>
          <Route index element={<SuperAdminDashboard user={user} />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-8 pb-8 min-h-screen">
      {/* School Branding Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-slate-200/20 dark:shadow-none">
        <div className="flex items-center gap-4">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-white dark:border-slate-700" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg border border-white/20">
              {school?.name?.charAt(0) || 'S'}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">{school?.name || 'School Dashboard'}</h2>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-[0.2em]">{user.role.replace('_', ' ')} Portal</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-3 text-sm font-bold text-red-500 hover:text-red-600 px-5 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all border border-red-500/10 md:w-auto w-full justify-center">
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="mb-12">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-4 flex-wrap">
          Welcome, {user.firstName} <span className="text-4xl md:text-5xl animate-wave origin-bottom-right">👋</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-4 text-base md:text-lg font-medium max-w-2xl">
          Empowering your educational journey with data-driven intelligence and dynamic ecosystem management.
        </p>
      </div>
      
      <Routes>
        <Route index element={
          user.role === 'teacher' ? <TeacherDashboard user={user} /> :
          user.role === 'student' ? <StudentDashboard user={user} /> :
          <ParentDashboard user={user} />
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
    if (user.role === 'parent') {
      const studentIds = user.parentStudentIds || (user.parentStudentId ? [user.parentStudentId] : []);
      if (studentIds.length > 0) {
        const q = query(
          collection(db, 'users'),
          where('schoolId', '==', user.schoolId),
          where('studentId', 'in', studentIds)
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
      collection(db, 'announcements'),
      where('schoolId', '==', user.schoolId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      
      // Filter based on user's role and class
      const filtered = all.filter(a => {
        if (a.isSchoolWide) return true;
        if (user.role === 'student' || user.role === 'teacher') {
          return a.classId === user.classId;
        }
        if (user.role === 'parent') {
          return studentClassIds.includes(a.classId || '');
        }
        if (user.role === 'school_admin' || user.role === 'super_admin') {
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
        {announcements.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-black/5 shadow-sm text-center">
            <p className="text-gray-800">No announcements yet.</p>
          </div>
        ) : (
          announcements.map(announcement => (
            <div key={announcement.id} className="bg-white p-4 rounded-3xl border border-black/5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                  {announcement.isSchoolWide ? 'School-wide' : 'Class Notice'}
                </span>
                <span className="text-xs text-gray-800 font-medium">
                  {new Date(announcement.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-xl font-medium mb-2">{announcement.title}</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{announcement.content}</p>
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
      const q = query(collection(db, 'schools'));
      const snap = await getDocs(q);
      setSchools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
    };
    fetchSchools();
  }, []);

  const handleComplete = async () => {
    if (!role) return;
    if (role !== 'super_admin' && !selectedSchool) return;

    setLoading(true);
    try {
      const updatedUser: UserProfile = {
        ...user,
        role,
        schoolId: selectedSchool || undefined
      };
      await setDoc(doc(db, 'users', user.uid), updatedUser);
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
        <Logo variant="black" size="lg" className="mx-auto mb-4" />
        <h2 className="text-3xl font-serif font-medium mb-2 text-center">Welcome to SEEDD</h2>
        <p className="text-gray-800 text-center mb-8">Select your role and school to get started.</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              {['school_admin', 'teacher', 'student', 'parent'].map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r as UserRole)}
                  className={cn(
                    "p-3 rounded-xl border text-sm font-medium transition-all capitalize",
                    role === r ? "bg-[#2563EB] text-white border-[#2563EB]" : "border-black/10 hover:bg-gray-50"
                  )}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {role !== 'super_admin' && (
            <div>
              <label className="block text-sm font-medium mb-2">Select School</label>
              <select
                value={selectedSchool}
                onChange={e => setSelectedSchool(e.target.value)}
                className="w-full p-4 rounded-xl border border-black/10 focus:border-[#2563EB] outline-none bg-gray-50"
              >
                <option value="">Choose a school</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {schools.length === 0 && <p className="text-xs text-red-500 mt-2">No schools found. Please contact the platform owner.</p>}
            </div>
          )}

          <button
            onClick={handleComplete}
            disabled={loading || (role !== 'super_admin' && !selectedSchool)}
            className="w-full bg-[#2563EB] text-white p-4 rounded-2xl font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
          
          <p className="text-xs text-center text-gray-800">
            Wait! If you're the first admin, you'll need to be onboarded by the platform owner.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
