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
import { School } from '../types';

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
      <section className="relative pt-32 pb-20 lg:pt-56 lg:pb-40 px-6">
        {/* Background Design */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-blue-50/50 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-indigo-50/30 blur-[100px] rounded-full" />
          <div className="absolute inset-0 opacity-[0.015] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            {/* Content */}
            <div className="space-y-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 text-xs font-bold tracking-wide uppercase shadow-sm"
              >
                <Sparkles size={14} className="animate-pulse" />
                <span>Modern School OS</span>
              </motion.div>

              <div className="space-y-8">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="text-6xl lg:text-8xl font-space font-bold tracking-tight text-slate-950 leading-[0.95]"
                >
                  Orchestrate <br />
                  <span className="text-blue-600">Academic Flow</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="text-xl text-slate-600 max-w-xl leading-relaxed font-medium"
                >
                  The unified ecosystem powering the next generation of education. 
                  Automate complex operations and deliver real-time predictive insights.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="relative flex-1" ref={dropdownRef}>
                  <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                    <input 
                      type="text"
                      placeholder="Find your school..."
                      className="w-full h-16 pl-14 pr-6 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 font-bold"
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
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[300px] overflow-y-auto"
                      >
                        {filteredSchools.length > 0 ? (
                          filteredSchools.map(school => (
                            <button
                              key={school.id}
                              onClick={() => handleSchoolSelect(school)}
                              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0 group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                {school.logoUrl ? (
                                  <img src={school.logoUrl} alt="" className="w-6 h-6 object-contain" />
                                ) : (
                                  <SchoolIcon size={20} className="text-blue-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-900 truncate">{school.name}</div>
                                <div className="text-xs text-slate-500">{school.slug}.seedify.ng</div>
                              </div>
                              <ArrowUpRight className="text-slate-300 group-hover:text-blue-600 transition-colors" size={18} />
                            </button>
                          ))
                        ) : (
                          <div className="px-6 py-10 text-center">
                            <p className="font-bold text-slate-900">No schools found</p>
                            <p className="text-sm text-slate-500 mt-1">Check spelling or contact support</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <Link to="/#onboarding" className="sm:w-auto">
                  <Button className="h-16 px-10 w-full gap-2 font-space">
                    <Plus size={20} />
                    Onboard Now
                  </Button>
                </Link>
              </motion.div>
              
              <div className="flex items-center gap-8 pt-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="" />
                    </div>
                  ))}
                </div>
                <div className="text-sm font-medium text-slate-600">
                  <span className="text-slate-900 font-bold">120+</span> institutions registered <br /> across the region
                </div>
              </div>
            </div>

            {/* Visual Column */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
                <div className="h-1.5 w-full bg-blue-600" />
                
                <div className="p-10 space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Logo variant="white" size="sm" />
                      </div>
                      <div>
                        <h3 className="font-space font-bold text-slate-900">System Intelligence</h3>
                        <p className="text-slate-500 text-xs font-medium">Real-time status: Active</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { label: 'Active Students', value: '4,892', icon: Users, color: 'text-blue-600' },
                      { label: 'Revenue (MTD)', value: '₦12.4M', icon: CreditCard, color: 'text-emerald-600' },
                      { label: 'Cloud Uptime', value: '99.9%', icon: Cloud, color: 'text-blue-500' },
                      { label: 'System Load', value: '12%', icon: Activity, color: 'text-indigo-600' },
                    ].map((stat, i) => (
                      <div key={i} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 group hover:bg-white hover:shadow-xl transition-all duration-300">
                        <stat.icon size={20} className={stat.color} />
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                          <p className="text-2xl font-space font-bold text-slate-900 mt-1">{stat.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="h-32 rounded-3xl bg-slate-950 p-6 flex flex-col justify-between overflow-hidden relative group">
                    <div className="absolute inset-0 bg-blue-600/10" />
                    <div className="flex justify-between items-center relative z-10">
                      <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-blue-400" />
                        <span className="text-[10px] font-mono text-blue-400">root@seedd: ~ analytics</span>
                      </div>
                      <TrendingUp size={16} className="text-emerald-400" />
                    </div>
                    <div className="flex items-end gap-1 h-12 relative z-10">
                      {[30, 45, 25, 60, 40, 85, 55, 90, 75, 100].map((h, i) => (
                        <div key={i} className="flex-1 bg-blue-500/40 rounded-sm hover:bg-blue-400 transition-colors" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorators */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50" />
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-indigo-100 rounded-full blur-3xl opacity-50" />
            </motion.div>
          </div>
        </div>
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
