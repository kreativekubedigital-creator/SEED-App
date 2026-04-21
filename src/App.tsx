import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { auth, db, onAuthStateChanged, doc, getDoc, signInWithPopup, signInWithRedirect, getRedirectResult, googleProvider, signOut, setDoc, updateDoc, collection, getDocs, query, where, onSnapshot, signInWithEmailAndPassword, handleFirestoreError, OperationType, createUserWithEmailAndPassword, sendPasswordResetEmail } from './firebase';
import { UserProfile, UserRole, School, Announcement } from './types';
import { Logo } from './components/Logo';
import { ThemeToggle } from './components/ThemeToggle';
import { LogIn, LogOut, LayoutDashboard, User, Users, BookOpen, Bell, Settings, CreditCard, Menu, X, Home, Sparkles, Info, Mail, Clock, CheckCircle2, CheckCircle, Eye, EyeOff, Search, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  public state = { hasError: false, errorInfo: null };
  
  constructor(props: { children: React.ReactNode }) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || "");
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
              <p className="text-red-700 font-bold mb-2">{this.state.errorInfo}</p>
            </div>
            <p className="text-gray-800 mb-6">The application encountered an unexpected error. This often happens due to missing data or a connection issue.</p>
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
  <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A1A1A] text-white">
    <Logo variant="white" size="lg" className="mb-8" />
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full mb-4"
    />
    <p className="font-serif italic text-lg opacity-80 tracking-widest">SEEDING THE FUTURE...</p>
  </div>
);

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
};


