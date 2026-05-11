import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Award, 
  Zap, 
  Brain, 
  Activity,
  Heart,
  ChevronRight,
  ShieldCheck,
  Star,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { School, UserProfile, Class, Session, Term } from '../../types';
import { fetchSchoolAnalytics, AnalyticsData } from '../../services/analyticsService';
import { cn, formatDisplayString } from '../../lib/utils';

interface SchoolAnalyticsProps {
  school: School;
  sessions: Session[];
  termsMap: Record<string, Record<string, Term>>;
}

export const SchoolAnalytics: React.FC<SchoolAnalyticsProps> = ({ school, sessions, termsMap }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>(school.currentSessionId || (sessions.find(s => s.isCurrent)?.id || ''));
  const [selectedTerm, setSelectedTerm] = useState<string>(school.currentTermId || '');

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const result = await fetchSchoolAnalytics(school.id, selectedSession, selectedTerm);
        setData(result);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [school.id, selectedSession, selectedTerm]);

  if (loading && !data) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
          <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={24} />
        </div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing Intelligence...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Brain size={16} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Intelligence Dashboard</h2>
          </div>
          <p className="text-slate-500 text-sm font-medium">Real-time operational health and performance metrics.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <select 
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
          >
            <option value="">All Sessions</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {selectedSession && (
            <select 
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="flex-1 lg:flex-none px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
            >
              <option value="">All Terms</option>
              {termsMap[selectedSession] && Object.values(termsMap[selectedSession]).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Students" 
          value={data.overview.students.total}
          trend="+12%" 
          trendUp={true}
          icon={<GraduationCap size={20} />}
          sparkline={[40, 45, 42, 48, 50, 55, 60]}
          color="blue"
        />
        <MetricCard 
          title="Avg Performance" 
          value={`${Math.round(data.overview.academics.averagePerformance)}%`}
          trend="-2.4%" 
          trendUp={false}
          icon={<Award size={20} />}
          sparkline={[75, 72, 78, 70, 74, 71, 68]}
          color="indigo"
        />
        <MetricCard 
          title="Revenue Collected" 
          value={`₦${(data.overview.finance.totalCollected / 1000).toFixed(1)}k`}
          trend="+8.1%" 
          trendUp={true}
          icon={<CreditCard size={20} />}
          sparkline={[10, 20, 15, 30, 45, 40, 50]}
          color="emerald"
        />
        <MetricCard 
          title="Engagement XP" 
          value={data.overview.gamification.totalXP.toLocaleString()}
          trend="+24%" 
          trendUp={true}
          icon={<Zap size={20} />}
          sparkline={[100, 300, 200, 500, 800, 700, 1200]}
          color="amber"
        />
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Academic Analytics (Large) */}
        <div className="lg:col-span-8 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-8 group">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Academic Growth</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Average performance trend by assessment period</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp size={14} />
              <span className="text-[10px] font-black tracking-widest">ON TRACK</span>
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.academics.performanceTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ stroke: '#4f46e5', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4f46e5" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12 pt-8 border-t border-slate-50">
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Grade Distribution</h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.academics.gradeDistribution}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {data.academics.gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Top Performing Classes</h4>
              {data.academics.classRankings.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-300">0{i+1}</span>
                    <span className="text-sm font-bold text-slate-700">{formatDisplayString(c.name)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${c.score}%` }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                    <span className="text-xs font-black text-slate-900">{Math.round(c.score)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* School Health Score (Right Sidebar) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Health Score Card */}
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-8 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">School Health Score</h3>
              <div className="relative w-40 h-40 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-100"
                  />
                  <motion.circle
                    initial={{ strokeDashoffset: 440 }}
                    animate={{ strokeDashoffset: 440 - (440 * data.healthScore) / 100 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray="440"
                    fill="transparent"
                    className="text-blue-600 drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-900 leading-none">{data.healthScore}%</span>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">Optimal</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 font-medium px-4">Your school is performing within the top 5% of your region.</p>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <Brain size={24} className="text-blue-500 opacity-50 animate-pulse" />
            </div>
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6">Intelligence Insights</h3>
            <div className="space-y-4">
              {data.aiInsights.map((insight, i) => (
                <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="shrink-0 w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Zap size={14} className="text-blue-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-300 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Financial Analytics (Medium) */}
        <div className="lg:col-span-6 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Revenue Collection</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Fee collection efficiency and sources</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CreditCard size={20} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.finance.revenueSources}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 900 }}
                  />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="amount" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Collected</p>
                <p className="text-2xl font-black text-slate-900 mt-1">₦{data.overview.finance.totalCollected.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Outstanding</p>
                <p className="text-2xl font-black text-slate-900 mt-1">₦{data.overview.finance.outstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Productivity (Medium) */}
        <div className="lg:col-span-6 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Teacher Productivity</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Top performing faculty members</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Users size={20} />
            </div>
          </div>
          
          <div className="space-y-4">
            {data.teacherProductivity.rankings.map((teacher, i) => (
              <div key={teacher.name} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center font-black text-purple-600 text-sm">
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{teacher.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{teacher.submissions} Results • {teacher.lessons} Lessons</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900">{Math.round(teacher.score)}</span>
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Activity Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement Leaderboard (Medium) */}
        <div className="lg:col-span-6 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Student Engagement</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Top active students this session</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Flame size={20} />
            </div>
          </div>
          
          <div className="space-y-3">
            {data.engagement.leaderboard.map((student, i) => (
              <div key={student.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-slate-200/40">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-[10px] font-black text-slate-400">#0{i+1}</span>
                  {student.photo ? (
                    <img src={student.photo} className="w-9 h-9 rounded-xl object-cover border border-white shadow-sm" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-xs font-black text-slate-400 border border-slate-200 shadow-sm">
                      {student.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm font-bold text-slate-700">{student.name}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-600">
                  <Zap size={14} strokeWidth={3} />
                  <span className="text-sm font-black tracking-tight">{student.xp.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Trends (Medium) */}
        <div className="lg:col-span-6 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Attendance Heatmap</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Weekly student presence patterns</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <Activity size={20} />
            </div>
          </div>
          
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.attendance.studentTrend}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar 
                  dataKey="rate" 
                  fill="#ef4444" 
                  radius={[8, 8, 0, 0]}
                  animationDuration={1500}
                >
                  {data.attendance.studentTrend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate > 90 ? '#10b981' : entry.rate > 85 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Optimal ({'>'}90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Normal (85-90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Critical ({'<'}85%)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const MetricCard = ({ title, value, trend, trendUp, icon, sparkline, color }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-600 text-white shadow-blue-500/20",
    indigo: "bg-indigo-600 text-white shadow-indigo-500/20",
    emerald: "bg-emerald-600 text-white shadow-emerald-500/20",
    amber: "bg-amber-500 text-white shadow-amber-500/20"
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }}
      className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col justify-between group transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-6">
        <div className={cn("p-3 rounded-2xl shadow-lg transition-transform group-hover:scale-110 duration-500", colorClasses[color])}>
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black tracking-widest",
          trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend}
        </div>
      </div>
      
      <div>
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</h4>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 tracking-tighter">{value}</span>
        </div>
      </div>

      <div className="mt-6 h-8 w-full opacity-30 group-hover:opacity-100 transition-opacity duration-500">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkline.map((v: number, i: number) => ({ v, i }))}>
            <Line 
              type="monotone" 
              dataKey="v" 
              stroke={trendUp ? "#10b981" : "#ef4444"} 
              strokeWidth={3} 
              dot={false} 
              animationDuration={2000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
