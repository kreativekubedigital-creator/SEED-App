import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { School, Invoice, Payment, FeeStructure, Class, UserProfile } from '../../types';
import { CheckCircle, Clock, TrendingUp, DollarSign, Wallet, CreditCard, ArrowUpRight, Filter, ChevronDown, Search } from 'lucide-react';
import { format, parseISO, eachMonthOfInterval, isSameMonth, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface FeeAnalyticsProps {
  school: School;
  invoices: Invoice[];
  payments: Payment[];
  feeStructures: FeeStructure[];
  classes: Class[];
  termsMap: Record<string, Record<string, any>>;
  students: UserProfile[];
  sessions: any[];
}

export const FeeAnalytics = ({ school, invoices, payments, feeStructures, classes, termsMap, students, sessions }: FeeAnalyticsProps) => {
  // 1. Filter State
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>(school.currentSessionId || 'all');
  const [selectedTerm, setSelectedTerm] = useState<string>(school.currentTermId || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Filter Logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const student = students.find(s => s.uid === inv.studentId);
      const matchClass = selectedClass === 'all' || student?.classId === selectedClass;
      const matchSession = selectedSession === 'all' || inv.sessionId === selectedSession;
      const matchTerm = selectedTerm === 'all' || inv.termId === selectedTerm;
      return matchClass && matchSession && matchTerm;
    });
  }, [invoices, selectedClass, selectedSession, selectedTerm, students]);

  // 3. Analytics Aggregation (Respecting Filters)
  const stats = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    
    const calculateCategoryTotal = (category: string) => {
      return filteredInvoices.reduce((sum, inv) => {
        const items = inv.items?.filter(item => {
          const structure = feeStructures.find(f => f.name === item.name);
          if (category === 'miscellaneous') {
            return structure?.category === 'miscellaneous' || !['tuition', 'activities'].includes(structure?.category || '');
          }
          return structure?.category === category;
        }) || [];
        return sum + items.reduce((s, i) => s + i.amount, 0);
      }, 0);
    };

    const tuitionTotal = calculateCategoryTotal('tuition');
    const activitiesTotal = calculateCategoryTotal('activities');
    const miscTotal = calculateCategoryTotal('miscellaneous');

    return { totalRevenue, tuitionTotal, activitiesTotal, miscTotal };
  }, [filteredInvoices, feeStructures]);

  // 4. Student Data for Breakdown Table
  const studentFeeData = useMemo(() => {
    return students
      .filter(s => {
        const matchesClass = selectedClass === 'all' || s.classId === selectedClass;
        const matchesSearch = !searchQuery || 
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.uid.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesClass && matchesSearch;
      })
      .map(student => {
        const studentInvoices = invoices.filter(inv => 
          inv.studentId === student.uid &&
          (selectedSession === 'all' || inv.sessionId === selectedSession) &&
          (selectedTerm === 'all' || inv.termId === selectedTerm)
        );

        const totalFee = studentInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const paid = studentInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
        const balance = totalFee - paid;
        
        // Find if any invoice is overdue
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
      .sort((a, b) => b.balance - a.balance); // Sort by balance descending
  }, [students, invoices, selectedClass, selectedSession, selectedTerm, searchQuery, termsMap]);

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
          
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  tickFormatter={(value) => `₦${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Amount']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                  animationDuration={1500}
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
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                        {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                          <option key={t.id} value={t.id}>{t.name}</option>
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
              {studentFeeData.map(({ student, totalFee, paid, balance, hasOverdue, hasInvoices }) => {
                const isPaid = totalFee > 0 && balance <= 0;
                const isPartial = paid > 0 && balance > 0;
                const className = classes.find(c => c.id === student.classId)?.name || 'Unassigned';

                return (
                  <tr key={student.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 leading-tight">
                            {student.firstName} {student.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{className}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                      {formatCurrency(totalFee)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">
                      {formatCurrency(paid)}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">
                      {formatCurrency(balance)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider w-fit flex items-center gap-1 ${
                          !hasInvoices ? 'bg-slate-100 text-slate-400' :
                          isPaid ? 'bg-emerald-50 text-emerald-600' :
                          isPartial ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {!hasInvoices ? 'NO INVOICE' :
                           isPaid ? <><CheckCircle size={10} /> PAID</> : 
                           isPartial ? 'PARTIAL' : 'PENDING'}
                        </span>
                        {hasOverdue && (
                          <span className="text-[10px] font-black text-rose-500 flex items-center gap-1 animate-pulse">
                            <Clock size={10} /> OVERDUE
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
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

const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) => {
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
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-50">
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</span>
      </div>
      <div className="text-xl font-black text-slate-900 tracking-tight">
        {new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          maximumFractionDigits: 0
        }).format(value)}
      </div>
    </motion.div>
  );
};
