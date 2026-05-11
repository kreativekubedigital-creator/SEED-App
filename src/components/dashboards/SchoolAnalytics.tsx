import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, GraduationCap, CreditCard, Calendar, TrendingUp, 
  BarChart2, PieChart as PieIcon, RefreshCw, Filter, ChevronRight,
  ArrowUpRight, ArrowDownRight, Activity, AlertTriangle
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

  useEffect(() => {
    if (!selectedSession && sessions.length > 0) {
      setSelectedSession(sessions[0].id);
    }
  }, [sessions, selectedSession]);

  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching analytics for school:", school.id, "Session:", selectedSession, "Term:", selectedTerm);
      const analytics = await fetchSchoolAnalytics(school.id, selectedSession, selectedTerm);
      setData(analytics);
    } catch (err: any) {
      console.error("Error loading analytics:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSession || sessions.length === 0) {
      loadData();
    }
  }, [selectedSession, selectedTerm, school.id]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">Calculating intelligence insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Analysis Failed</h3>
        <p className="text-slate-500 max-w-md mb-6">{error}</p>
        <button 
          onClick={loadData}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data || (sessions.length === 0 && !loading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-200 p-12 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
          <TrendingUp size={40} className="text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Academic Data Yet</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          Initialize your school to see intelligence insights. Go to settings and click "Quick Setup" to get started.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:scale-105 transition-all">
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      {/* Executive Header & Intelligent Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[10px] font-semibold text-blue-600/80 uppercase tracking-[0.2em]">Operational Intelligence</span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight font-space">Intelligence Dashboard</h2>
          <p className="text-sm text-slate-400 font-medium italic">Strategic insights for {school.name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 shadow-sm flex-grow lg:flex-grow-0">
            <div className="flex items-center gap-2 pl-3 pr-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Filter</span>
            </div>
            <div className="w-px h-6 bg-slate-100" />
            <select 
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none py-2 px-3 cursor-pointer appearance-none hover:text-blue-600 transition-colors"
            >
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="w-px h-4 bg-slate-100" />
            <select 
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none py-2 px-3 cursor-pointer appearance-none hover:text-blue-600 transition-colors"
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
              <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50">
                  <TrendingUp size={18} />
                </div>
                Revenue Stream
              </h3>
              <p className="text-sm text-slate-400 font-medium mt-1">Financial health & collection efficiency</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Efficiency Rate</span>
              <span className="text-2xl font-semibold text-emerald-500">
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
            <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Net Collection</p>
              </div>
              <p className="text-2xl font-semibold text-slate-900">₦{data.overview.finance.totalCollected.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1 text-emerald-600/80">
                <ArrowUpRight size={14} />
                <span className="text-[10px] font-medium">Stable Growth</span>
              </div>
            </div>
            <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Total Outstanding</p>
              </div>
              <p className="text-2xl font-semibold text-slate-900">₦{data.overview.finance.outstanding.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1 text-amber-600/80">
                <ArrowDownRight size={14} />
                <span className="text-[10px] font-medium">Recovery Needed</span>
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
            <h3 className="text-xl font-semibold flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/10">
                <BarChart2 size={18} />
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
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Top Performer</p>
              <p className="text-lg font-semibold text-blue-400">{data.academics.classRankings[0]?.name || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Mean Score</p>
              <p className="text-2xl font-semibold text-white">
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
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100/50">
                <PieIcon size={18} />
              </div>
              Grade Velocity
            </h3>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Academic Quality</span>
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
                <div key={grade.name} className="flex flex-col p-3 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GRADE_COLORS[grade.name as keyof typeof GRADE_COLORS] }} />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Grade {grade.name}</span>
                  </div>
                  <span className="text-xl font-semibold text-slate-900">{grade.value}</span>
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
          className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative overflow-hidden group border border-slate-800"
        >
          {/* Decorative shapes */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-blue-400/5 rounded-full blur-2xl" />

          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={20} className="text-blue-400" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Operational Excellence</span>
              </div>
              <h3 className="text-3xl font-semibold tracking-tight mb-4 leading-tight">System Stability <br/> Is Optimal</h3>
              <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-[80%]">
                Current data flow indicates 98.4% institutional digitization. Academic and financial subsystems are fully synchronized.
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800 grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">System Health</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold">99.9%</span>
                  <div className="h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-emerald-500/80" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Network Status</p>
                <div className="flex items-center gap-2 text-emerald-500/80 font-medium uppercase tracking-widest text-[10px]">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
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
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] group transition-all duration-500 relative overflow-hidden"
    >
      <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity rotate-12">
        <Icon size={120} strokeWidth={1} />
      </div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className={cn("p-3 rounded-2xl border-0 shadow-sm transition-all duration-500 group-hover:scale-110", colorMap[color as keyof typeof colorMap])}>
          <Icon size={20} />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
          isPositive ? "bg-emerald-50 text-emerald-600/80 border-emerald-100" : "bg-red-50 text-red-600/80 border-red-100"
        )}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-1 group-hover:text-slate-500 transition-colors">{title}</p>
        <h4 className="text-3xl font-semibold text-slate-900 tracking-tight group-hover:translate-x-1 transition-transform duration-500">{value}</h4>
      </div>
    </motion.div>
  );
};