const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:pointer-events-none disabled:opacity-50 text-white h-9 px-5 py-2 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98] border border-white/10 ${className}`}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  },
)
Button.displayName = "Button"

const Navbar = ({ user, onLogout }: { user: UserProfile | null, onLogout: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'About', path: '/about', icon: Info },
    { name: 'Contact', path: '/contact', icon: Mail },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <nav className="bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-full px-6 py-2 flex items-center justify-between w-full max-w-4xl border border-gray-100 dark:border-gray-800">
        <Link to="/" className="flex items-center gap-2 pr-6 border-r border-gray-100 dark:border-gray-800">
          <Logo variant="navbar" size="sm" className="h-8 md:h-10" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2 pl-4">
          {navItems.map(item => (
            <Link 
              key={item.name} 
              to={item.path} 
              className={`text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                isActive(item.path) 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-800 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {item.name}
            </Link>
          ))}
          
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                className={`text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                  isActive('/dashboard') 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-800 dark:text-gray-800 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                to="/profile" 
                className={`text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                  isActive('/profile') 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-800 dark:text-gray-800 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Profile
              </Link>
              <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 px-3.5 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ml-2">
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm ml-4">
              Login
            </Link>
          )}
          <div className="ml-2 pl-2 border-l border-gray-100 dark:border-gray-800 flex items-center">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full">
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Nav Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-4 right-4 md:hidden bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden p-4"
          >
            <div className="space-y-2">
              {navItems.map(item => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium"
                >
                  <item.icon size={20} className="text-gray-800" />
                  {item.name}
                </Link>
              ))}
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium"
                  >
                    <LayoutDashboard size={20} className="text-gray-800" />
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium"
                  >
                    <User size={20} className="text-gray-800" />
                    Profile
                  </Link>
                </>
              )}
              {user ? (
                <button
                  onClick={() => { onLogout(); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-base font-medium text-red-600"
                >
                  <LogOut size={20} /> Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1A1A1A] text-white text-base font-medium justify-center"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


const LoginPage = ({ onLogin }: { onLogin: (user: UserProfile) => void }) => {
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

  const [tenantSchool, setTenantSchool] = useState<School | null>(null);
  const [subdomainNotFound, setSubdomainNotFound] = useState(false);

  useEffect(() => {
    const fetchSchools = async () => {
      const q = query(collection(db, 'schools'));
      const snap = await getDocs(q);
      const fetchedSchools = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School));
      setSchools(fetchedSchools);

      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      let slug = null;
      
      // Generic subdomain detection:
      // 1. If 3+ parts and not starting with www (e.g. school.domain.com)
      if (parts.length >= 3 && parts[0] !== 'www') {
        slug = parts[0];
      } 
      // 2. Special case for localhost:8085 (e.g. school.localhost)
      else if (parts.length === 2 && parts[1] === 'localhost') {
        slug = parts[0];
      }

      if (slug) {
        const found = fetchedSchools.find(s => s.slug === slug);
        if (found) {
          setTenantSchool(found);
          setSelectedSchool(found.id);
          // Auto-skip school selection step if we successfully matched a subdomain
          if (step === 'school' && !searchParams.has('step')) {
            setStep('role');
          }
        } else {
          setSubdomainNotFound(true);
        }
      }
    };
    fetchSchools();
  }, [step, searchParams]);

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
    <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center p-4 pt-32">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-4 rounded-2xl shadow-xl max-w-md w-full border border-black/5"
      >
        <div className="text-center mb-8">
          {tenantSchool ? (
            <>
              {tenantSchool.logoUrl ? (
                <img src={tenantSchool.logoUrl} alt={tenantSchool.name} className="h-16 mx-auto mb-4 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-medium text-2xl mx-auto mb-4">
                  {tenantSchool.name.charAt(0)}
                </div>
              )}
              <h2 className="text-3xl font-medium">{tenantSchool.name} Login</h2>
            </>
          ) : (
            <>
              <Logo variant="black" size="lg" className="mx-auto mb-4" />
              <h2 className="text-3xl font-medium">SEED {isSignUp ? 'Setup' : 'Login'}</h2>
            </>
          )}
          {!subdomainNotFound && (
            <p className="text-gray-800 mt-2">
              {isSignUp ? 'One-time Super Admin Setup' : 
               step === 'school' ? 'Select your school' : 
               step === 'role' ? 'Select your role' : 
               'Enter your credentials'}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm border border-emerald-100 font-medium">
            {success}
          </div>
        )}

        {subdomainNotFound ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <SchoolIcon size={24} />
            </div>
            <h3 className="text-xl font-medium text-gray-800">School Not Found</h3>
            <p className="text-gray-800 text-sm">
              We couldn't find a school matching this web address. Please check the URL and try again.
            </p>
            <div className="pt-4">
              <a href="/" className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors cursor-pointer">
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

  if (loading) return <LoadingScreen />;

  const isDashboardView = location.pathname.startsWith('/dashboard');

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col font-sans text-[#1A1A1A] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50">
        <ScrollToTop />
        {!isDashboardView && <Navbar user={user} onLogout={handleLogout} />}
        <main className={cn("flex-grow", isDashboardView && "pt-0")}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage onLogin={setUser} />} />
            <Route path="/dashboard/*" element={user?.schoolId || user?.role === 'super_admin' ? <DashboardRouter user={user} onLogout={handleLogout} /> : <Navigate to="/onboarding" />} />
            <Route path="/announcements" element={user ? <AnnouncementsPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/onboarding" element={user ? <OnboardingPage user={user} onComplete={setUser} /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <UserProfileComponent user={user} onUpdate={setUser} /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        {!isDashboardView && (
          <footer className="bg-white border-t border-black/10 py-8 text-center text-sm text-gray-800">
            <p>&copy; 2026 SEED Nigeria. All rights reserved.</p>
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
      <div className="pt-20 lg:pt-32 px-4 min-h-screen bg-transparent">
        <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between bg-white/80 backdrop-blur-md p-3 md:p-4 rounded-2xl md:rounded-3xl border border-white/40 shadow-sm">
          <div className="flex items-center gap-2 md:gap-4">
            <Logo variant="black" size="md" />
            <h1 className="text-base md:text-xl font-medium truncate max-w-[120px] md:max-w-none">Platform Admin</h1>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-xs md:text-sm font-medium text-red-500 hover:text-red-600 px-3 py-1.5 md:px-4 md:py-2 rounded-xl hover:bg-red-50 transition-all shrink-0">
            <LogOut size={16} className="md:w-[18px] md:h-[18px]" /> <span className="hidden xs:inline">Logout</span>
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/40 shadow-sm">
        <div className="flex items-center gap-4">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="w-10 h-10 rounded-xl object-cover shadow-sm border border-white" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-medium text-xl shadow-md border border-white/50">
              {school?.name?.charAt(0) || 'S'}
            </div>
          )}
          <div>
            <h2 className="text-lg font-medium text-gray-800">{school?.name || 'School Dashboard'}</h2>
            <p className="text-xs text-blue-600 font-medium uppercase tracking-widest">{user.role.replace('_', ' ')} Portal</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-all border border-red-100/50">
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-gray-800 flex items-center gap-3">
            Welcome, {user.firstName} <span className="text-3xl md:text-4xl animate-wave origin-bottom-right">👋</span>
          </h1>
        </div>
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
        <h2 className="text-3xl font-serif font-medium mb-2 text-center">Welcome to SEED</h2>
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
