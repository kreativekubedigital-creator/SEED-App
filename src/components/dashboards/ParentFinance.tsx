import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, onSnapshot, OperationType, handleFirestoreError, doc, updateDoc, addDoc } from '../../lib/compatibility';
import { Invoice, Payment, UserProfile, Term } from '../../types';
import { CreditCard, CheckCircle, Clock, Construction } from 'lucide-react';
import { formatDisplayString } from '../../lib/utils';
// import { usePaystackPayment } from 'react-paystack';

export const ParentFinance = ({ user, studentId }: { user: UserProfile, studentId: string }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  // const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const [sessions, setSessions] = useState<any[]>([]);
  const [termsMap, setTermsMap] = useState<Record<string, Record<string, Term>>>({});

  useEffect(() => {
    if (!user.schoolId || !studentId) return;

    // Fetch sessions
    const unsubSessions = onSnapshot(collection(db, `schools/${user.schoolId}/sessions`), (snap) => {
      const sessData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(sessData);
    });

    // Fetch all terms for the school to avoid nested listeners
    // We'll organize them by sessionId in the local state
    const unsubTerms = onSnapshot(collection(db, `schools/${user.schoolId}/terms`), (snap) => {
      const allTerms = snap.docs.map(d => ({ id: d.id, ...d.data() } as Term));
      const newTermsMap: Record<string, Record<string, Term>> = {};
      
      allTerms.forEach(t => {
        if (!t.sessionId) return;
        if (!newTermsMap[t.sessionId]) newTermsMap[t.sessionId] = {};
        newTermsMap[t.sessionId][t.id] = t;
      });
      
      setTermsMap(newTermsMap);
    });

    const qInvoices = query(collection(db, `schools/${user.schoolId}/invoices`), where('studentId', '==', studentId));
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    });

    const qPayments = query(collection(db, `schools/${user.schoolId}/payments`), where('studentId', '==', studentId));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
      setLoading(false);
    });

    return () => { 
      unsubSessions();
      unsubTerms();
      unsubInvoices(); 
      unsubPayments(); 
    };
  }, [user.schoolId, studentId]);

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid' || invoice.amountPaid >= invoice.amount) return false;
    
    // Check if we have term info for resumption date
    const term = termsMap[invoice.sessionId]?.[invoice.termId];
    if (term?.resumptionDate) {
      const resDate = new Date(term.resumptionDate);
      const oneMonthLater = new Date(resDate);
      oneMonthLater.setMonth(resDate.getMonth() + 1);
      return new Date() > oneMonthLater;
    }
    
    // Fallback to due date if no resumption date
    return new Date() > new Date(invoice.dueDate);
  };

  /* 
  const handlePaymentSuccess = async (reference: any, invoice: Invoice) => {
    try {
      // Record payment
      await addDoc(collection(db, `schools/${user.schoolId}/payments`), {
        schoolId: user.schoolId,
        invoiceId: invoice.id,
        studentId: studentId,
        parentId: user.uid,
        amount: invoice.amount - invoice.amountPaid,
        method: 'online',
        reference: reference.reference,
        status: 'success',
        date: new Date().toISOString()
      });

      // Update invoice
      await updateDoc(doc(db, `schools/${user.schoolId}/invoices`, invoice.id), {
        amountPaid: invoice.amount,
        status: 'paid'
      });

      setPayingInvoice(null);
      alert("Payment successful!");
    } catch (err) {
      console.error("Payment recording failed", err);
      alert("Payment succeeded but recording failed. Please contact support.");
    }
  };

  const PaystackHookExample = ({ invoice }: { invoice: Invoice }) => {
    const config = {
      reference: (new Date()).getTime().toString(),
      email: user.email,
      amount: (invoice.amount - invoice.amountPaid) * 100, // Paystack expects kobo
      publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder',
    };
    
    const initializePayment = usePaystackPayment(config);

    return (
      <button 
        onClick={() => {
          if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
            alert("Payment gateway is in prototype mode. Simulating successful payment.");
            handlePaymentSuccess({ reference: 'simulated_' + Date.now() }, invoice);
            return;
          }
          initializePayment({
            onSuccess: (ref) => handlePaymentSuccess(ref, invoice),
            onClose: () => alert("Payment cancelled")
          });
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 w-full"
      >
        Pay ₦{(invoice.amount - invoice.amountPaid).toLocaleString()}
      </button>
    );
  };
  */

  const OfflinePaymentInfo = ({ invoice }: { invoice: Invoice }) => {
    return (
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
        <Construction size={20} className="mx-auto mb-1 text-orange-400" />
        <p className="text-xs font-medium text-slate-900">Online Payment Pending</p>
        <p className="text-[10px] text-slate-500 mt-1">
          Please contact the school bursary to make manual payments for ₦{(invoice.amount - invoice.amountPaid).toLocaleString()}.
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.amount - inv.amountPaid), 0);
  const totalPaid = payments.reduce((acc, pay) => acc + pay.amount, 0);

  return (
    <div className="space-y-12">
      {/* Finance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Total Outstanding</p>
          <div className="flex items-end gap-2">
            <h4 className={`text-4xl font-black tracking-tighter ${totalOutstanding > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
              ₦{totalOutstanding.toLocaleString()}
            </h4>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Total Settled</p>
          <div className="flex items-end gap-2 text-blue-600">
            <h4 className="text-4xl font-black tracking-tighter">₦{totalPaid.toLocaleString()}</h4>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-sm border border-slate-100 hidden lg:block group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none transition-opacity group-hover:opacity-100 opacity-0"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Account Status</p>
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ${totalOutstanding > 0 ? 'bg-amber-500 ring-amber-100' : 'bg-emerald-500 ring-emerald-100'} shadow-lg`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                {totalOutstanding > 0 ? 'Action Required' : 'All Clear'}
              </span>
            </div>
          </div>
        </div>
      </div>
          
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-8">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-4">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600 border border-blue-100 shadow-sm"><CreditCard size={ 16 } strokeWidth={2.5} /></div>
            Academic Invoices
          </h4>
          
          {invoices.map(inv => {
            const overdue = isOverdue(inv);
            const paid = inv.status === 'paid' || inv.amountPaid >= inv.amount;
            const balance = inv.amount - inv.amountPaid;

            return (
              <div 
                id={`btn_invoice_item_${inv.id}`}
                key={inv.id} 
                className={`bg-white p-8 rounded-[2.5rem] border transition-all hover:shadow-xl hover:shadow-blue-500/5 group ${paid ? 'border-emerald-100 shadow-emerald-500/5' : overdue ? 'border-rose-100 shadow-rose-500/5' : 'border-slate-100 shadow-slate-200/30'}`}
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                        {formatDisplayString(inv.termId)} Fees
                      </span>
                      {paid ? (
                        <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm uppercase tracking-widest">Settled</span>
                      ) : overdue ? (
                        <span className="bg-rose-50 text-rose-600 text-[8px] font-black px-4 py-1.5 rounded-full border border-rose-100 shadow-sm uppercase tracking-widest animate-pulse">Overdue</span>
                      ) : (
                        <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-4 py-1.5 rounded-full border border-blue-100 shadow-sm uppercase tracking-widest">Pending</span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                      <Clock size={11} className="text-blue-500" />
                      Due: {new Date(inv.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-black tracking-tighter ${paid ? 'text-emerald-600' : 'text-slate-900'}`}>
                      ₦{balance.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Total: ₦{inv.amount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 border-dashed">
                  {inv.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>{item.name}</span>
                      <span className="text-slate-900">₦{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {!paid && (
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60 border-dashed text-center relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 relative z-10 flex items-center justify-center gap-3">
                      <Construction size={16} className="text-amber-500" />
                      Payment Method
                    </p>
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-3 relative z-10">
                      Online gateway is pending. Please visit the school's bursary department for manual settlement.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          
          {invoices.length === 0 && (
            <div className="bg-white p-16 rounded-[2.5rem] border border-slate-100 text-center shadow-sm">
              <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-600 border border-emerald-100 shadow-sm">
                <CheckCircle size={32} strokeWidth={2.5} />
              </div>
              <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-2">No Active Invoices</h4>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Your ward's account is currently fully settled.</p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-4">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100 shadow-sm"><CheckCircle size={ 16 } strokeWidth={2.5} /></div>
            Payment History
          </h4>
          
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-20 text-center">
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No transaction history found.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {payments.map(pay => (
                  <div 
                    id={`btn_payment_history_item_${pay.id}`}
                    key={pay.id} 
                    className="p-8 flex justify-between items-center hover:bg-slate-50 transition-colors group cursor-default"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm group-hover:scale-110 transition-transform">
                        <CheckCircle size={24} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="font-black text-lg text-slate-900 tracking-tighter">₦{pay.amount.toLocaleString()}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{new Date(pay.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                          <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">{formatDisplayString(pay.method)}</p>
                        </div>
                      </div>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full shadow-inner">
                      REF: {pay.reference.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
