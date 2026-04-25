import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, onSnapshot, OperationType, handleFirestoreError, doc, updateDoc, addDoc } from '../../lib/compatibility';
import { Invoice, Payment, UserProfile, Term } from '../../types';
import { CreditCard, CheckCircle, Clock, Construction } from 'lucide-react';
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

    // Fetch sessions to get terms and resumption dates
    const unsubSessions = onSnapshot(collection(db, `schools/${user.schoolId}/sessions`), (snap) => {
      const sessData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(sessData);
      
      // For each session, fetch its terms
      sessData.forEach(sess => {
        onSnapshot(collection(db, `schools/${user.schoolId}/sessions/${sess.id}/terms`), (termSnap) => {
          const terms = termSnap.docs.map(d => ({ id: d.id, ...d.data() } as Term));
          setTermsMap(prev => ({
            ...prev,
            [sess.id]: terms.reduce((acc, t) => ({ ...acc, [t.id]: t }), {})
          }));
        });
      });
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
      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
        <Construction size={20} className="mx-auto mb-1 text-orange-400" />
        <p className="text-xs font-medium text-slate-900 dark:text-slate-100">Online Payment Pending</p>
        <p className="text-[10px] text-slate-900 dark:text-slate-100 mt-1">
          Please contact the school bursary to make manual payments for ₦{(invoice.amount - invoice.amountPaid).toLocaleString()}.
        </p>
      </div>
    );
  };

  if (loading) return <div>Loading finance data...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-medium">Fees & Payments</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">Invoice History</h4>
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px] text-slate-500">Paid</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-[10px] text-slate-500">Overdue</span>
              </div>
            </div>
          </div>
          
          {invoices.map(inv => {
            const overdue = isOverdue(inv);
            const paid = inv.status === 'paid' || inv.amountPaid >= inv.amount;
            const balance = inv.amount - inv.amountPaid;

            return (
              <div key={inv.id} className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border ${paid ? 'border-green-100 dark:border-green-900/30' : overdue ? 'border-red-100 dark:border-red-900/30' : 'border-slate-100 dark:border-slate-800'} shadow-sm relative overflow-hidden transition-all hover:shadow-md`}>
                {paid && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                    <CheckCircle size={10} />
                    FULLY PAID
                  </div>
                )}
                {overdue && !paid && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                    <Clock size={10} />
                    OVERDUE
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {inv.termId.replace('_', ' ').toUpperCase()} FEES
                    </p>
                    <p className="text-xs text-slate-500">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                    {overdue && !paid && (
                      <p className="text-[10px] text-red-500 font-medium mt-1">Payment is overdue (1 month post resumption)</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${paid ? 'text-green-600' : 'text-blue-600'}`}>
                      ₦{balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">Total: ₦{inv.amount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {inv.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>{item.name}</span>
                      <span>₦{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {!paid && <OfflinePaymentInfo invoice={inv} />}
              </div>
            );
          })}
          
          {invoices.length === 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-slate-900 dark:text-slate-100">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
              <p>No invoices found.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-slate-900 dark:text-slate-100">Payment History</h4>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-6 text-center text-slate-900 dark:text-slate-100">No payment history found.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map(pay => (
                  <div key={pay.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">₦{pay.amount.toLocaleString()}</p>
                        <p className="text-xs text-slate-900 dark:text-slate-100">{new Date(pay.date).toLocaleDateString()} • {pay.method}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                      {pay.reference.substring(0, 8)}...
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
