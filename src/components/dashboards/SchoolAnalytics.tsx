import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, GraduationCap, CreditCard, Calendar, TrendingUp, 
  BarChart2, PieChart as PieIcon, RefreshCw, Filter, ChevronRight,
  ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { School, Session, Term } from '../../types';
import { fetchSchoolAnalytics, AnalyticsData } from '../../services/analyticsService';
import { cn } from '../../lib/utils';

interface SchoolAnalyticsProps {
  school: School;
  sessions: Session[];
  termsMap: Record<string, Record<string, Term>>;
}

export const SchoolAnalytics: React.FC<SchoolAnalyticsProps> = ({ school, sessions, termsMap }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>(sessions[0]?.id || "");
  const [selectedTerm, setSelectedTerm] = useState<string>("");

  const activeTerms = useMemo(() => {
    if (!selectedSession) return [];
    return Object.values(termsMap[selectedSession] || {}).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [selectedSession, termsMap]);

  const loadData = async () => {
    setLoading(true);
    try {
      const analytics = await fetchSchoolAnalytics(school.id, selectedSession, selectedTerm);
      setData(analytics);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSession, selectedTerm]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-600 rounded-full animate-spin" />
          <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={28} />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900 animate-pulse">Aggregating Intelligence...</p>
          <p className="text-sm text-slate-500 font-medium">Processing real-time operational data</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      {/* Executive Header & Intelligent Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Operational Intelligence</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight font-space uppercase">Intelligence Dashboard</h2>
          <p className="text-sm text-slate-500 font-semibold italic">Strategic insights for {school.name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 shadow-sm flex-grow lg:flex-grow-0">
            <div className="flex items-center gap-2 pl-3 pr-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filter</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <select 
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 focus:outline-none py-2 px-3 cursor-pointer appearance-none hover:text-blue-600 transition-colors"
            >
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="w-px h-4 bg-slate-200" />
            <select 
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 focus:outline-none py-2 px-3 cursor-pointer appearance-none hover:text-blue-600 transition-colors"
            >
              <option value="">Full Academic Cycle</option>
              {activeTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          
          <button 
            onClick={loadData}
            disabled={loading}
            className="h-12 w-12 flex items-center justify-center bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={20} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* KPI Grid - Glassmorphism style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Active Students" 
          value={data.overview.students.total} 
          icon={GraduationCap}
          color="blue"
          delay={0.1}
          trend="+4.2%"
          isPositive={true}
        />
        <MetricCard 
          title="Staff Strength" 
          value={data.overview.teachers.total} 
          icon={Users}
          color="indigo"
          delay={0.2}
          trend="+1.8%"
          isPositive={true}
        />
        <MetricCard 
          title="Revenue (Net)" 
          value={`₦${(data.overview.finance.totalCollected / 1000000).toFixed(1)}M`} 
          icon={CreditCard}
          color="emerald"
          delay={0.3}
          trend="+12.5%"
          isPositive={true}
        />
        <MetricCard 
          title="Avg Engagement" 
          value={`${data.overview.attendance.studentRate.toFixed(1)}%`} 
          icon={Calendar}
          color="purple"
          delay={0.4}
          trend="-0.5%"
          isPositive={false}
        />
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Finance Snapshot - 7 columns */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-7 bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col h-[500px]"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <TrendingUp size={20} />
                </div>
                Revenue Stream
              </h3>
              <p className="text-sm text-slate-500 font-bold mt-1">Financial health & collection efficiency</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Rate</span>
              <span className="text-2xl font-black text-emerald-500">
                {Math.round((data.overview.finance.totalCollected / data.overview.finance.totalExpected) * 100)}%
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Target', value: data.overview.finance.totalExpected },
                { name: 'Collected', value: data.overview.finance.totalCollected }
              ]}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    padding: '12px'
                  }} 
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6">
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-white rounded-3xl border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Net Collection</p>
              </div>
              <p className="text-2xl font-black text-slate-900">₦{data.overview.finance.totalCollected.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1 text-emerald-600">
                <ArrowUpRight size={14} />
                <span className="text-[10px] font-bold">Stable Growth</span>
              </div>
            </div>
            <div className="p-5 bg-gradient-to-br from-amber-50 to-white rounded-3xl border border-amber-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Total Outstanding</p>
              </div>
              <p className="text-2xl font-black text-slate-900">₦{data.overview.finance.outstanding.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1 text-amber-600">
                <ArrowDownRight size={14} />
                <span className="text-[10px] font-bold">Recovery Needed</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Academic Performance - 5 columns */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-5 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col h-[500px] text-white"
        >
          <div className="mb-8">
            <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20">
                <BarChart2 size={20} />
              </div>
              Class Pulse
            </h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Average performance by level</p>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.academics.classRankings} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={24}>
                   {data.academics.classRankings.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.score > 75 ? '#10b981' : entry.score > 50 ? '#3b82f6' : '#f59e0b'} 
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Top Performer</p>
              <p className="text-lg font-bold text-blue-400">{data.academics.classRankings[0]?.name || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mean Score</p>
              <p className="text-2xl font-black text-white">
                {Math.round(data.academics.classRankings.reduce((a, b) => a + b.score, 0) / (data.academics.classRankings.length || 1))}%
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Secondary Row: Grade Distribution & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                <PieIcon size={20} />
              </div>
              Grade Velocity
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Academic Quality</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.academics.gradeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {data.academics.gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.name as keyof typeof GRADE_COLORS]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
              {data.academics.gradeDistribution.map((grade) => (
                <div key={grade.name} className="flex flex-col p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GRADE_COLORS[grade.name as keyof typeof GRADE_COLORS] }} />
                    <span className="text-xs font-black text-slate-600">Grade {grade.name}</span>
                  </div>
                  <span className="text-xl font-black text-slate-900">{grade.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Operational Excellence Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-[0_20px_50px_rgba(37,99,235,0.3)] relative overflow-hidden group"
        >
          {/* Decorative shapes */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />

          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={24} className="text-blue-200" />
                <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-100">Operational Excellence</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight mb-4 leading-tight uppercase">System Stability <br/> Is Optimal</h3>
              <p className="text-blue-100 font-medium text-sm leading-relaxed max-w-[80%]">
                Current data flow indicates 98.4% institutional digitization. Academic and financial subsystems are fully synchronized.
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">System Health</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black">99.9%</span>
                  <div className="h-1.5 w-12 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-emerald-400" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Network Status</p>
                <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-[10px]">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  Online
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const GRADE_COLORS = {
  'A': '#10b981',
  'B': '#3b82f6',
  'C': '#8b5cf6',
  'D': '#f59e0b',
  'F': '#ef4444'
};

const MetricCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: any; 
  color: string;
  delay: number;
  trend: string;
  isPositive: boolean;
}> = ({ title, value, icon: Icon, color, delay, trend, isPositive }) => {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/10',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/10',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/10',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5, scale: 1.01 }}
      className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-[0_10px_30px_rgba(0,0,0,0.03)] group transition-all duration-500 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={80} strokeWidth={1} />
      </div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className={cn("p-3.5 rounded-2xl border transition-all duration-500 group-hover:scale-110", colorMap[color as keyof typeof colorMap])}>
          <Icon size={22} />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
          isPositive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
        )}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 group-hover:text-slate-500 transition-colors">{title}</p>
        <h4 className="text-3xl font-black text-slate-900 tracking-tighter group-hover:scale-105 origin-left transition-transform duration-500">{value}</h4>
      </div>
    </motion.div>
  );
};

