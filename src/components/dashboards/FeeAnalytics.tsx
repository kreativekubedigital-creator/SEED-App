import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { School, Invoice, Payment, FeeStructure, Class, UserProfile, Session } from '../../types';
import { CheckCircle, Clock, TrendingUp, DollarSign, Wallet, CreditCard, ArrowUpRight, Filter, ChevronDown, Search, BarChart3 } from 'lucide-react';
import { format, parseISO, eachMonthOfInterval, isSameMonth, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { formatDisplayString, cn } from '../../lib/utils';

interface FeeAnalyticsProps {
  school: School;
  invoices: Invoice[];
  payments: Payment[];
  feeStructures: FeeStructure[];
  classes: Class[];
  termsMap: Record<string, Record<string, any>>;
  students: UserProfile[];
  sessions: Session[];
}

export const FeeAnalytics = ({ school, invoices, payments, feeStructures, classes, termsMap, students, sessions }: FeeAnalyticsProps) => {
  // 1. Filter State
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  // Default to current session/term if available
  const defaultSession = useMemo(() => {
    if (school.currentSessionId) return school.currentSessionId;
    const current = sessions.find(s => s.isCurrent);
    if (current) return current.id;
    return sessions.length > 0 ? sessions[0].id : 'all';
  }, [school.currentSessionId, sessions]);

  const defaultTerm = useMemo(() => {
    if (school.currentTermId) return school.currentTermId;
    if (defaultSession !== 'all' && termsMap[defaultSession]) {
      const current = Object.values(termsMap[defaultSession]).find((t: any) => t.isCurrent);
      if (current) return current.id;
    }
    return 'all';
  }, [school.currentTermId, defaultSession, termsMap]);

  const [selectedSession, setSelectedSession] = useState<string>(defaultSession);
  const [selectedTerm, setSelectedTerm] = useState<string>(defaultTerm);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Filter Logic (Internal helper for generic term matching)
  const isMatchingTerm = React.useCallback((invSessionId: string, invTermId: string) => {
    if (selectedTerm === 'all') return true;
    if (invTermId === selectedTerm) return true;
    
    if (selectedSession === 'all' && ['1st_term', '2nd_term', '3rd_term'].includes(selectedTerm)) {
      const termName = termsMap[invSessionId]?.[invTermId]?.name || '';
      const genericTermPrefix = selectedTerm.split('_')[0];
      return termName.toLowerCase().includes(genericTermPrefix.toLowerCase());
    }
    return false;
  }, [selectedTerm, selectedSession, termsMap]);

  const studentMap = useMemo(() => {
    return students.reduce((acc, s) => ({ ...acc, [s.uid]: s }), {} as Record<string, UserProfile>);
  }, [students]);

  const classLookup = useMemo(() => {
    return classes.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, Class>);
  }, [classes]);

  const sessionLookup = useMemo(() => {
    return sessions.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as Record<string, Session>);
  }, [sessions]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const student = students.find(s => s.uid === inv.studentId);
      const matchClass = selectedClass === 'all' || student?.classId === selectedClass;
      const matchSession = selectedSession === 'all' || inv.sessionId === selectedSession;
      const matchTerm = isMatchingTerm(inv.sessionId, inv.termId);

      return matchClass && matchSession && matchTerm;
    });
  }, [invoices, selectedClass, selectedSession, selectedTerm, students, termsMap]);

  // 4. Student Data for Breakdown Table (Reconciliation Logic)
  const studentFeeData = useMemo(() => {
    // Group invoices by student for faster lookup
    const invoicesByStudent = invoices.reduce((acc, inv) => {
      if (!acc[inv.studentId]) acc[inv.studentId] = [];
      acc[inv.studentId].push(inv);
      return acc;
    }, {} as Record<string, Invoice[]>);

    return students
      .filter(s => {
        const matchesClass = selectedClass === 'all' || s.classId === selectedClass;
        const matchesSearch = !searchQuery || 
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.uid.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesClass && matchesSearch;
      })
      .map(student => {
        // A. Calculate EXPECTED fee from structures
        const applicableStructures = feeStructures.filter(fs => {
          const matchClass = fs.classId === 'all' || fs.classId === student.classId;
          const matchSession = selectedSession === 'all' || fs.sessionId === selectedSession;
          const matchTerm = isMatchingTerm(fs.sessionId, fs.termId);
          return matchClass && matchSession && matchTerm;
        });

        const totalFee = applicableStructures.reduce((sum, fs) => sum + fs.amount, 0);

        // B. Calculate ACTUAL paid from invoices
        const studentInvoices = (invoicesByStudent[student.uid] || []).filter(inv => {
          const matchSession = selectedSession === 'all' || inv.sessionId === selectedSession;
          const matchTerm = isMatchingTerm(inv.sessionId, inv.termId);
          return matchSession && matchTerm;
        });

        const paid = studentInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
        const balance = totalFee - paid;
        
        const hasOverdue = studentInvoices.some(inv => {
          if (inv.status === 'paid' || inv.amountPaid >= inv.amount) return false;
          const term = termsMap[inv.sessionId]?.[inv.termId];
          if (term?.resumptionDate) {
            const resDate = new Date(term.resumptionDate);
            const oneMonthLater = new Date(resDate);
            oneMonthLater.setMonth(resDate.getMonth() + 1);
            return new Date() > oneMonthLater;
          }
          return new Date() > new Date(inv.dueDate);
        });

        return {
          student,
          totalFee,
          paid,
          balance,
          hasOverdue,
          hasInvoices: studentInvoices.length > 0
        };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [students, invoices, feeStructures, selectedClass, selectedSession, selectedTerm, searchQuery, termsMap, isMatchingTerm]);

  // 5. Analytics Aggregation (Updated to reflect reconciliation)
  const stats = useMemo(() => {
    const totalRevenue = studentFeeData.reduce((sum, d) => sum + d.paid, 0);
    const totalExpected = studentFeeData.reduce((sum, d) => sum + d.totalFee, 0);
    
    // Category totals from structures across all filtered students
    const tuitionTotal = studentFeeData.reduce((sum, d) => {
      const studentStructures = feeStructures.filter(fs => 
        (fs.classId === 'all' || fs.classId === d.student.classId) &&
        (selectedSession === 'all' || fs.sessionId === selectedSession) &&
        isMatchingTerm(fs.sessionId, fs.termId) &&
        fs.category === 'tuition'
      );
      return sum + studentStructures.reduce((s, fs) => s + fs.amount, 0);
    }, 0);

    const activitiesTotal = studentFeeData.reduce((sum, d) => {
      const studentStructures = feeStructures.filter(fs => 
        (fs.classId === 'all' || fs.classId === d.student.classId) &&
        (selectedSession === 'all' || fs.sessionId === selectedSession) &&
        isMatchingTerm(fs.sessionId, fs.termId) &&
        fs.category === 'activities'
      );
      return sum + studentStructures.reduce((s, fs) => s + fs.amount, 0);
    }, 0);

    const miscTotal = studentFeeData.reduce((sum, d) => {
      const studentStructures = feeStructures.filter(fs => 
        (fs.classId === 'all' || fs.classId === d.student.classId) &&
        (selectedSession === 'all' || fs.sessionId === selectedSession) &&
        isMatchingTerm(fs.sessionId, fs.termId) &&
        (fs.category === 'miscellaneous' || !['tuition', 'activities'].includes(fs.category))
      );
      return sum + studentStructures.reduce((s, fs) => s + fs.amount, 0);
    }, 0);

    return { totalRevenue, totalExpected, tuitionTotal, activitiesTotal, miscTotal };
  }, [studentFeeData, feeStructures, selectedSession, isMatchingTerm]);

  // 2. Chart Data Preparation (Last 6 Months)
  const chartData = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    const interval = eachMonthOfInterval({ start, end });
    
    return interval.map(month => {
      const monthPayments = payments.filter(p => 
        p.status === 'success' && isSameMonth(parseISO(p.date), month)
      );
      return {
        month: format(month, 'MMM'),
        amount: monthPayments.reduce((sum, p) => sum + p.amount, 0)
      };
    });
  }, [payments]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(amt);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Section: Analytics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Line/Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Fees Collection Over Time</h3>
              <p className="text-xs text-slate-500 mt-1">Monthly breakdown of successful payments</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={14} />
              <span className="text-[10px] font-bold">LIVE UPDATES</span>
            </div>
          </div>
          
          <div className="h-[240px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }}
                  tickFormatter={(value) => `₦${value/1000}k`}
                />
                <Tooltip 
                  cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)',
                    fontSize: '11px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'COLLECTED']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                  animationDuration={2000}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6 shadow-lg shadow-blue-500/50' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <StatCard 
            title="Total Revenue" 
            value={stats.totalRevenue} 
            subtitle={`Expected: ${formatCurrency(stats.totalExpected)}`}
            progress={stats.totalExpected > 0 ? (stats.totalRevenue / stats.totalExpected) * 100 : 0}
            icon={<DollarSign className="text-blue-600" size={18} />}
            color="blue"
          />
          <StatCard 
            title="Total Tuition" 
            value={stats.tuitionTotal} 
            icon={<Wallet className="text-emerald-600" size={18} />}
            color="emerald"
          />
          <StatCard 
            title="Total Activities" 
            value={stats.activitiesTotal} 
            icon={<CreditCard className="text-amber-600" size={18} />}
            color="amber"
          />
          <StatCard 
            title="Miscellaneous" 
            value={stats.miscTotal} 
            icon={<ArrowUpRight className="text-purple-600" size={18} />}
            color="purple"
          />
        </div>
      </div>

      {/* Fee Table: Core Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Student Fee Breakdown</h3>
              <p className="text-xs text-slate-500 mt-1">Real-time tracking of individual student balances</p>
            </div>
            <div className="flex gap-2">
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search students..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-100 outline-none w-48 transition-all"
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-xl transition-all border ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
              >
                <Filter size={16} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-50">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Class</label>
                    <div className="relative">
                      <select 
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none focus:ring-2 focus:ring-blue-100 transition-all"
                      >
                        <option value="all">All Classes</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{formatDisplayString(c.name)}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Session</label>
                    <div className="relative">
                      <select 
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none focus:ring-2 focus:ring-blue-100 transition-all"
                      >
                        <option value="all">All Sessions</option>
                        {sessions.map(s => <option key={s.id} value={s.id}>{formatDisplayString(s.name)}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Term</label>
                    <div className="relative">
                      <select 
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none focus:ring-2 focus:ring-blue-100 transition-all"
                      >
                        <option value="all">All Terms</option>
                        {selectedSession !== 'all' && termsMap[selectedSession] && Object.values(termsMap[selectedSession]).map((t: any) => (
                          <option key={t.id} value={t.id}>{formatDisplayString(t.name)}</option>
                        ))}
                        {selectedSession === 'all' && (
                          <>
                            <option value="1st_term">1st Term</option>
                            <option value="2nd_term">2nd Term</option>
                            <option value="3rd_term">3rd Term</option>
                          </>
                        )}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4 text-right">Total Fee</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right">Balance</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {studentFeeData.map(({ student, totalFee, paid, balance, hasOverdue, hasInvoices }, idx) => {
                  const isPaid = totalFee > 0 && balance <= 0;
                  const isPartial = paid > 0 && balance > 0;
                  const className = classes.find(c => c.id === student.classId)?.name || 'Unassigned';

                  return (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      key={student.uid} 
                      className="hover:bg-slate-50/50 transition-colors group cursor-default"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 group-hover:scale-110 transition-transform">
                            {formatDisplayString(student.firstName)[0]}{formatDisplayString(student.lastName)[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-[13px] text-slate-900 leading-tight tracking-tight uppercase">
                              {formatDisplayString(student.firstName)} {formatDisplayString(student.lastName)}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{className}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-xs text-slate-500">
                        {formatCurrency(totalFee)}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-xs text-emerald-600">
                        {formatCurrency(paid)}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-[13px] text-slate-900">
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-end lg:items-start">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                            totalFee > 0 && !hasInvoices ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            totalFee === 0 ? 'bg-slate-50 text-slate-400 border-slate-200' :
                            isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            isPartial ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-rose-50 text-rose-600 border-rose-100'
                          )}>
                            {totalFee > 0 && !hasInvoices ? <><Clock size={10} strokeWidth={3} /> UNINVOICED</> :
                             totalFee === 0 ? 'NO FEE' :
                             isPaid ? <><CheckCircle size={10} strokeWidth={3} /> FULLY PAID</> : 
                             isPartial ? <><BarChart3 size={10} strokeWidth={3} /> PARTIAL</> : <><Clock size={10} strokeWidth={3} /> UNPAID</>}
                          </span>
                          {hasOverdue && (
                            <span className="text-[8px] font-black text-rose-500 flex items-center gap-1 animate-pulse tracking-widest ml-2">
                              <Clock size={10} strokeWidth={3} /> OVERDUE
                            </span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              {studentFeeData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No students found matching the current selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ 
  title, 
  value, 
  subtitle,
  progress,
  icon, 
  color 
}: { 
  title: string; 
  value: number; 
  subtitle?: string;
  progress?: number;
  icon: React.ReactNode; 
  color: string 
}) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50/50 border-blue-100',
    emerald: 'bg-emerald-50/50 border-emerald-100',
    amber: 'bg-amber-50/50 border-amber-100',
    purple: 'bg-purple-50/50 border-purple-100',
  };

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`p-5 rounded-3xl border ${colorMap[color] || 'bg-white border-slate-100'} shadow-sm transition-all`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-50">
            {icon}
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</span>
        </div>
        {progress !== undefined && progress > 0 && (
          <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-full">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="text-xl font-black text-slate-900 tracking-tight">
        {new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          maximumFractionDigits: 0
        }).format(value)}
      </div>
      {subtitle && (
        <div className="text-[10px] font-bold text-slate-400 mt-1">
          {subtitle}
        </div>
      )}
      {progress !== undefined && (
        <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-blue-600 rounded-full"
          />
        </div>
      )}
    </motion.div>
  );
};
