import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, db, handleFirestoreError, OperationType } from '../firebase';
import { Logo } from './Logo';
import { 
  LayoutDashboard, Users, BookOpen, Clock, Shield, Search, 
  Sparkles, CheckCircle2, ChevronRight, Zap, Globe, Cpu, 
  UserRound, GraduationCap, School as SchoolIcon, HeartHandshake,
  MessageSquare, BarChart3, Cloud, Tablet, Mail, Terminal,
  Lock, ArrowRight, Star
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import * as THREE from 'three';

const Button = ({ children, className, variant = 'primary', ...props }: any) => {
  const variants: any = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20",
    secondary: "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20",
    outline: "bg-transparent border border-white/30 hover:border-white/60 text-white"
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:pointer-events-none disabled:opacity-50 h-14 px-10 py-2 hover:scale-[1.02] active:scale-[0.98]",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const GlassCard = ({ children, className, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={cn(
      "bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 transition-colors group",
      className
    )}
  >
    {children}
  </motion.div>
);

export const LandingPage = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [schoolCount, setSchoolCount] = useState<number>(0);
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  // Optimized Three.js Particles Background
  useEffect(() => {
    if (!mountRef.current) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Particle system
    const particlesGeometry = new THREE.BufferGeometry();
    const count = 1500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 100;
      colors[i] = Math.random();
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.15,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    camera.position.z = 30;

    let requestId: number;
    const animate = () => {
      requestId = requestAnimationFrame(animate);
      particles.rotation.y += 0.0005;
      particles.rotation.x += 0.0002;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestId);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'schools'), (snapshot) => {
      setSchoolCount(snapshot.size);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'schools'));
    return () => unsubscribe();
  }, []);

  return (
    <div className="relative bg-[#020617] min-h-screen text-slate-100 selection:bg-blue-500/30 selection:text-blue-100">
      {/* Three.js Background Container */}
      <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none opacity-40" />

      {/* Aurora Shadows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[150px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-600/5 blur-[100px] rounded-full" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 z-[2] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      <div className="fixed inset-0 z-[2] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <main className="relative z-10">
        {/* --- HERO SECTION --- */}
        <section className="relative pt-48 pb-32 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-12"
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-300 tracking-widest uppercase">The Future of School Intelligence</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-6xl md:text-8xl lg:text-9xl font-medium tracking-tight mb-10 leading-[0.9] text-white"
            >
              Evolve Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-500">Academic Core</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg md:text-2xl text-slate-400 max-w-4xl mx-auto mb-16 leading-relaxed"
            >
              SEED is the premier multi-tenant infrastructure designed to digitize, 
              modernize, and unify the entire school ecosystem. Built for growth, 
              security, and absolute performance.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24"
            >
              <Link to="/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto text-xl h-16 group">
                  Enter The Platform
                  <ArrowRight className="ml-2 w-6 h-6 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/about" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto text-xl h-16">
                  Technical Overview
                </Button>
              </Link>
            </motion.div>

            {/* Premium Mockup/Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="relative max-w-6xl mx-auto"
            >
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-[3rem] blur-2xl opacity-50" />
              <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden aspect-[16/10] sm:aspect-[16/8]">
                {/* Internal UI Mockup Elements */}
                <div className="absolute top-0 left-0 w-full h-12 bg-white/5 border-b border-white/5 flex items-center px-6 gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500/20" />
                   <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                   <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
                   <div className="ml-4 h-6 w-48 bg-white/10 rounded-full" />
                </div>
                <div className="grid grid-cols-12 h-full pt-12">
                   <div className="col-span-3 border-r border-white/5 p-6 space-y-6">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-4 w-full bg-white/5 rounded-md" />
                      ))}
                   </div>
                   <div className="col-span-9 p-8">
                      <div className="grid grid-cols-3 gap-6 mb-8">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-32 bg-white/5 rounded-3xl border border-white/10" />
                        ))}
                      </div>
                      <div className="h-64 bg-blue-500/5 rounded-3xl border border-blue-500/10 flex items-center justify-center">
                         <BarChart3 className="text-blue-500/20 w-24 h-24" />
                      </div>
                   </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- STATS SECTION --- */}
        <section className="py-24 px-6 border-y border-white/5 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
              {[
                { label: 'Schools Integrated', value: schoolCount, suffix: '+', icon: SchoolIcon, color: 'text-blue-400' },
                { label: 'Platform Uptime', value: '100', suffix: '%', icon: Shield, color: 'text-emerald-400' },
                { label: 'Node Latitude', value: 'Low', suffix: ' Latency', icon: Zap, color: 'text-amber-400' },
                { label: 'Data Encryption', value: '256', suffix: '-bit', icon: Lock, color: 'text-cyan-400' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="space-y-4 text-center lg:text-left"
                >
                  <div className={cn("p-3 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mx-auto lg:mx-0", stat.color)}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <div className="text-5xl font-bold text-white mb-1">
                      {stat.value}{stat.suffix}
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- ARCHITECTURE GRID --- */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-end justify-between gap-10 mb-20 text-left">
              <div className="max-w-2xl">
                <h2 className="text-5xl font-medium tracking-tight mb-6">Designed for Every <br /> Stakeholder</h2>
                <p className="text-xl text-slate-400">The SEED ecosystem provides customized portals optimized for the specific needs of each user class.</p>
              </div>
              <Link to="/features">
                <button className="flex items-center gap-2 text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-widest text-sm">
                  View Full Specs <ArrowRight size={18} />
                </button>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-10">
              {[
                { 
                  title: 'School Administrators', 
                  desc: 'Comprehensive oversight of revenue, institutional analytics, and personnel management. A true central command.', 
                  icon: LayoutDashboard,
                  features: ['Revenue Tracking', 'Audit Logs', 'Roll Management']
                },
                { 
                  title: 'Teacher Workspace', 
                  desc: 'Instant result computation, attendance tracking, and smart lesson planners. Reclaim your time.', 
                  icon: Sparkles,
                  features: ['Auto-Grading', 'Attendance', 'Resource Library']
                },
                { 
                  title: 'Student Portal', 
                  desc: 'A digital academic hub to view report cards, track performance trends, and manage assignments.', 
                  icon: GraduationCap,
                  features: ['Trend Analysis', 'Result Archive', 'Profile Sync']
                },
                { 
                  title: 'Parent Gateway', 
                  desc: 'Stay tethered to your child\'s progress with instant updates on fees, attendance, and performance.', 
                  icon: HeartHandshake,
                  features: ['Instant Reports', 'Fee Invoices', 'Teacher Comms']
                },
              ].map((persona, i) => (
                <GlassCard key={i} delay={i * 0.1}>
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-16 h-16 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <persona.icon size={32} />
                    </div>
                    <div className="flex gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] pt-4">
                       Active Now <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-semibold mb-6">{persona.title}</h3>
                  <p className="text-slate-400 text-lg mb-8 leading-relaxed">{persona.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {persona.features.map((f, j) => (
                      <span key={j} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-semibold text-slate-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* --- SYSTEM STABILITY SECTION --- */}
        <section className="py-40 bg-[radial-gradient(circle_at_50%_50%,#1e1b4b_0%,#020617_100%)] overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 relative">
             <div className="flex flex-col lg:flex-row gap-24 items-center">
                <div className="flex-1 space-y-10">
                   <div className="inline-flex items-center gap-2 text-cyan-400">
                      <Terminal size={20} />
                      <span className="font-mono text-xs tracking-widest uppercase">System Core Protocol</span>
                   </div>
                   <h2 className="text-5xl md:text-7xl font-medium leading-[0.9]">Absolute <br /> Infrastructure.</h2>
                   <p className="text-xl text-slate-400 leading-relaxed max-w-lg">
                      Every instance of SEED is hardened with multi-tenant data isolation, 
                      automatic secondary failovers, and low-latency Firebase synchronization.
                   </p>
                   <ul className="space-y-6">
                      {[
                        'End-to-End Encryption for Results',
                        'Multi-School Subdomain Isolation',
                        'Infinite Cloud Scalability'
                      ].map((u, i) => (
                        <li key={i} className="flex items-center gap-4 text-white font-medium">
                           <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                              <Star size={12} className="text-cyan-400" />
                           </div>
                           {u}
                        </li>
                      ))}
                   </ul>
                </div>
                <div className="flex-1 relative">
                   <div className="absolute -inset-10 bg-blue-500/10 blur-[120px] rounded-full" />
                   <div className="relative p-1 rounded-3xl bg-gradient-to-br from-white/10 to-transparent">
                      <div className="bg-slate-950 rounded-3xl p-8 border border-white/5">
                         <div className="space-y-4">
                            {[...Array(6)].map((_, i) => (
                              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20" />
                                    <div className="h-3 w-32 bg-white/10 rounded" />
                                 </div>
                                 <div className="h-3 w-16 bg-blue-500/20 rounded" />
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* --- CTA SECTION --- */}
        <section className="py-40 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative p-12 md:p-24 rounded-[4rem] bg-gradient-to-br from-blue-600 to-indigo-900 overflow-hidden text-center"
            >
              <div className="absolute top-0 right-0 w-full h-full opacity-30 pointer-events-none">
                 <div className="absolute top-[-50%] right-[-20%] w-[100%] h-[100%] bg-white/10 blur-[100px] rounded-full" />
              </div>
              
              <div className="relative z-10 space-y-10">
                <h2 className="text-5xl md:text-7xl font-medium tracking-tight text-white leading-none">Ready to Lead?</h2>
                <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
                   Join the progressive network of schools building the future of academic management.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                  <Link to="/login" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto h-20 px-16 text-2xl bg-white text-blue-900 hover:bg-blue-50 shadow-2xl">
                      Get Started Today
                    </Button>
                  </Link>
                  <button className="text-lg font-bold text-white hover:text-blue-100 transition-all flex items-center gap-2 group">
                    Request Demo <ChevronRight size={24} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 pt-32 pb-12 border-t border-white/5 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-16 mb-20">
          <div className="col-span-2 space-y-8">
            <Logo variant="white" size="md" />
            <p className="text-slate-400 max-w-sm text-lg leading-relaxed">
              SEED is an advanced multi-tenant academic intelligence platform, 
              empowering schools worldwide to digitize and scale their impact.
            </p>
            <div className="flex gap-4">
              {[Globe, Mail, Users].map((Icon, i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                  <Icon size={20} />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="font-bold text-white uppercase tracking-widest text-sm">Platform</h4>
            <ul className="space-y-4 text-slate-400 font-medium">
              <li><Link to="/about" className="hover:text-blue-400 transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-blue-400 transition-colors">Enterprise</Link></li>
              <li><Link to="/login" className="hover:text-blue-400 transition-colors">Control Center</Link></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="font-bold text-white uppercase tracking-widest text-sm">Developer</h4>
            <ul className="space-y-4 text-slate-400 font-medium">
              <li><Link to="/contact" className="hover:text-blue-400 transition-colors">API Docs</Link></li>
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Security Audit</Link></li>
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-sm font-medium">
          <p>&copy; 2026 SEED Platform. A Kreative Kube Production.</p>
          <div className="flex gap-8 items-center">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
               <span>Nodes: Online</span>
            </div>
            <span>Global Delivery Network</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
