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
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 border border-blue-500/50",
    secondary: "bg-slate-950 hover:bg-black text-white shadow-xl shadow-black/10",
    outline: "bg-white/50 backdrop-blur-sm border-2 border-slate-200 hover:border-slate-950 text-slate-900 hover:text-black transition-all duration-300"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:pointer-events-none disabled:opacity-50 h-14 px-10 py-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
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
      <section className="relative pt-32 pb-20 lg:pt-56 lg:pb-40 px-6 overflow-hidden">
        {/* Advanced Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-15%] right-[-10%] w-[60%] h-[60%] bg-blue-100/30 blur-[140px] rounded-full opacity-60 animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-100/20 blur-[120px] rounded-full opacity-50" />
          {/* Grain Overlay */}
          <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Column: Content */}
            <div className="space-y-10 relative z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/80 backdrop-blur-sm border border-blue-100/50 text-blue-700 text-[10px] font-black tracking-[0.2em] uppercase shadow-sm"
              >
                <Sparkles size={14} className="animate-pulse" />
                <span>The Intelligence layer for schools</span>
              </motion.div>

              <div className="space-y-6">
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="text-6xl lg:text-8xl font-black tracking-tight text-slate-950 leading-[0.95]"
                >
                  Orchestrate <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">Academic Flow</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="text-xl text-slate-700 max-w-xl leading-relaxed font-medium"
                >
                  SEEDD is the unified ecosystem powering the next generation of education—automating 
                  complex operations and delivering predictive insights in real-time.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* School Search Dropdown */}
                  <div className="relative flex-1" ref={dropdownRef}>
                    <div className="relative group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      <input 
                        type="text"
                        placeholder="Select your institution..."
                        className="w-full h-16 pl-14 pr-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-sm focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-slate-950 placeholder:text-slate-400 font-bold"
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

                  <a href="#onboard" className="sm:w-auto">
                    <Button className="h-14 px-8 w-full gap-2">
                      <Plus size={20} />
                      Onboard School
                    </Button>
                  </a>
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
      <section className="py-16 border-y border-slate-100 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-12"
          >
            Powering Forward-Thinking Institutions
          </motion.p>
          <div className="flex flex-wrap justify-center items-center gap-x-20 gap-y-10">
            {['Greenfield Academy', 'Crestview College', 'NobleGate Schools', 'FutureGate College', 'Royal Oak Academy'].map((school, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 0.4, y: 0 }}
                whileHover={{ opacity: 1, scale: 1.05 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <SchoolIcon size={24} className="text-slate-900 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="font-black text-slate-950 tracking-tighter text-sm uppercase">{school}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CHALLENGE VS SOLUTION --- */}
      <section id="solutions" className="py-32 lg:py-48 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            {/* Left: Challenge */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em]">The Friction</div>
              <h2 className="text-5xl lg:text-7xl font-black tracking-tight leading-[0.95] text-slate-950">
                Education is <br /> fragmented.
              </h2>
              <div className="space-y-6">
                <p className="text-xl text-slate-700 leading-relaxed max-w-lg font-medium">
                  Schools today are slowed down by disconnected tools, manual spreadsheets, and outdated systems that stifle academic potential.
                </p>
                <p className="text-xl text-slate-700 leading-relaxed max-w-lg font-medium">
                  Data is silos. Operations are opaque. Growth is limited.
                </p>
              </div>
              <div className="pt-6 border-l-[6px] border-blue-600 pl-8">
                <p className="text-2xl font-black text-slate-950 tracking-tight">SEEDD is the missing link.</p>
              </div>
            </motion.div>

            {/* Right: Solution Visualization */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] mb-8">The Ecosystem</div>
              <h2 className="text-5xl lg:text-7xl font-black tracking-tight leading-[0.95] text-slate-950 mb-10">
                One Core. <br /> Absolute <br /> Clarity.
              </h2>
              <p className="text-xl text-slate-700 leading-relaxed max-w-lg mb-12 font-medium">
                SEEDD centralizes every dimension of your institution into a <span className="text-blue-600 font-black italic">single intelligent nervous system</span>.
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- POWERFUL FEATURES GRID --- */}
      <section id="features" className="py-32 lg:py-48 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-6 mb-24"
          >
            <div className="text-blue-600 font-black text-[10px] uppercase tracking-[0.5em]">System Capabilities</div>
            <h2 className="text-5xl lg:text-7xl font-black tracking-tight text-slate-950">Engineered for Excellence.</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                title: 'Unified Intelligence', 
                desc: 'A centralized data architecture that unites students, staff, academics, and financials into one secure vault.', 
                Icon: Database,
                color: 'bg-blue-600 text-white'
              },
              { 
                title: 'Autonomous Flows', 
                desc: 'Advanced automation that handles routine administrative overhead, letting your staff focus on education.', 
                Icon: Zap,
                color: 'bg-slate-950 text-white'
              },
              { 
                title: 'Predictive Analytics', 
                desc: 'Real-time performance dashboards that forecast institutional growth and academic outcomes.', 
                Icon: BarChart3,
                color: 'bg-blue-600 text-white'
              },
              { 
                title: 'Global Multi-Tenancy', 
                desc: 'Effortlessly manage an entire network of schools from a single system command center.', 
                Icon: Globe,
                color: 'bg-slate-950 text-white'
              },
              { 
                title: 'Bespoke Branding', 
                desc: 'Every institution receives a fully personalized environment with custom domains and aesthetics.', 
                Icon: Sparkles,
                color: 'bg-blue-600 text-white'
              },
              { 
                title: 'Fortress Security', 
                desc: 'Banking-grade encryption and data isolation protocols built into the very core of the platform.', 
                Icon: Lock,
                color: 'bg-slate-950 text-white'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 rounded-[2.5rem] bg-white border border-slate-100 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 group"
              >
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg", feature.color)}>
                  <feature.Icon size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="py-32 lg:py-48 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-6 mb-24"
          >
            <div className="text-blue-600 font-black text-[10px] uppercase tracking-[0.5em]">The Methodology</div>
            <h2 className="text-5xl lg:text-7xl font-black tracking-tight text-slate-950">Precision Deployment.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 border-t-2 border-dashed border-slate-100 -translate-y-1/2 -z-10" />
            
            {[
              { 
                step: '01', 
                title: 'Request Access', 
                desc: 'Fill our onboarding request form. Our systems architects will evaluate your institutional structure.',
                icon: '🚀'
              },
              { 
                step: '02', 
                title: 'Core Integration', 
                desc: 'We map your existing data and protocols into the SEEDD ecosystem with zero downtime.',
                icon: '⚡'
              },
              { 
                step: '03', 
                title: 'Go Live', 
                desc: 'Unlock your personalized portal and begin orchestrating your institution with total clarity.',
                icon: '💎'
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 group hover:border-blue-500/30 transition-all duration-500"
              >
                <div className="text-5xl mb-8 group-hover:scale-110 transition-transform duration-500">{item.icon}</div>
                <div className="text-blue-600 font-black text-sm uppercase tracking-[0.3em] mb-4">Step {item.step}</div>
                <h3 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- ONBOARDING FORM --- */}
      <section id="onboarding" className="py-32 lg:py-48 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[140px] rounded-full" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 lg:p-20 rounded-[3rem] shadow-2xl"
          >
            <div className="text-center space-y-6 mb-16">
              <div className="text-blue-400 font-black text-[10px] uppercase tracking-[0.5em]">Initiate Onboarding</div>
              <h2 className="text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">Apply for SEEDD.</h2>
              <p className="text-xl text-slate-400 font-medium max-w-xl mx-auto">
                Transform your institutional infrastructure. Our team will review your application within 24 hours.
              </p>
            </div>

            <form className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Greenfield Academy"
                  className="w-full h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
                <input 
                  type="email" 
                  placeholder="admin@school.edu"
                  className="w-full h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Domain Prefix</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="greenfield"
                    className="w-full h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold pr-32"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-black">.seedify.com</div>
                </div>
              </div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="md:col-span-2 pt-6"
              >
                <Button className="w-full h-16 text-lg">Submit Application</Button>
              </motion.div>
            </form>
          </motion.div>
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
                  <a href="#onboard">
                    <Button className="h-16 px-12 text-lg bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                      Get Started Now
                      <ArrowRight size={20} className="ml-2" />
                    </Button>
                  </a>
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
      <footer className="bg-white pt-32 pb-16 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-20 mb-24">
            <div className="col-span-1 md:col-span-1 space-y-8">
              <Logo variant="black" size="md" />
              <p className="text-slate-600 font-medium leading-relaxed">
                The intelligent nervous system for the next generation of academic excellence.
              </p>
              <div className="flex gap-4">
                <ul className="space-y-4 text-sm font-medium text-slate-500">
                  <li><a href="#" className="hover:text-blue-600 transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-blue-600 transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-blue-600 transition-colors">Guides</a></li>
                  <li><a href="#" className="hover:text-blue-600 transition-colors">Status</a></li>
                </ul>
              </div>
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
