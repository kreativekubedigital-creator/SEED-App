import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, db, handleFirestoreError, OperationType } from '../lib/compatibility';
import { Logo } from './Logo';
import { School } from '../types';
import { 
  Shield, Search, CheckCircle2, Zap, Globe, 
  BarChart3, Lock, ArrowRight, Star, Plus,
  Database, Users, LayoutDashboard, ChevronRight,
  Github, Linkedin, Twitter, Facebook, Youtube,
  Mail, Phone, ArrowUpRight, GraduationCap, School as SchoolIcon,
  MessageSquare, Settings, Clock, Sparkles, TrendingUp, CreditCard,
  Cloud, Terminal, Command, Activity, Building2, BookOpen, FileText,
  ShieldCheck, LayoutGrid, Crosshair, Rocket, Play, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { HeroBackground } from './HeroBackground';

const Button = ({ children, className, variant = 'primary', ...props }: any) => {
  const variants: any = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_20px_50px_-12px_rgba(37,99,235,0.5)] border border-blue-500/20",
    secondary: "bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl border border-white/10 shadow-2xl",
    outline: "bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-300"
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
  const [isSearchVisible, setIsSearchVisible] = useState(false);
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
    <div className="relative bg-[#020617] min-h-screen text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden font-inter">
      
      <section className="relative min-h-screen flex flex-col justify-center pt-20 lg:pt-32 px-6 overflow-hidden">
        <HeroBackground />
        
        {/* Top Glow Edge */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="max-w-7xl mx-auto w-full relative z-10 flex-grow flex flex-col justify-center gap-12 lg:gap-16 py-20 lg:py-32">
          {/* Top Section: Massive Typography + Description */}
          <div className="w-full">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 lg:gap-12">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="relative flex flex-col items-start"
              >
                <div className="space-y-0">
                  <h1 className="text-[14vw] lg:text-[10vw] font-space font-black tracking-tighter text-white leading-[0.85] opacity-90 drop-shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                    SEEDD
                  </h1>
                  <h1 className="text-[10vw] lg:text-[7.5vw] font-space font-black tracking-tighter bg-gradient-to-b from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent leading-[0.85] drop-shadow-[0_0_80px_rgba(37,99,235,0.2)]">
                    ECO-SYSTEM
                  </h1>
                </div>

                {/* Right Aligned Description (for mobile it flows below) */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 1 }}
                  className="max-w-sm mt-8 lg:mt-0 lg:mb-4 lg:text-right"
                >
                  <h3 className="text-xs font-space font-black text-white leading-tight uppercase tracking-[0.3em] mb-4">
                    Power the intelligence behind <br className="hidden sm:block" /> modern education.
                  </h3>
                  <p className="text-[10px] text-white/40 leading-relaxed font-bold uppercase tracking-widest">
                    SEEDD connects institutions, centralizes data, and transforms everyday operations into a seamless, insight-driven system. 
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Middle: Feature Highlights Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-12 w-full max-w-4xl"
          >
            {[
              { icon: ShieldCheck, label: "Secure", sublabel: "by Design" },
              { icon: Layers, label: "Scalable", sublabel: "by Nature" },
              { icon: BarChart3, label: "Data-Driven", sublabel: "Decisions" }
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-blue-600/5 flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 group-hover:bg-blue-600/10 transition-all duration-500 shrink-0">
                  <feature.icon className="text-blue-500" size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-space font-black text-sm tracking-tight leading-tight">{feature.label}</span>
                  <span className="text-white/40 font-bold text-[9px] uppercase tracking-[0.2em] leading-tight mt-1">{feature.sublabel}</span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Bottom: CTAs + Search */}
          <div className="space-y-8 w-full max-w-xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6"
            >
              <Button 
                onClick={() => setIsSearchVisible(!isSearchVisible)}
                className="h-14 w-full sm:w-auto px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-3 transition-all active:scale-95 group"
              >
                Find your School
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Link to="/#onboarding" className="w-full sm:w-auto">
                <Button 
                  variant="outline"
                  className="h-14 w-full px-8 bg-white/5 backdrop-blur-2xl border-white/10 text-white hover:bg-white/10 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95"
                >
                  Request A Demo
                </Button>
              </Link>
            </motion.div>

            {/* Revealed Search Input */}
            <AnimatePresence>
              {isSearchVisible && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="relative w-full"
                  ref={dropdownRef}
                >
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Search for your institution..."
                    className="w-full h-16 pl-14 pr-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl text-white placeholder:text-white/30 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-bold text-sm"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                  />

                  {isDropdownOpen && searchQuery && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-4 bg-white/10 backdrop-blur-3xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-[100]"
                    >
                      {filteredSchools.length > 0 ? (
                        <div className="max-h-[300px] overflow-y-auto py-2">
                          {filteredSchools.map((school) => (
                            <button
                              key={school.id}
                              onClick={() => {
                                handleSchoolSelect(school);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/10 transition-colors group text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
                                  <SchoolIcon className="text-blue-400" size={20} />
                                </div>
                                <div>
                                  <div className="text-white font-space font-bold text-sm tracking-tight">{school.name}</div>
                                  <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">{school.location || 'Institution'}</div>
                                </div>
                              </div>
                              <ArrowUpRight className="text-white/20 group-hover:text-white transition-colors" size={18} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-6 py-10 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/5">
                            <Search className="text-white/20" size={24} />
                          </div>
                          <p className="text-white/40 text-xs font-bold uppercase tracking-widest">No matching institutions found</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right Aligned Description */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 1 }}
                className="max-w-sm space-y-4 lg:mb-4 lg:text-right"
              >
                <h3 className="text-xs font-space font-black text-white leading-tight uppercase tracking-[0.3em]">
                  Power the intelligence behind <br /> modern education.
                </h3>
                <p className="text-[10px] text-white/40 leading-relaxed font-bold uppercase tracking-widest">
                  SEEDD connects institutions, centralizes data, and transforms everyday operations into a seamless, insight-driven system. 
                </p>
              </motion.div>
          </div>
        </div>

        {/* Ambient Particles Decorator */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none" />
      </section>


      {/* --- CTA SECTION --- */}
      <section className="relative z-20 px-6 py-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-6 lg:p-10 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-transparent to-slate-50 z-10 pointer-events-none" />
            <p className="text-center text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-8">
              Trusted by Forward-Thinking Institutions
            </p>
            
            <div className="relative flex overflow-hidden">
              <motion.div 
                animate={{ x: [0, -1000] }}
                transition={{ 
                  duration: 30,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="flex items-center gap-16 whitespace-nowrap"
              >
                {[...Array(2)].map((_, idx) => (
                  <React.Fragment key={idx}>
                    {[
                      { name: 'Greenfield Academy', icon: SchoolIcon },
                      { name: 'Crestview College', icon: Building2 },
                      { name: 'NobleGate Schools', icon: GraduationCap },
                      { name: 'FutureGate College', icon: BookOpen },
                      { name: 'Royal Oak Academy', icon: Users },
                      { name: 'BrightPath School', icon: Sparkles },
                    ].map((school, i) => (
                      <div key={`${idx}-${i}`} className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:border-blue-200 group-hover:bg-blue-50 transition-all duration-300">
                          <school.icon size={20} className="text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <span className="font-space font-bold text-slate-600 group-hover:text-slate-900 text-sm tracking-tight">
                          {school.name}
                        </span>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CHALLENGE VS SOLUTION --- */}
      <section className="py-16 lg:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-20 items-center">
            
            {/* Left: The Challenge */}
            <div className="lg:col-span-4 space-y-10">
              <div className="space-y-4">
                <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em]">The Challenge</p>
                <h2 className="text-5xl lg:text-6xl font-space font-black text-slate-900 leading-[1.1] tracking-tight">
                  Education systems <br /> are fragmented.
                </h2>
              </div>
              <div className="space-y-6 text-lg text-slate-500 font-medium leading-relaxed">
                <p>
                  Schools rely on disconnected tools, manual processes, and outdated systems that slow down operations and limit growth.
                </p>
                <p>
                  Data is scattered. Decisions are delayed. Opportunities are missed.
                </p>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="w-1.5 h-12 bg-blue-600 rounded-full" />
                <span className="text-2xl font-space font-black text-blue-600 tracking-tight">SEEDD changes that.</span>
              </div>
            </div>

            {/* Middle: The Diagram */}
            <div className="lg:col-span-4 flex justify-center relative py-20 lg:py-0">
              <div className="relative w-80 h-80 flex items-center justify-center">
                {/* Orbital Rings */}
                <div className="absolute inset-0 border border-slate-100 rounded-full" />
                <div className="absolute inset-8 border border-slate-50 rounded-full" />
                
                {/* Central Core */}
                <div className="w-32 h-32 rounded-full bg-[#020617] shadow-[0_20px_50px_rgba(2,6,23,0.3)] flex items-center justify-center relative z-10 border-4 border-white overflow-hidden">
                  <img 
                    src="/seedd-logo-white.webp" 
                    alt="SEEDD" 
                    className="w-16 h-16 object-contain" 
                  />
                </div>

                {/* Orbiting Icons */}
                {[
                  { icon: FileText, top: '0%', left: '50%', delay: 0 },
                  { icon: Database, top: '20%', left: '85%', delay: 0.2 },
                  { icon: Users, top: '70%', left: '85%', delay: 0.4 },
                  { icon: ShieldCheck, top: '90%', left: '50%', delay: 0.6 },
                  { icon: BarChart3, top: '70%', left: '15%', delay: 0.8 },
                  { icon: GraduationCap, top: '20%', left: '15%', delay: 1 },
                ].map((node, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: node.delay, duration: 0.5 }}
                    className="absolute w-14 h-14 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 z-20"
                    style={{ top: node.top, left: node.left }}
                  >
                    <node.icon size={22} className="text-blue-600" />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: The Solution */}
            <div className="lg:col-span-4 space-y-10">
              <div className="space-y-4">
                <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em]">The Solution</p>
                <h2 className="text-5xl lg:text-6xl font-space font-black text-slate-900 leading-[1.1] tracking-tight">
                  One ecosystem. <br /> Full control. <br /> Total clarity.
                </h2>
              </div>
              <div className="space-y-6 text-lg text-slate-500 font-medium leading-relaxed">
                <p>
                  SEEDD brings every part of your institution into a <span className="text-slate-900 font-bold">single, intelligent platform</span>—connecting people, processes, and data in real time.
                </p>
                <p>
                  From administration to academics, everything works together seamlessly—so your institution runs with precision, speed, and confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- POWERFUL FEATURES --- */}
      <section className="py-16 lg:py-24 bg-[#020617] relative overflow-hidden">
        {/* Background glow decorators */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center space-y-4 mb-24">
            <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.4em]">Powerful Features</p>
            <h2 className="text-4xl lg:text-6xl font-space font-black text-white tracking-tight leading-[1.1]">
              Everything you need. <br className="hidden lg:block" /> Built for education.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Unified Data Infrastructure",
                desc: "All your institutional data—students, staff, academics, finance—in one secure, centralized system.",
                icon: FileText
              },
              {
                title: "Automated Operations",
                desc: "Reduce manual work with smart workflows that handle routine processes efficiently and accurately.",
                icon: Users
              },
              {
                title: "Real-Time Intelligence",
                desc: "Access powerful dashboards and insights that help you make faster, data-driven decisions.",
                icon: BarChart3
              },
              {
                title: "Multi-Tenant Architecture",
                desc: "Scale effortlessly across multiple schools or campuses—each with its own secure, customizable environment.",
                icon: Database
              },
              {
                title: "Custom-Branded Portals",
                desc: "Give every institution its own identity with personalized dashboards and subdomain access.",
                icon: Globe
              },
              {
                title: "Enterprise-Grade Security",
                desc: "Built with modern infrastructure to ensure your data is protected, isolated, and always available.",
                icon: ShieldCheck
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                className="group p-7 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl transition-all duration-500"
              >
                <div className="flex flex-col gap-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 group-hover:bg-blue-600/30 transition-all duration-500">
                    <feature.icon className="text-blue-400 group-hover:text-blue-300" size={24} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-space font-black text-white tracking-tight">{feature.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">{feature.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="py-20 lg:py-32 bg-[#020617] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-32 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-blue-500 font-black text-[10px] uppercase tracking-[0.6em]"
            >
              How It Works
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-6xl font-space font-black tracking-tight"
            >
              From setup to scale—in three simple steps
            </motion.h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-12 lg:gap-20 relative">
            {/* Connection Arrows (Desktop) */}
            <div className="hidden lg:block absolute top-1/4 left-[30%] w-[10%] border-t-2 border-dashed border-white/10" />
            <div className="hidden lg:block absolute top-1/4 left-[63%] w-[10%] border-t-2 border-dashed border-white/10" />

            {[
              { 
                step: '1', 
                title: 'Onboard Your Institution', 
                desc: 'Set up your school, configure your structure, and import your data.',
                icon: Building2
              },
              { 
                step: '2', 
                title: 'Customize Your Environment', 
                desc: "Tailor workflows, roles, and branding to match your institution's needs.",
                icon: Settings
              },
              { 
                step: '3', 
                title: 'Operate & Scale with Confidence', 
                desc: 'Manage everything from one platform while gaining insights that drive growth.',
                icon: TrendingUp
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative text-center group"
              >
                <div className="relative mb-8 inline-block">
                  <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:border-blue-500/50 transition-colors duration-500">
                    <item.icon className="text-blue-500" size={28} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-[#020617]">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg font-space font-black mb-3 tracking-tight">{item.title}</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[200px] mx-auto">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- BUILT FOR GROWTH --- */}
      <section className="py-20 bg-white/5 border-y border-white/5 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <div className="text-blue-500 font-black text-[10px] uppercase tracking-[0.4em]">
              Built for growth. Designed for performance.
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              {
                title: "Eliminate Operational Bottlenecks",
                desc: "Streamline processes and reduce manual workloads.",
                icon: Zap
              },
              {
                title: "Improve Decision-Making with Real-Time Data",
                desc: "Get accurate insights when you need them most.",
                icon: Crosshair
              },
              {
                title: "Enhance Transparency Across Your Institution",
                desc: "Improve communication and accountability at every level.",
                icon: Users
              },
              {
                title: "Scale Without Increasing Complexity",
                desc: "Grow your institution with a platform that grows with you.",
                icon: Rocket
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center text-center gap-4"
              >
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-blue-500 bg-white/5">
                  <feature.icon size={20} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold tracking-tight leading-snug px-4">{feature.title}</h4>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-10 lg:py-16 bg-[#020617]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-[#050B1F] rounded-[2rem] border border-white/10 overflow-hidden relative"
          >
            {/* Ambient Background Pattern */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/20 blur-[100px] rounded-full" />
              <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-blue-400/10 blur-[80px] rounded-full" />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            </div>

            <div className="grid lg:grid-cols-2 relative z-10">
              <div className="p-8 lg:p-16 space-y-6">
                <h2 className="text-3xl lg:text-4xl font-space font-black tracking-tight leading-[1.2]">
                  Ready to transform your institution?
                </h2>
                <p className="text-base text-slate-400 font-medium max-w-md leading-relaxed">
                  Join forward-thinking schools already building the future with SEEDD.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <button className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-[0_15px_30px_-5px_rgba(37,99,235,0.3)] flex items-center gap-2 group">
                    Get Started Now
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="h-12 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 group">
                    Book a Demo
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>
              </div>

              <div className="bg-white/5 border-l border-white/5 p-8 lg:p-16">
                <div className="grid grid-cols-2 gap-8">
                  {[
                    { label: 'Institutions', value: '120+' },
                    { label: 'Students Managed', value: '250K+' },
                    { label: 'System Uptime', value: '98.9%' },
                    { label: 'Expert Support', value: '24/7' }
                  ].map((stat, i) => (
                    <div key={i} className="space-y-1">
                      <div className="text-2xl lg:text-3xl font-space font-black text-white">{stat.value}</div>
                      <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-black pt-10 pb-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 lg:col-span-2 space-y-10">
              <Logo variant="white" size="md" />
              <p className="text-2xl text-white/50 font-medium max-w-sm leading-relaxed">
                The intelligent nervous system for the next generation of academic excellence.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-16 lg:col-span-2">
              <div className="space-y-8">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Platform</h4>
                <ul className="space-y-5 text-sm font-bold text-white/40">
                  <li><a href="#features" className="hover:text-blue-400 transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="hover:text-blue-400 transition-colors">Methodology</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Pricing</a></li>
                </ul>
              </div>
              <div className="space-y-8">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Support</h4>
                <ul className="space-y-5 text-sm font-bold text-white/40">
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Security</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-white/20 text-xs font-bold uppercase tracking-widest">© 2024 SEEDD Intelligence. Built for global scaling.</p>
            <div className="flex gap-12 text-xs font-black text-white/30 uppercase tracking-[0.2em]">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
