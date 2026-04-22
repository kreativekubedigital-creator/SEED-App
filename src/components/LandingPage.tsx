import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, db, handleFirestoreError, OperationType } from '../firebase';
import { Logo } from './Logo';
import { 
  Shield, Search, CheckCircle2, Zap, Globe, 
  BarChart3, Lock, ArrowRight, Star, Plus,
  Database, Users, LayoutDashboard, ChevronRight,
  Github, Linkedin, Twitter, Facebook, Youtube,
  Mail, Phone, ArrowUpRight, GraduationCap, School as SchoolIcon,
  MessageSquare, Settings, Clock, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { School } from '../types';

const Button = ({ children, className, variant = 'primary', ...props }: any) => {
  const variants: any = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-900",
    outline: "bg-transparent border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900"
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:pointer-events-none disabled:opacity-50 h-12 px-8 py-2 active:scale-95",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const LandingPage = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'schools'), (snapshot) => {
      const schoolList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as School));
      setSchools(schoolList);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'schools'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSchoolSelect = (school: School) => {
    const isProduction = window.location.hostname.includes('seedify.name.ng');
    if (isProduction && school.slug) {
      window.location.href = `https://${school.slug}.seedify.name.ng/login`;
    } else {
      navigate(`/login?school=${school.id}`);
    }
  };

  return (
    <div className="relative bg-white min-h-screen text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        {/* Subtle Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-50 blur-[120px] rounded-full opacity-60" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-indigo-50 blur-[100px] rounded-full opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column: Content */}
            <div className="space-y-8 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold tracking-widest uppercase"
              >
                <Sparkles size={14} />
                <span>The Future of School Intelligence</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]"
              >
                Evolve Your <br />
                <span className="text-blue-600">Academic Core</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-slate-600 max-w-xl leading-relaxed"
              >
                SEEDD is the intelligent infrastructure powering modern education—uniting data, 
                automating operations, and delivering real-time insights at scale.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* School Search Dropdown */}
                  <div className="relative flex-1" ref={dropdownRef}>
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      <input 
                        type="text"
                        placeholder="Select your school..."
                        className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                      />
                    </div>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[300px] overflow-y-auto"
                        >
                          {filteredSchools.length > 0 ? (
                            filteredSchools.map(school => (
                              <button
                                key={school.id}
                                onClick={() => handleSchoolSelect(school)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0 group"
                              >
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                  {school.logoUrl ? (
                                    <img src={school.logoUrl} alt="" className="w-6 h-6 object-contain" />
                                  ) : (
                                    <SchoolIcon size={20} className="text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{school.name}</div>
                                  <div className="text-xs text-slate-500">{school.slug}.seedify.name.ng</div>
                                </div>
                                <ArrowUpRight className="ml-auto text-slate-300 group-hover:text-blue-600 transition-colors" size={16} />
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-8 text-center text-slate-500">
                              <p className="font-medium">No schools found</p>
                              <p className="text-xs mt-1">Try another name or contact support</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <Link to="/onboarding" className="sm:w-auto">
                    <Button className="h-14 px-8 w-full gap-2">
                      <Plus size={20} />
                      Onboard School
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-wrap gap-6 pt-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> Secure by Design</div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> Scalable by Nature</div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> Data-Driven Decisions</div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Visual */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="relative hidden lg:block"
            >
              <div className="relative bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 border border-slate-800 overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                
                {/* Mock Dashboard Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                      <Logo variant="white" size="sm" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Welcome back, Admin</h3>
                      <p className="text-slate-400 text-xs">Here's what's happening today.</p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold">
                    May 12, 2024
                  </div>
                </div>

                {/* Mock Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {[
                    { label: 'Total Students', value: '4,782', growth: '+3.2%', color: 'text-blue-400' },
                    { label: 'Attendance Rate', value: '92.6%', growth: '+0.7%', color: 'text-emerald-400' },
                    { label: 'Revenue', value: '₦24.8M', growth: '+1.1%', color: 'text-indigo-400' },
                    { label: 'Fees Collected', value: '₦18.6M', growth: '+2.4%', color: 'text-purple-400' },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-white">{stat.value}</span>
                        <span className={cn("text-[10px] font-bold", stat.color)}>{stat.growth}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mock Chart Area */}
                <div className="h-40 rounded-2xl bg-white/[0.03] border border-white/5 mb-8 p-4 flex flex-col justify-end gap-2 relative">
                  <div className="absolute top-4 left-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Performance Overview</div>
                  <div className="flex items-end justify-between h-24 gap-2">
                    {[40, 60, 45, 80, 55, 90].map((h, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.8 + (i * 0.1), duration: 0.8 }}
                        className="flex-1 bg-gradient-to-t from-blue-600/50 to-blue-400 rounded-t-md relative group/bar"
                      >
                         <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-[8px] font-bold px-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">+{h}%</div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Mock Recent Activity */}
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Activities</div>
                  {[
                    { label: 'New student admission', time: '10 min ago', color: 'bg-blue-500' },
                    { label: 'Fees payment received', time: '2 hr ago', color: 'bg-emerald-500' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-1.5 h-1.5 rounded-full", activity.color)} />
                        <span className="text-xs text-slate-300 font-medium">{activity.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Decoration */}
              <motion.div 
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -right-6 p-6 bg-white rounded-3xl shadow-2xl border border-slate-100 z-20 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Real-time Data</div>
                  <div className="text-lg font-bold text-slate-900">100% Reliable</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- LOGO BAR --- */}
      <section className="py-12 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-10">Trusted by Forward-Thinking Institutions</p>
          <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8 opacity-50">
            {['Greenfield Academy', 'Crestview College', 'NobleGate Schools', 'FutureGate College', 'Royal Oak Academy'].map((school, i) => (
              <div key={i} className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default">
                <SchoolIcon size={24} className="text-slate-900" />
                <span className="font-bold text-slate-900 tracking-tight">{school}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CHALLENGE VS SOLUTION --- */}
      <section id="solutions" className="py-24 lg:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left: Challenge */}
            <div className="space-y-6">
              <div className="text-blue-600 font-bold text-xs uppercase tracking-widest">The Challenge</div>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                Education systems <br /> are fragmented.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                Schools today rely on disconnected tools, manual processes, and outdated systems that slow down operations and limit growth. 
              </p>
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                Data is scattered. Decisions are delayed. Opportunities are missed.
              </p>
              <div className="pt-4 border-l-4 border-blue-600 pl-6">
                <p className="text-xl font-bold text-slate-900">SEEDD changes that.</p>
              </div>
            </div>

            {/* Right: Solution Visualization */}
            <div className="relative">
              <div className="text-blue-600 font-bold text-xs uppercase tracking-widest mb-6">The Solution</div>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-8">
                One ecosystem. <br /> Full control. <br /> Total clarity.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg mb-10">
                SEEDD brings every part of your institution into a <span className="font-bold text-slate-900 italic">single, intelligent platform</span>—connecting people, processes, and data in real time.
              </p>

              {/* Central Infographic */}
              <div className="relative w-full aspect-square max-w-[400px] mx-auto lg:mx-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-50 rounded-full animate-pulse" />
                <div className="relative z-10 w-24 h-24 rounded-2xl bg-slate-900 flex items-center justify-center shadow-2xl">
                  <Logo variant="white" size="md" />
                </div>
                
                {/* Orbiting Icons */}
                {[
                  { Icon: Database, pos: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' },
                  { Icon: Users, pos: 'top-1/4 right-0 translate-x-1/2' },
                  { Icon: BarChart3, pos: 'bottom-1/4 right-0 translate-x-1/2' },
                  { Icon: Shield, pos: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' },
                  { Icon: GraduationCap, pos: 'bottom-1/4 left-0 -translate-x-1/2' },
                  { Icon: Clock, pos: 'top-1/4 left-0 -translate-x-1/2' },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                    className={cn("absolute w-12 h-12 rounded-xl bg-white shadow-lg border border-slate-100 flex items-center justify-center text-blue-600 z-20", item.pos)}
                  >
                    <item.Icon size={20} />
                  </motion.div>
                ))}
                
                {/* Connecting Lines (Simulated with simple rings) */}
                <div className="absolute inset-0 border border-slate-200 rounded-full" />
                <div className="absolute inset-12 border border-slate-100 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- POWERFUL FEATURES GRID --- */}
      <section id="features" className="py-24 lg:py-32 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center space-y-4 mb-20">
            <div className="text-blue-600 font-bold text-xs uppercase tracking-[0.3em]">Powerful Features</div>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">Everything you need. Built for education.</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                title: 'Unified Data Infrastructure', 
                desc: 'All your institutional data—students, staff, academics, finance—in one secure, centralized system.', 
                Icon: Database,
                color: 'bg-blue-50 text-blue-600'
              },
              { 
                title: 'Automated Operations', 
                desc: 'Reduce manual work with smart workflows that handle routine processes efficiently and accurately.', 
                Icon: Zap,
                color: 'bg-amber-50 text-amber-600'
              },
              { 
                title: 'Real-Time Intelligence', 
                desc: 'Access powerful dashboards and insights that help you make faster, data-driven decisions.', 
                Icon: BarChart3,
                color: 'bg-emerald-50 text-emerald-600'
              },
              { 
                title: 'Multi-Tenant Architecture', 
                desc: 'Scale effortlessly across multiple schools or campuses—each with its own secure, customizable environment.', 
                Icon: Globe,
                color: 'bg-indigo-50 text-indigo-600'
              },
              { 
                title: 'Custom-Branded Portals', 
                desc: 'Give every institution its own identity with personalized dashboards and subdomain access.', 
                Icon: Sparkles,
                color: 'bg-purple-50 text-purple-600'
              },
              { 
                title: 'Enterprise-Grade Security', 
                desc: 'Built with modern infrastructure to ensure your data is protected, isolated, and always available.', 
                Icon: Lock,
                color: 'bg-rose-50 text-rose-600'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
              >
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", feature.color)}>
                  <feature.Icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section className="py-24 lg:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <div className="text-blue-600 font-bold text-xs uppercase tracking-[0.3em]">How It Works</div>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">From setup to scale—in three simple steps</h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-12 relative">
            {/* Connecting Line */}
            <div className="absolute top-24 left-0 w-full h-0.5 bg-slate-100 -z-10 hidden lg:block" />

            {[
              { 
                step: '1', 
                title: 'Onboard Your Institution', 
                desc: 'Set up your school, configure your structure, and import your data.',
                Icon: SchoolIcon 
              },
              { 
                step: '2', 
                title: 'Customize Your Environment', 
                desc: 'Tailor workflows, roles, and branding to match your institution\'s needs.',
                Icon: Settings 
              },
              { 
                step: '3', 
                title: 'Operate & Scale with Confidence', 
                desc: 'Manage everything from one platform while gaining insights that drive growth.',
                Icon: BarChart3 
              },
            ].map((step, i) => (
              <div key={i} className="text-center space-y-6">
                <div className="relative inline-flex">
                  <div className="w-20 h-20 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-blue-600 shadow-sm relative z-10 group-hover:border-blue-500 transition-colors">
                    <step.Icon size={32} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center border-4 border-white z-20">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="text-slate-600 max-w-xs mx-auto text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FINAL CTA & STATS --- */}
      <section className="py-24 lg:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-900 rounded-[3rem] p-12 lg:p-20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[120px] rounded-full -z-0" />
            
            <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
              <div className="space-y-10">
                <h2 className="text-4xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                  Ready to transform <br /> your institution?
                </h2>
                <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
                  Join forward-thinking schools already building the future with SEEDD.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 pt-4">
                  <Link to="/onboarding">
                    <Button className="h-16 px-12 text-lg bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                      Get Started Now
                      <ArrowRight size={20} className="ml-2" />
                    </Button>
                  </Link>
                  <Button variant="outline" className="h-16 px-12 text-lg border-white/20 text-white hover:bg-white/10 w-full sm:w-auto">
                    Book a Demo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {[
                  { value: '120+', label: 'Institutions', desc: 'Active globally' },
                  { value: '250K+', label: 'Students', desc: 'Managed safely' },
                  { value: '98.9%', label: 'System Uptime', desc: 'Always online' },
                  { value: '24/7', label: 'Expert Support', desc: 'Here to help' },
                ].map((stat, i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-4xl font-bold text-white tracking-tight">{stat.value}</div>
                    <div className="text-blue-400 font-bold text-xs uppercase tracking-widest">{stat.label}</div>
                    <p className="text-slate-500 text-xs">{stat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer id="about" className="bg-white border-t border-slate-100 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-12 mb-20">
            {/* Brand Column */}
            <div className="col-span-2 space-y-8">
              <Logo variant="black" size="md" />
              <p className="text-slate-500 max-w-sm leading-relaxed text-sm">
                Smart Ecosystem for Education & Dynamic Data. The intelligent infrastructure for modern academic management.
              </p>
              <div className="flex gap-4">
                {[Linkedin, Facebook, Twitter, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Product</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Features</a></li>
                <li><a href="#solutions" className="hover:text-blue-600 transition-colors">Solutions</a></li>
                <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Integrations</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Company</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li><Link to="/about" className="hover:text-blue-600 transition-colors">About Us</Link></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Blog</a></li>
                <li><Link to="/contact" className="hover:text-blue-600 transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Resources</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Guides</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-400 text-xs font-medium">
              © 2024 SEEDD. All rights reserved.
            </p>
            <div className="flex gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
