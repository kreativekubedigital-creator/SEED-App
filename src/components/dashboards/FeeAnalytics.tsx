import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { School, Invoice, Payment, FeeStructure, Class, UserProfile } from '../../types';
import { CheckCircle, Clock, TrendingUp, DollarSign, Wallet, CreditCard, ArrowUpRight, Filter } from 'lucide-react';
import { format, parseISO, eachMonthOfInterval, isSameMonth, subMonths } from 'date-fns';
import { motion } from 'motion/react';

interface FeeAnalyticsProps {
  school: School;
  invoices: Invoice[];
  payments: Payment[];
  feeStructures: FeeStructure[];
  classes: Class[];
  termsMap: Record<string, Record<string, any>>;
  students: UserProfile[];
}

export const FeeAnalytics = ({ school, invoices, payments, feeStructures, classes, termsMap, students }: FeeAnalyticsProps) => {
  // 1. Analytics Aggregation
  const stats = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => p.status === 'success' ? sum + p.amount : sum, 0);
    
    // Categorization logic
    const calculateCategoryTotal = (category: string) => {
      return invoices.reduce((sum, inv) => {
        const items = inv.items?.filter(item => {
          // Check if the item matches a fee structure with this category
          const structure = feeStructures.find(f => f.name === item.name);
          
          if (category === 'miscellaneous') {
            // Include everything that isn't tuition or activities in the miscellaneous card
            return structure?.category === 'miscellaneous' || 
                   !['tuition', 'activities'].includes(structure?.category || '');
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
  }, [invoices, payments, feeStructures]);

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
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Student Fee Breakdown</h3>
            <p className="text-xs text-slate-500 mt-1">Real-time tracking of individual student balances</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100">
              <Filter size={16} className="text-slate-500" />
            </button>
          </div>
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
              {invoices.map(inv => {
                const balance = inv.amount - inv.amountPaid;
                const isPaid = inv.status === 'paid' || balance <= 0;
                
                // Overdue logic
                const term = termsMap[inv.sessionId]?.[inv.termId];
                let isOverdue = false;
                if (!isPaid) {
                  if (term?.resumptionDate) {
                    const resDate = new Date(term.resumptionDate);
                    const oneMonthLater = new Date(resDate);
                    oneMonthLater.setMonth(resDate.getMonth() + 1);
                    isOverdue = new Date() > oneMonthLater;
                  } else {
                    isOverdue = new Date() > new Date(inv.dueDate);
                  }
                }

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {students.find(s => s.uid === inv.studentId) ? 
                            `${students.find(s => s.uid === inv.studentId)?.firstName} ${students.find(s => s.uid === inv.studentId)?.lastName}` : 
                            inv.studentId
                          }
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">Term {inv.termId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">
                      {formatCurrency(inv.amountPaid)}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">
                      {formatCurrency(balance)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider w-fit flex items-center gap-1 ${
                          isPaid ? 'bg-emerald-50 text-emerald-600' :
                          inv.amountPaid > 0 ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {isPaid ? <><CheckCircle size={10} /> PAID</> : 
                           inv.amountPaid > 0 ? 'PARTIAL' : 'PENDING'}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] font-black text-rose-500 flex items-center gap-1">
                            <Clock size={10} /> OVERDUE
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No financial records found for the current selection.
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
