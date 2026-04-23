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
  Cloud, Terminal, Command, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { HeroBackground } from './HeroBackground';

const Button = ({ children, className, variant = 'primary', ...props }: any) => {
  const variants: any = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_20px_40px_-12px_rgba(37,99,235,0.4)] border border-blue-500/20",
    secondary: "bg-slate-900 hover:bg-black text-white shadow-xl shadow-black/10",
    outline: "bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-900 transition-all duration-300"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:pointer-events-none disabled:opacity-50 h-14 px-10 py-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    className="p-8 lg:p-10 rounded-[2.5rem] bg-white border border-slate-100 hover:border-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 group"
  >
    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
      <Icon size={32} className="text-blue-600" />
    </div>
    <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">{title}</h3>
    <p className="text-slate-600 leading-relaxed font-medium">{desc}</p>
  </motion.div>
);

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
    <div className="relative bg-white min-h-screen text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden font-inter">
      
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex flex-col pt-32 lg:pt-40 px-6 overflow-hidden">
        <HeroBackground />
        
        {/* Top Glow Edge */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="max-w-7xl mx-auto w-full relative z-10 flex-grow flex flex-col justify-center">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            {/* Left: CTAs */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-wrap gap-4"
              >
                <Button 
                  onClick={() => setIsSearchVisible(!isSearchVisible)}
                  className="h-16 px-10 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] flex items-center gap-3 transition-all active:scale-95"
                >
                  Find your School
                  <ArrowRight size={20} />
                </Button>
                
                <Link to="/#onboarding">
                  <Button 
                    variant="outline"
                    className="h-16 px-10 bg-white/5 backdrop-blur-xl border-white/20 text-white hover:bg-white/10 rounded-2xl font-bold transition-all active:scale-95"
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
                      className="w-full h-16 pl-14 pr-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl text-white placeholder:text-white/30 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-bold"
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

            {/* Right: Description */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:pl-12 space-y-6"
            >
              <h3 className="text-2xl font-space font-bold text-white leading-tight">
                Power the intelligence behind <br /> modern education.
              </h3>
              <p className="text-lg text-white/60 max-w-lg leading-relaxed font-medium">
                SEEDD connects institutions, centralizes data, and transforms everyday operations into a seamless, insight-driven system. 
                From administration to academics, everything works in sync—giving you clarity, control, and the ability to scale without friction.
              </p>
            </motion.div>
          </div>

          {/* Bottom: Massive Typography */}
          <div className="mt-auto pb-12">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              className="space-y-0"
            >
              <h1 className="text-[12vw] lg:text-[14vw] font-space font-black tracking-tighter text-white leading-[0.8] opacity-90">
                SEEDD
              </h1>
              <h1 className="text-[12vw] lg:text-[14vw] font-space font-black tracking-tighter bg-gradient-to-b from-blue-500 to-blue-800 bg-clip-text text-transparent leading-[0.8]">
                ECO-SYSTEM
              </h1>
            </motion.div>
          </div>
        </div>

        {/* Ambient Particles Decorator */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none" />
      </section>

      {/* --- TRUSTED BY --- */}
      <section className="py-20 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-12">Empowering Excellence Across Regions</p>
          <div className="flex flex-wrap justify-center items-center gap-x-20 gap-y-10 opacity-60">
            {['Greenfield Academy', 'Crestview College', 'NobleGate Schools', 'FutureGate College'].map((school, i) => (
              <div key={i} className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default">
                <SchoolIcon size={24} className="text-slate-400" />
                <span className="font-space font-bold text-slate-500 uppercase text-xs tracking-widest">{school}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-32 lg:py-48 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-24">
            <div className="text-blue-600 font-bold text-[10px] uppercase tracking-[0.4em] mb-6">Capabilities</div>
            <h2 className="text-5xl lg:text-7xl font-space font-bold tracking-tight text-slate-950 leading-tight">
              A Platform Built for <br /> Modern Institutions.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Database} 
              title="Unified Vault" 
              desc="A secure data architecture uniting students, staff, and financials into one core ledger."
              delay={0.1}
            />
            <FeatureCard 
              icon={Zap} 
              title="Autonomous Flows" 
              desc="Intelligent automation that eliminates routine administrative overhead instantly."
              delay={0.2}
            />
            <FeatureCard 
              icon={BarChart3} 
              title="Predictive Intel" 
              desc="Live performance dashboards that forecast academic outcomes and institutional growth."
              delay={0.3}
            />
            <FeatureCard 
              icon={Globe} 
              title="Global Multi-Tenancy" 
              desc="Manage an entire network of schools from a single, centralized command center."
              delay={0.4}
            />
            <FeatureCard 
              icon={Sparkles} 
              title="Identity First" 
              desc="Each institution receives a fully branded portal with custom domains and aesthetics."
              delay={0.5}
            />
            <FeatureCard 
              icon={Lock} 
              title="Zero-Trust Security" 
              desc="Military-grade encryption and strict data isolation protocols built into every layer."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* --- METHODOLOGY --- */}
      <section id="how-it-works" className="py-32 lg:py-48 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-12">
              <div className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.4em]">Methodology</div>
              <h2 className="text-5xl lg:text-7xl font-space font-bold tracking-tight leading-[1.1]">
                Simple. <br /> Precise. <br /> Fast.
              </h2>
              <p className="text-xl text-slate-400 leading-relaxed font-medium max-w-lg">
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
      <section id="onboarding" className="py-32 lg:py-56 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="grid lg:grid-cols-5">
              <div className="lg:col-span-2 bg-blue-600 p-12 lg:p-20 text-white space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full" />
                <h2 className="text-4xl font-space font-bold tracking-tight leading-tight">Initiate <br /> Onboarding.</h2>
                <p className="text-blue-100 font-medium leading-relaxed">
                  Join the network of elite institutions. Our team reviews all applications within 24 business hours.
                </p>
                <div className="space-y-6 pt-10">
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 size={18} /></div>
                    Zero Data Leakage
                  </div>
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 size={18} /></div>
                    Custom Domain Access
                  </div>
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 size={18} /></div>
                    White-Glove Setup
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 p-12 lg:p-20">
                <form className="space-y-10">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Institution Name</label>
                      <input 
                        type="text" 
                        placeholder="Greenfield Academy"
                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Contact Email</label>
                      <input 
                        type="email" 
                        placeholder="admin@school.edu"
                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Proposed Subdomain</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="greenfield"
                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold pr-36"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">.seedify.ng</div>
                    </div>
                  </div>
                  <Button className="w-full h-16 text-lg font-space mt-4">
                    Submit Application
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white pt-32 pb-16 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-4 gap-20 mb-24">
            <div className="col-span-1 lg:col-span-2 space-y-8">
              <Logo variant="black" size="md" />
              <p className="text-xl text-slate-600 font-medium max-w-sm leading-relaxed">
                The intelligent nervous system for the next generation of academic excellence.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-12 lg:col-span-2">
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Platform</h4>
                <ul className="space-y-4 text-sm font-medium text-slate-500">
                  <li><a href="#features" className="hover:text-blue-600 transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="hover:text-blue-600 transition-colors">Methodology</a></li>
                  <li><a href="#" className="hover:text-blue-600 transition-colors">Pricing</a></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Support</h4>
                <ul className="space-y-4 text-sm font-medium text-slate-500">
                  <li><a href="#" className="hover:text-blue-600 transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-blue-600 transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-blue-600 transition-colors">Security</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-400 text-xs font-medium">© 2024 SEEDD Intelligence. Built for global scaling.</p>
            <div className="flex gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
