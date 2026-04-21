import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, onSnapshot, OperationType, handleFirestoreError, doc, updateDoc, addDoc } from '../../firebase';
import { Invoice, Payment, UserProfile } from '../../types';
import { CreditCard, CheckCircle, Clock, Construction } from 'lucide-react';
// import { usePaystackPayment } from 'react-paystack';

export const ParentFinance = ({ user, studentId }: { user: UserProfile, studentId: string }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  // const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!user.schoolId || !studentId) return;

    const qInvoices = query(collection(db, `schools/${user.schoolId}/invoices`), where('studentId', '==', studentId));
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    });

    const qPayments = query(collection(db, `schools/${user.schoolId}/payments`), where('studentId', '==', studentId));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
      setLoading(false);
    });

    return () => { unsubInvoices(); unsubPayments(); };
  }, [user.schoolId, studentId]);

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
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
        <Construction size={20} className="mx-auto mb-1 text-orange-400" />
        <p className="text-xs font-medium text-gray-800">Online Payment Pending</p>
        <p className="text-[10px] text-gray-800 mt-1">
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
          <h4 className="font-medium text-gray-800">Pending Invoices</h4>
          {invoices.filter(i => i.status !== 'paid').map(inv => (
            <div key={inv.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-medium text-gray-800">Term {inv.termId} Fees</p>
                  <p className="text-xs text-gray-800">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-blue-600 text-lg">₦{(inv.amount - inv.amountPaid).toLocaleString()}</p>
                  <p className="text-xs text-gray-800">Total: ₦{inv.amount.toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {inv.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-gray-800">
                    <span>{item.name}</span>
                    <span>₦{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <OfflinePaymentInfo invoice={inv} />
            </div>
          ))}
          {invoices.filter(i => i.status !== 'paid').length === 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-gray-800">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
              <p>No pending invoices. You're all caught up!</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Payment History</h4>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-6 text-center text-gray-800">No payment history found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map(pay => (
                  <div key={pay.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">₦{pay.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-800">{new Date(pay.date).toLocaleDateString()} • {pay.method}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded">
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
