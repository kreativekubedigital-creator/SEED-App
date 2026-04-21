import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, db, handleFirestoreError, OperationType } from '../firebase';
import { Logo } from './Logo';
import { 
  LayoutDashboard, Users, BookOpen, Clock, Shield, Search, 
  Sparkles, CheckCircle2, ChevronRight, Zap, Globe, Cpu, 
  UserRound, GraduationCap, School as SchoolIcon, HeartHandshake,
  MessageSquare, BarChart3, Cloud, Tablet, Mail
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  Scene, PerspectiveCamera, WebGLRenderer, QuadraticBezierCurve3,
  Vector3, TubeGeometry, ShaderMaterial, Mesh, AdditiveBlending,
  DoubleSide, Color, PlaneGeometry,
} from "three";

const Button = ({ children, className, ...props }: any) => (
  <button
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:pointer-events-none disabled:opacity-50 text-white h-12 px-8 py-2 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] border border-white/10",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

export const LandingPage = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [schoolCount, setSchoolCount] = useState<number>(0);

  // Three.js background logic (Retained and optimized)
  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new Scene();
    sceneRef.current = scene;
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xf8fafc, 0);
    mountRef.current.appendChild(renderer.domElement);

    const curves = [
      new QuadraticBezierCurve3(new Vector3(-15, -3, 0), new Vector3(0, 1, 0), new Vector3(12, -2, 0)),
      new QuadraticBezierCurve3(new Vector3(-14, -2, 0), new Vector3(1, 2, 0), new Vector3(10, -1, 0)),
      new QuadraticBezierCurve3(new Vector3(-16, -4, 0), new Vector3(-1, 0.5, 0), new Vector3(11, -3, 0))
    ];
    const colors = [new Color(0x88C1FF), new Color(0xA0D2FF), new Color(0x78B6FF)];

    curves.forEach((curve, index) => {
      const tubeGeometry = new TubeGeometry(curve, 200, index === 0 ? 0.8 : 0.6, 32, false);
      const material = new ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float time; uniform vec3 color; varying vec2 vUv;
          void main() {
            float pulse = sin(time * 1.5) * 0.1 + 0.9;
            float gradient = vUv.x;
            float glow = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 2.0);
            float fade = (vUv.x > 0.7) ? 1.0 - smoothstep(0.7, 1.0, vUv.x) : (vUv.x < 0.2 ? smoothstep(0.0, 0.2, vUv.x) : 1.0);
            gl_FragColor = vec4(color * gradient * pulse * glow * fade, glow * fade * 0.4);
          }`,
        uniforms: { time: { value: 0 }, color: { value: colors[index] } },
        transparent: true, blending: AdditiveBlending, side: DoubleSide,
      });
      scene.add(new Mesh(tubeGeometry, material));
    });

    camera.position.z = 7;
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;
      scene.traverse(obj => {
        if (obj instanceof Mesh && obj.material instanceof ShaderMaterial) obj.material.uniforms.time.value = time;
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'schools'), (snapshot) => {
      setSchoolCount(snapshot.size);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'schools'));
    return () => unsubscribe();
  }, []);

  return (
    <div className="relative bg-slate-50 min-h-screen overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      <div ref={mountRef} className="fixed inset-0 w-full h-screen pointer-events-none z-0" />

      {/* Decorative Blobs */}
      <div className="fixed top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Floating Elements Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400/20 rounded-full"
            initial={{ x: Math.random() * 100 + "%", y: Math.random() * 100 + "%" }}
            animate={{ 
              y: ["-20px", "20px"], 
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.5, 1]
            }}
            transition={{ 
              duration: 5 + Math.random() * 5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
        ))}
      </div>

      <main className="relative z-20">
        {/* --- HERO SECTION --- */}
        <section className="pt-40 pb-20 md:pt-52 md:pb-32 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-8"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 tracking-wider uppercase">Reimagining Education for the Digital Age</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-slate-900 mb-8 leading-[1.1]"
            >
              The Smart Core for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Your Modern School</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed"
            >
              SEED is an all-in-one digital ecosystem that streamlines administration, empowers teachers, and brings parents closer to their child's learning journey. Fast, secure, and mobile-ready.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Link to="/login">
                <Button className="w-full sm:w-auto h-14 px-10 text-lg">
                  Launch Your School Portal
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/about">
                <button className="w-full sm:w-auto h-14 px-10 rounded-full border border-slate-200 bg-white/50 backdrop-blur-md text-slate-700 font-medium hover:bg-white hover:border-slate-300 transition-all">
                  How it Works
                </button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative max-w-5xl mx-auto"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[2.5rem] blur opacity-10" />
              <div className="relative bg-white/40 backdrop-blur-xl border border-white/60 p-2 rounded-[2.5rem] shadow-2xl overflow-hidden aspect-[16/9]">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-purple-100/20" />
                <div className="relative w-full h-full bg-slate-50/50 rounded-[2rem] flex flex-col items-center justify-center p-8 border border-white/40">
                  <Logo variant="black" size="xl" className="opacity-10 scale-150 absolute" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full h-full p-4 relative z-10">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-4 shadow-sm animate-pulse" />
                    ))}
                    <div className="col-span-2 bg-blue-500/10 backdrop-blur-md rounded-2xl border border-blue-200/50 p-4 animate-pulse" />
                    <div className="col-span-2 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-4 animate-pulse" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- STATS SECTION --- */}
        <section className="py-20 bg-white/80 backdrop-blur-sm border-y border-slate-200/50 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { label: 'Schools Onboarded', value: schoolCount, suffix: '+', icon: SchoolIcon },
                { label: 'Uptime Reliability', value: '99.9', suffix: '%', icon: Cloud },
                { label: 'Fast Performance', value: '<50ms', suffix: '', icon: Zap },
                { label: 'Security Grade', value: 'Bank', suffix: '-Level', icon: Shield },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex justify-center mb-4 text-blue-600">
                    <stat.icon size={24} />
                  </div>
                  <div className="text-4xl font-bold text-slate-900">
                    {stat.value}{stat.suffix}
                  </div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-widest leading-tight">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FEATURES GRID --- */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 mb-6">Designed for the Entire Community</h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg">Every stakeholder gets a tailored experience crafted for maximum efficiency and clarity.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { 
                  title: 'School Administrators', 
                  desc: 'Full command of enrollment, revenue, teacher performance, and institutional data with just a few clicks.', 
                  icon: LayoutDashboard,
                  color: 'bg-blue-50 text-blue-600' 
                },
                { 
                  title: 'Smart Teaching Room', 
                  desc: 'Automated attendance, instant result computation, and lesson planning tools that save teachers hours every day.', 
                  icon: Sparkles,
                  color: 'bg-purple-50 text-purple-600' 
                },
                { 
                  title: 'Student Empowerment', 
                  desc: 'A digital workspace to track assignments, grades, and resources. Learning that is organized and engaging.', 
                  icon: GraduationCap,
                  color: 'bg-indigo-50 text-indigo-600' 
                },
                { 
                  title: 'Parent Engagement', 
                  desc: 'Real-time notifications on attendance, results, and fees. Close the gap between school and home.', 
                  icon: HeartHandshake,
                  color: 'bg-green-50 text-green-600' 
                },
                { 
                  title: 'AI Analytics', 
                  desc: 'Intelligent insights that predict student performance trends and help identify those who need extra support.', 
                  icon: Cpu,
                  color: 'bg-rose-50 text-rose-600' 
                },
                { 
                  title: 'Secure Multi-Tenancy', 
                  desc: 'Enterprise-grade data isolation. Every school gets its own secure vault for sensitive records.', 
                  icon: Shield,
                  color: 'bg-amber-50 text-amber-600' 
                },
              ].map((feat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="p-8 rounded-3xl bg-white border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", feat.color)}>
                    <feat.icon size={28} />
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 mb-4">{feat.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- DETAILED VALUE PROPOSITION --- */}
        <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500 rounded-full blur-[150px]" />
          </div>

          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8 leading-tight">Fast. Robust. <br /> Truly Digital.</h2>
              <div className="space-y-8">
                {[
                  { title: 'Data Independence', text: 'Each school operates on its own secure slug and isolated database structure.' },
                  { title: 'Offline-First Philosophy', text: 'Optimized for low-connectivity areas, ensuring learning never stops for anyone.' },
                  { title: 'Automated Records', text: 'Bye-bye paper logs. From attendance to report cards, everything is smart.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold mb-2">{item.title}</h4>
                      <p className="text-slate-400 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-white/10 p-4 relative">
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Logo variant="white" size="xl" className="opacity-20 translate-x-4 translate-y-4" />
                    <div className="relative z-10 grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
                        <MessageSquare className="mx-auto mb-4 text-blue-400" />
                        <span className="text-sm">Realtime Chat</span>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
                        <BarChart3 className="mx-auto mb-4 text-indigo-400" />
                        <span className="text-sm">Visual Reports</span>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
                        <Tablet className="mx-auto mb-4 text-purple-400" />
                        <span className="text-sm">Multi-Device</span>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
                        <Cloud className="mx-auto mb-4 text-emerald-400" />
                        <span className="text-sm">Auto-Sync</span>
                      </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- CTA SECTION --- */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative p-12 md:p-24 rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden text-center text-white"
            >
              <div className="absolute top-0 right-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-white rounded-full blur-[100px]" />
              </div>

              <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-8">Ready to evolve?</h2>
                <p className="text-xl text-blue-100 mb-12">
                  Join the growing movement of schools digitizing for the future. Start today and transform how your school works.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <Link to="/login" className="w-full sm:w-auto">
                    <button className="w-full h-16 px-12 rounded-full bg-white text-blue-600 font-bold text-lg hover:bg-blue-50 transition-all shadow-xl shadow-blue-900/20">
                      Get Started Now
                    </button>
                  </Link>
                  <button className="text-lg font-medium text-white/80 hover:text-white transition-all flex items-center gap-2">
                    Schedule a Demo <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 pt-20 pb-10 border-t border-slate-200 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <Logo variant="black" size="md" className="mb-6" />
            <p className="text-slate-500 max-w-sm mb-8">
              A comprehensive digital ecosystem designed to bring simplicity, transparency, and innovation to every school in the global landscape.
            </p>
            <div className="flex gap-4">
              {[Globe, Mail, Users].map((Icon, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                  <Icon size={18} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Product</h4>
            <ul className="space-y-4 text-slate-500">
              <li><Link to="/about" className="hover:text-blue-600 transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
              <li><Link to="/login" className="hover:text-blue-600 transition-colors">For Admin</Link></li>
              <li><Link to="/onboarding" className="hover:text-blue-600 transition-colors">Onboarding</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Support</h4>
            <ul className="space-y-4 text-slate-500">
              <li><Link to="/contact" className="hover:text-blue-600 transition-colors">Contact Us</Link></li>
              <li><Link to="/" className="hover:text-blue-600 transition-colors">Documentation</Link></li>
              <li><Link to="/" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/" className="hover:text-blue-600 transition-colors">Terms of Use</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
          <p>&copy; 2026 SEED. Developed by Kreative Kube Solutions.</p>
          <div className="flex gap-8">
            <span>Server Status: <span className="text-emerald-500 font-medium">Online</span></span>
            <span>Region: Global</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
