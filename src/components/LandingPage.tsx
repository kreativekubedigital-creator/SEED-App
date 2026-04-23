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
  MessageSquare, Settings, Clock, Sparkles, TrendingUp, CreditCard,
  Cloud, Terminal, Command, Activity, Building2, BookOpen, FileText,
  ShieldCheck, LayoutGrid
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
      
      <section className="relative h-screen flex flex-col pt-24 lg:pt-32 px-6 overflow-hidden">
        <HeroBackground />
        
        {/* Top Glow Edge */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="max-w-7xl mx-auto w-full relative z-10 flex-grow flex flex-col justify-end gap-6 pb-12">
            {/* Left: CTAs */}
            <div className="space-y-10">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap gap-6"
              >
                <Button 
                  onClick={() => setIsSearchVisible(!isSearchVisible)}
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)] flex items-center gap-2 transition-all active:scale-95 group"
                >
                  Find your School
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <Link to="/#onboarding">
                  <Button 
                    variant="outline"
                    className="h-12 px-6 bg-white/5 backdrop-blur-2xl border-white/10 text-white hover:bg-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
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
                    className="relative max-w-md"
                    ref={dropdownRef}
                  >
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Type school name..."
                      className="w-full h-12 pl-12 pr-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-2xl text-white placeholder:text-white/30 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-bold text-xs"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                    />

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                      {isDropdownOpen && searchQuery && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          className="absolute top-full left-0 right-0 mt-3 bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[300px] overflow-y-auto"
                        >
                          {filteredSchools.length > 0 ? (
                            filteredSchools.map(school => (
                              <button
                                key={school.id}
                                onClick={() => handleSchoolSelect(school)}
                                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 group"
                              >
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/40 transition-colors">
                                  {school.logoUrl ? (
                                    <img src={school.logoUrl} alt="" className="w-6 h-6 object-contain" />
                                  ) : (
                                    <SchoolIcon size={20} className="text-blue-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-white truncate">{school.name}</div>
                                  <div className="text-xs text-white/40">{school.slug}.seedify.ng</div>
                                </div>
                                <ArrowUpRight className="text-white/20 group-hover:text-blue-400 transition-colors" size={18} />
                              </button>
                            ))
                          ) : (
                            <div className="px-6 py-10 text-center">
                              <p className="font-bold text-white">No schools found</p>
                              <p className="text-sm text-white/40 mt-1">Check spelling or contact support</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          {/* Bottom: Massive Typography + Description */}
          <div className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                className="relative flex flex-col items-start gap-4"
              >
                <h1 className="text-[8vw] lg:text-[10vw] font-space font-black tracking-tighter text-white leading-[0.8] opacity-90 drop-shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                  SEEDD
                </h1>
                <h1 className="text-[6vw] lg:text-[7.5vw] font-space font-black tracking-tighter bg-gradient-to-b from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent leading-[0.8] drop-shadow-[0_0_80px_rgba(37,99,235,0.2)]">
                  ECO-SYSTEM
                </h1>
              </motion.div>

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
        </div>

        {/* Ambient Particles Decorator */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none" />
      </section>

      {/* --- TRUSTED BY --- */}
      <section className="relative -mt-4 z-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-6 lg:p-8 overflow-hidden">
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
      <section className="py-40 lg:py-60 bg-white overflow-hidden">
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
                <div className="w-32 h-32 rounded-full bg-[#020617] shadow-[0_20px_50px_rgba(2,6,23,0.3)] flex items-center justify-center relative z-10 border-4 border-white">
                  <LayoutGrid size={40} className="text-white" />
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

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-40 lg:py-60 px-6 bg-[#020617]">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-32">
            <div className="text-blue-500 font-black text-[10px] uppercase tracking-[0.5em] mb-8">Capabilities</div>
            <h2 className="text-5xl lg:text-8xl font-space font-black tracking-tight text-white leading-tight">
              A Platform Built for <br /> Modern Institutions.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Custom Feature Card for Dark Theme */}
            {[
              { icon: Database, title: "Unified Vault", desc: "A secure data architecture uniting students, staff, and financials into one core ledger.", delay: 0.1 },
              { icon: Zap, title: "Autonomous Flows", desc: "Intelligent automation that eliminates routine administrative overhead instantly.", delay: 0.2 },
              { icon: BarChart3, title: "Predictive Intel", desc: "Live performance dashboards that forecast academic outcomes and institutional growth.", delay: 0.3 },
              { icon: Globe, title: "Global Multi-Tenancy", desc: "Manage an entire network of schools from a single, centralized command center.", delay: 0.4 },
              { icon: Sparkles, title: "Identity First", desc: "Each institution receives a fully branded portal with custom domains and aesthetics.", delay: 0.5 },
              { icon: Lock, title: "Zero-Trust Security", desc: "Military-grade encryption and strict data isolation protocols built into every layer.", delay: 0.6 },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay, duration: 0.8 }}
                className="p-10 lg:p-12 rounded-[3rem] bg-white/5 border border-white/10 hover:border-blue-500/40 hover:bg-white/[0.08] transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full" />
                <div className="w-20 h-20 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 border border-blue-500/20">
                  <feature.icon size={36} className="text-blue-400" />
                </div>
                <h3 className="text-3xl font-black text-white mb-6 tracking-tight">{feature.title}</h3>
                <p className="text-white/50 text-lg leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- METHODOLOGY --- */}
      <section id="how-it-works" className="py-40 lg:py-60 bg-[#020617] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-32 items-center">
            <div className="space-y-16">
              <div className="text-blue-400 font-black text-[10px] uppercase tracking-[0.6em]">Methodology</div>
              <h2 className="text-6xl lg:text-9xl font-space font-black tracking-tight leading-[0.9]">
                Simple. <br /> Precise. <br /> Fast.
              </h2>
              <p className="text-2xl text-white/40 leading-relaxed font-medium max-w-lg">
                We've optimized the transition to digital excellence. No downtime, no data loss, just progress.
              </p>
            </div>
            
            <div className="space-y-12">
              {[
                { step: '01', title: 'Request Access', desc: 'Connect with our system architects to audit your current institutional structure.' },
                { step: '02', title: 'Core Integration', desc: 'We map your existing protocols into the SEEDD ecosystem with surgical precision.' },
                { step: '03', title: 'Operational Launch', desc: 'Unlock your portal and begin orchestrating your institution with absolute clarity.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-8 group">
                  <div className="text-4xl font-space font-bold text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity">{item.step}</div>
                  <div>
                    <h3 className="text-2xl font-bold mb-4 tracking-tight">{item.title}</h3>
                    <p className="text-slate-400 leading-relaxed font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- ONBOARDING FORM --- */}
      <section id="onboarding" className="py-40 lg:py-72 px-6 bg-[#020617]">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[4rem] border border-white/10 shadow-[0_50px_150px_-30px_rgba(0,0,0,0.5)] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-transparent pointer-events-none" />
            <div className="grid lg:grid-cols-5">
              <div className="lg:col-span-2 bg-blue-600 p-16 lg:p-24 text-white space-y-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <h2 className="text-5xl font-space font-black tracking-tight leading-tight">Initiate <br /> Onboarding.</h2>
                <p className="text-blue-100/70 text-lg font-medium leading-relaxed">
                  Join the network of elite institutions. Our team reviews all applications within 24 business hours.
                </p>
                <div className="space-y-8 pt-12">
                  {[
                    "Zero Data Leakage",
                    "Custom Domain Access",
                    "White-Glove Setup"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-5 text-sm font-black uppercase tracking-widest">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/20"><CheckCircle2 size={20} /></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3 p-16 lg:p-24 relative">
                <form className="space-y-12">
                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Institution Name</label>
                      <input 
                        type="text" 
                        placeholder="Greenfield Academy"
                        className="w-full h-16 px-8 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Contact Email</label>
                      <input 
                        type="email" 
                        placeholder="admin@school.edu"
                        className="w-full h-16 px-8 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Proposed Subdomain</label>
                    <div className="relative group">
                      <input 
                        type="text" 
                        placeholder="greenfield"
                        className="w-full h-16 px-8 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold pr-44"
                      />
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 text-white/20 font-black group-focus-within:text-blue-400 transition-colors">.seedify.ng</div>
                    </div>
                  </div>
                  <Button className="w-full h-20 text-xl font-space font-black uppercase tracking-widest mt-6 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.4)]">
                    Submit Application
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-black pt-40 pb-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-4 gap-24 mb-32">
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
