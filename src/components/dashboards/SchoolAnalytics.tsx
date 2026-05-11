import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, GraduationCap, CreditCard, Calendar, TrendingUp, 
  BarChart2, PieChart as PieIcon, RefreshCw, Filter, ChevronRight
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
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
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={24} />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">Analyzing School Data...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Intelligence Dashboard</h2>
          <p className="text-sm text-slate-500 font-medium">Core operational metrics for {school.name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <Filter size={14} className="text-slate-400 ml-2" />
            <select 
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none py-1 pr-2 cursor-pointer"
            >
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <select 
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none py-1 pr-2 cursor-pointer"
            >
              <option value="">All Terms</option>
              {activeTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          
          <button 
            onClick={loadData}
            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
          >
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Students" 
          value={data.overview.students.total} 
          icon={GraduationCap}
          color="blue"
        />
        <MetricCard 
          title="Total Teachers" 
          value={data.overview.teachers.total} 
          icon={Users}
          color="indigo"
        />
        <MetricCard 
          title="Revenue Collected" 
          value={`₦${data.overview.finance.totalCollected.toLocaleString()}`} 
          icon={CreditCard}
          color="emerald"
        />
        <MetricCard 
          title="Avg Attendance" 
          value={`${data.overview.attendance.studentRate.toFixed(1)}%`} 
          icon={Calendar}
          color="purple"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Finance Snapshot */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              Collection Snapshot
            </h3>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.finance.paymentStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} width={80} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={40}>
                  {data.finance.paymentStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Collected</p>
              <p className="text-lg font-bold text-emerald-700">₦{data.overview.finance.totalCollected.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Outstanding</p>
              <p className="text-lg font-bold text-amber-700">₦{data.overview.finance.outstanding.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Academic Pulse */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-500" />
              Academic Performance by Class
            </h3>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.academics.classRankings}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={30}>
                   {data.academics.classRankings.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score > 75 ? '#10b981' : entry.score > 50 ? '#3b82f6' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-4">
            Average Score (%) per Class
          </p>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-6">
          <PieIcon size={18} className="text-purple-500" />
          Overall Grade Distribution
        </h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.academics.gradeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.academics.gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.name as keyof typeof GRADE_COLORS]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="middle" align="right" layout="vertical" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const GRADE_COLORS = {
  'A': '#10b981',
  'B': '#3b82f6',
  'C': '#8b5cf6',
  'D': '#f59e0b',
  'F': '#ef4444'
};

const MetricCard: React.FC<{ title: string; value: string | number; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm group hover:border-blue-300 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-xl border", colorMap[color as keyof typeof colorMap])}>
          <Icon size={20} />
        </div>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h4>
      </div>
    </motion.div>
  );
};
