import React, { useState, useEffect } from'react';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, onSnapshot, OperationType, handleFirestoreError } from '../../lib/compatibility';
import { School, FeeStructure, Invoice, Payment, Class, UserProfile } from '../../types';
import { Plus, Edit2, Trash2, FileText, CheckCircle, Clock, Search, X, BarChart2, ChevronDown, Users, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDisplayString } from '../../lib/utils';
import { FeeAnalytics } from './FeeAnalytics';

export const SchoolFinance = ({ school }: { school: School }) => {
  const [activeTab, setActiveTab] = useState<'feeAnalytics' | 'feeStructures' | 'invoices' | 'payments'>('feeAnalytics');
 const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
 const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [termsMap, setTermsMap] = useState<Record<string, Record<string, any>>>({});

  const studentMap = React.useMemo(() => {
    return students.reduce((acc, s) => ({ ...acc, [s.uid]: s }), {} as Record<string, UserProfile>);
  }, [students]);

  const classMap = React.useMemo(() => {
    return classes.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, Class>);
  }, [classes]);

  const sessionMap = React.useMemo(() => {
    return sessions.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as Record<string, any>);
  }, [sessions]);

  const [showAddFee, setShowAddFee] = useState(false);
  const [showGenerateInvoice, setShowGenerateInvoice] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'online'>('cash');
  const [paymentReference, setPaymentReference] = useState('');

  // Form states
  const [newFee, setNewFee] = useState<Partial<FeeStructure>>({ 
    name: '', 
    amount: 0, 
    classId: 'all', 
    isMandatory: true, 
    termId: '', 
    sessionId: '',
    category: 'tuition'
  });
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [genSessionId, setGenSessionId] = useState('');
  const [genTermId, setGenTermId] = useState('');
  const [genClassId, setGenClassId] = useState('all');

  useEffect(() => {
    const unsubFees = onSnapshot(collection(db, `schools/${school.id}/feeStructures`), (snap) => {
      setFeeStructures(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure)));
    });
    const unsubInvoices = onSnapshot(collection(db, `schools/${school.id}/invoices`), (snap) => {
      setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
    });
    const unsubPayments = onSnapshot(collection(db, `schools/${school.id}/payments`), (snap) => {
      setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });
    const unsubClasses = onSnapshot(collection(db, `schools/${school.id}/classes`), (snap) => {
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class)));
    });
    const unsubStudents = onSnapshot(query(collection(db, 'users'), where('schoolId', '==', school.id), where('role', '==', 'student')), (snap) => {
      setStudents(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    // Handle session and term listeners cleanly
    const termUnsubs: Record<string, () => void> = {};
    const unsubSessions = onSnapshot(collection(db, `schools/${school.id}/sessions`), (snap) => {
      const sessData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(sessData);
      
      // Clear old term unsubs that are no longer in sessData
      Object.keys(termUnsubs).forEach(id => {
        if (!sessData.find(s => s.id === id)) {
          termUnsubs[id]();
          delete termUnsubs[id];
        }
      });

      // Add new ones
      sessData.forEach(sess => {
        if (!termUnsubs[sess.id]) {
          termUnsubs[sess.id] = onSnapshot(collection(db, `schools/${school.id}/sessions/${sess.id}/terms`), (termSnap) => {
            const terms = termSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTermsMap(prev => ({
              ...prev,
              [sess.id]: terms.reduce((acc, t) => ({ ...acc, [t.id]: t }), {})
            }));
          });
        }
      });
      setLoading(false);
    });

    return () => { 
      unsubFees(); 
      unsubInvoices(); 
      unsubPayments(); 
      unsubClasses(); 
      unsubStudents(); 
      unsubSessions(); 
      Object.values(termUnsubs).forEach(unsub => unsub());
    };
  }, [school.id]);

  // Handle pre-selection of session and term for invoice generation
  useEffect(() => {
    if (showGenerateInvoice && sessions.length > 0) {
      const currentSess = sessions.find(s => s.isCurrent) || sessions[0];
      if (currentSess) {
        setGenSessionId(currentSess.id);
        const terms = termsMap[currentSess.id] || {};
        const currentTerm = Object.values(terms).find((t: any) => t.isCurrent) || Object.values(terms)[0];
        if (currentTerm) {
          setGenTermId((currentTerm as any).id);
        }
      }
    }
  }, [showGenerateInvoice, sessions, termsMap]);

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid' || invoice.amountPaid >= invoice.amount) return false;
    
    const term = termsMap[invoice.sessionId]?.[invoice.termId];
    if (term?.resumptionDate) {
      const resDate = new Date(term.resumptionDate);
      const oneMonthLater = new Date(resDate);
      oneMonthLater.setMonth(resDate.getMonth() + 1);
      return new Date() > oneMonthLater;
    }
    return new Date() > new Date(invoice.dueDate);
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFee.name || !newFee.amount || !newFee.sessionId || !newFee.termId) {
      alert("Please fill in all required fields (Name, Amount, Session, and Term)");
      return;
    }

    try {
      // Destructure to remove id and other metadata fields
      const { id, createdAt, updatedAt, ...feeDataPayload } = newFee as any;
      
      const feeData = {
        ...feeDataPayload,
        schoolId: school.id,
        updatedAt: new Date().toISOString(),
        amount: Number(newFee.amount),
        isMandatory: Boolean(newFee.isMandatory)
      };

      if (editingFee) {
        const feeRef = doc(db, 'schools', school.id, 'feeStructures', editingFee.id);
        await updateDoc(feeRef, feeData);
        alert("Fee structure updated successfully");
        setEditingFee(null);
      } else {
        await addDoc(collection(db, `schools/${school.id}/feeStructures`), {
          ...feeData,
          createdAt: new Date().toISOString()
        });
        alert("Fee structure created successfully");
      }
      setNewFee({ name: '', amount: 0, classId: 'all', isMandatory: true, termId: '', sessionId: '', category: 'tuition' });
      setShowAddFee(false);
    } catch (error: any) {
      console.error("Error saving fee:", error);
      alert(`Failed to save fee: ${error.message}`);
      handleFirestoreError(error, editingFee ? OperationType.UPDATE : OperationType.CREATE, `schools/${school.id}/feeStructures`);
    }
  };

  const handleEditFee = (fee: FeeStructure) => {
    setEditingFee(fee);
    setNewFee(fee);
    setShowAddFee(true);
  };

  const handleDeleteFee = async (feeId: string) => {
    if (!window.confirm('Are you sure you want to delete this fee structure? This will not affect already generated invoices.')) return;
    try {
      await deleteDoc(doc(db, 'schools', school.id, 'feeStructures', feeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `schools/${school.id}/feeStructures`);
    }
  };

  const handleGenerateInvoices = async (classId: string, termId: string, sessionId: string) => {
    try {
      // Fetch students in scope
      const qStudents = classId === 'all'
        ? query(collection(db, 'users'), where('schoolId', '==', school.id), where('role', '==', 'student'))
        : query(collection(db, 'users'), where('schoolId', '==', school.id), where('role', '==', 'student'), where('classId', '==', classId));

      const studentsSnap = await getDocs(qStudents);
      const studentsInScope = studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));

      if (studentsInScope.length === 0) {
        alert("No students found in the selected class.");
        return;
      }

      let generatedCount = 0;
      let skippedCount = 0;

      // Generate invoices per student
      for (const student of studentsInScope) {
        const studentFees = feeStructures.filter(f => 
          f.termId === termId && 
          f.sessionId === sessionId && 
          (f.classId === 'all' || f.classId === student.classId)
        );

        if (studentFees.length === 0) {
          skippedCount++;
          continue;
        }

        const totalAmount = studentFees.reduce((sum, fee) => sum + fee.amount, 0);
        const items = studentFees.map(f => ({ name: f.name, amount: f.amount }));

        const qExisting = query(
          collection(db, `schools/${school.id}/invoices`), 
          where('studentId', '==', student.uid),
          where('termId', '==', termId),
          where('sessionId', '==', sessionId)
        );
        const existingSnap = await getDocs(qExisting);
        
        if (existingSnap.empty) {
          // Format due date as YYYY-MM-DD for Supabase
          const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          await addDoc(collection(db, `schools/${school.id}/invoices`), {
            schoolId: school.id,
            studentId: student.uid,
            classId: student.classId || '',
            termId,
            sessionId,
            amount: totalAmount,
            amountPaid: 0,
            status: 'unpaid',
            dueDate,
            items,
            createdAt: new Date().toISOString()
          });
          generatedCount++;
        } else {
          skippedCount++;
        }
      }

      if (generatedCount === 0) {
        alert("No new invoices were generated. Students may already have invoices or no fees were found for them.");
      } else {
        alert(`Invoices generated successfully for ${generatedCount} students.${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`);
      }
      setShowGenerateInvoice(false);
    } catch (err: any) {
      console.error("Error generating invoices:", err);
      alert(`Failed to generate invoices: ${err.message}`);
      handleFirestoreError(err, OperationType.CREATE, `schools/${school.id}/invoices`);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentInvoiceId || paymentAmount <= 0) {
      alert("Please select an invoice and enter a valid amount.");
      return;
    }

    const invoice = invoices.find(inv => inv.id === paymentInvoiceId);
    if (!invoice) {
      alert("Selected invoice not found.");
      return;
    }

    const balance = invoice.amount - invoice.amountPaid;
    if (paymentAmount > balance) {
      alert(`Payment amount (₦${paymentAmount.toLocaleString()}) exceeds outstanding balance (₦${balance.toLocaleString()}).`);
      return;
    }

    try {
      const reference = paymentReference || `MANUAL_${Date.now()}`;

      // Record payment document
      await addDoc(collection(db, `schools/${school.id}/payments`), {
        schoolId: school.id,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        parentId: '',
        amount: paymentAmount,
        method: paymentMethod,
        reference,
        status: 'success',
        date: new Date().toISOString()
      });

      // Update invoice
      const newAmountPaid = invoice.amountPaid + paymentAmount;
      const newStatus = newAmountPaid >= invoice.amount ? 'paid' : 'partially_paid';

      await updateDoc(doc(db, 'schools', school.id, 'invoices', invoice.id), {
        amountPaid: newAmountPaid,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      alert(`Payment of ₦${paymentAmount.toLocaleString()} recorded successfully.`);
      setShowRecordPayment(false);
      setPaymentInvoiceId('');
      setPaymentAmount(0);
      setPaymentMethod('cash');
      setPaymentReference('');
    } catch (err: any) {
      console.error("Error recording payment:", err);
      alert(`Failed to record payment: ${err.message}`);
      handleFirestoreError(err, OperationType.CREATE, `schools/${school.id}/payments`);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-600 rounded-full animate-spin shadow-lg shadow-blue-600/10" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Initializing Finance Modules</p>
    </div>
  );

  return (
    <div className="space-y-8 min-h-screen bg-[#F8FAFC]/30 p-4 lg:p-8 selection:bg-blue-100 selection:text-blue-900">
      {/* Header with quick stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Financial Management
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage structures, invoices, and track revenue collection.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
              <p className="text-lg font-black text-slate-900 tracking-tight">₦{payments.reduce((acc, p) => p.status === 'success' ? acc + p.amount : acc, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 mb-8 overflow-x-auto no-scrollbar shadow-sm sticky top-0 z-30">
        {[
          { id: 'feeAnalytics', label: 'Fee Analytics', icon: BarChart2 },
          { id: 'feeStructures', label: 'Fee Structures', icon: Plus },
          { id: 'invoices', label: 'Invoices', icon: FileText },
          { id: 'payments', label: 'Payments', icon: CreditCard },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          { activeTab === 'feeAnalytics' && (
            <FeeAnalytics 
              school={school} 
              invoices={invoices} 
              payments={payments} 
              feeStructures={feeStructures} 
              classes={classes}
              termsMap={termsMap}
              students={students}
              sessions={sessions}
            />
          )}

          { activeTab  === 'feeStructures'&& (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fee Structures</h3>
                <button 
                  onClick={() => setShowAddFee(true)} 
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-600/20"
                >
                  <Plus size={ 16 } strokeWidth={3} /> Add Fee
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                { feeStructures.map(fee => (
                  <div key={ fee.id } className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm group relative overflow-hidden transition-all hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <h4 className="font-black text-[13px] uppercase tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">{ fee.name }</h4>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                          {formatDisplayString(termsMap[fee.sessionId]?.[fee.termId]?.name || 'Unknown Term')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleEditFee(fee)}
                          className="p-2 bg-slate-50 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all border border-slate-100"
                        >
                          <Edit2 size={13} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={() => handleDeleteFee(fee.id)}
                          className="p-2 bg-slate-50 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all border border-slate-100"
                        >
                          <Trash2 size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-end justify-between relative z-10">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Users size={12} className="text-blue-500" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                            { fee.classId  === 'all' ? 'All Classes' : classMap[fee.classId]?.name || fee.classId }
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span className={cn(
                            "text-[8px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border",
                            fee.isMandatory 
                              ? "bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-100/50"
                              : "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-100/50"
                          )}>
                            { fee.isMandatory ? 'Mandatory' : 'Optional' }
                          </span>
                          <span className="text-[8px] bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-slate-200/60 shadow-sm">
                            { formatDisplayString(fee.category) }
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Structure Amount</p>
                        <span className="text-2xl font-black text-slate-900 tracking-tighter">₦{ fee.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                { feeStructures.length === 0 && (
                  <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No fee structures defined yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          { activeTab  === 'invoices'&& (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Student Invoices</h3>
                <button 
                  onClick={() => setShowGenerateInvoice(true)} 
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-600/20"
                >
                  <FileText size={ 16 } strokeWidth={3} /> Generate Invoices
                </button>
              </div>
              
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[10px] font-black border-b border-slate-200/60">
                        <th className="p-6">Student</th>
                        <th className="p-6">Amount</th>
                        <th className="p-6">Paid</th>
                        <th className="p-6 text-center">Status</th>
                        <th className="p-6">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      { invoices.map(inv => {
                        const paid = inv.status === 'paid' || inv.amountPaid >= inv.amount;
                        const overdue = isOverdue(inv);
                        const balance = inv.amount - inv.amountPaid;

                        return (
                          <tr key={ inv.id } className="hover:bg-slate-50/50 transition-colors group cursor-default">
                            <td className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 group-hover:scale-110 transition-transform">
                                  {studentMap[inv.studentId]?.firstName?.[0]}{studentMap[inv.studentId]?.lastName?.[0]}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="font-black text-[13px] uppercase tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                                    { formatDisplayString(studentMap[inv.studentId]?.firstName || '') } { formatDisplayString(studentMap[inv.studentId]?.lastName || '') }
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                    { formatDisplayString(sessionMap[inv.sessionId]?.name || '') } • { formatDisplayString(termsMap[inv.sessionId]?.[inv.termId]?.name || 'Unknown Term') }
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-6 font-black text-slate-900">₦{ inv.amount.toLocaleString()}</td>
                            <td className="p-6 font-black text-emerald-600">₦{ inv.amountPaid.toLocaleString()}</td>
                            <td className="p-6">
                              <div className="flex flex-col items-center gap-1.5">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                  paid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                  inv.amountPaid > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                  'bg-rose-50 text-rose-600 border-rose-100'
                                }`}>
                                  { paid ? <span className="flex items-center gap-1"><CheckCircle size={10} strokeWidth={3} /> FULLY PAID</span> : inv.amountPaid > 0 ? 'PARTIAL' : 'UNPAID' }
                                </span>
                                {overdue && !paid && (
                                  <span className="text-[9px] font-black text-rose-500 flex items-center gap-1 animate-pulse">
                                    <Clock size={10} strokeWidth={3} /> OVERDUE
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col gap-1">
                                <span className="font-black text-slate-700 text-[11px]">{ new Date(inv.dueDate).toLocaleDateString()}</span>
                                {balance > 0 && <span className="text-[9px] text-amber-600 font-black uppercase tracking-widest">BAL: ₦{balance.toLocaleString()}</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      { invoices.length === 0 && (
                        <tr>
                          <td colSpan={ 5 } className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">
                            No invoices found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          { activeTab  === 'payments'&& (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Payment History</h3>
                <button 
                  onClick={() => setShowRecordPayment(true)} 
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-600/20"
                >
                  <Plus size={ 16 } strokeWidth={3} /> Record Payment
                </button>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[10px] font-black border-b border-slate-200/60">
                        <th className="p-6">Date</th>
                        <th className="p-6">Student</th>
                        <th className="p-6">Amount</th>
                        <th className="p-6">Method</th>
                        <th className="p-6 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      { payments.map(pay => (
                        <tr key={ pay.id } className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-6 text-slate-500 font-medium text-xs">{ new Date(pay.date).toLocaleString()}</td>
                          <td className="p-6">
                            <div className="flex flex-col gap-1">
                              <span className="font-black text-[13px] uppercase tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                                { formatDisplayString(studentMap[pay.studentId]?.firstName || '') } { formatDisplayString(studentMap[pay.studentId]?.lastName || '') }
                              </span>
                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest font-mono">REF: { pay.reference }</span>
                            </div>
                          </td>
                          <td className="p-6 font-black text-slate-900">₦{ pay.amount.toLocaleString()}</td>
                          <td className="p-6">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-blue-100">
                              { formatDisplayString(pay.method) }
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex justify-center">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                pay.status  === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                pay.status  === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>
                                { formatDisplayString(pay.status) }
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      { payments.length === 0 && (
                        <tr>
                          <td colSpan={ 5 } className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">
                            No payments found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

  {/* Add Fee Modal */}
  <AnimatePresence>
    { showAddFee && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/60 relative flex flex-col max-h-[90vh] overflow-hidden"
        >
          <div className="flex justify-between items-center p-8 border-b border-slate-100 relative z-10 shrink-0">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">{editingFee ? 'Edit Fee Structure' : 'Add Fee Structure'}</h3>
            <button 
              onClick={() => {
                setShowAddFee(false);
                setEditingFee(null);
                setNewFee({ name: '', amount: 0, classId: 'all', isMandatory: true, termId: '', sessionId: '', category: 'tuition' });
              }} 
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X size={ 20 } />
            </button>
          </div>

          <form onSubmit={ handleSaveFee } className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Fee Name</label>
                <input 
                  required 
                  type="text"
                  value={ newFee.name } 
                  onChange={ e => setNewFee({...newFee, name: e.target.value })} 
                  className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 text-sm"
                  placeholder="e.g. Tuition Fee"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Amount (₦)</label>
                  <input 
                    required 
                    type="number"
                    min="0"
                    value={ newFee.amount } 
                    onChange={ e => setNewFee({...newFee, amount: Number(e.target.value)})} 
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Category</label>
                  <div className="relative">
                    <select 
                      required 
                      value={ newFee.category } 
                      onChange={ e => setNewFee({...newFee, category: e.target.value as any })} 
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-[10px] uppercase tracking-widest text-slate-900 appearance-none cursor-pointer"
                    >
                      <option value="tuition">Tuition Fee</option>
                      <option value="activities">Activities Fee</option>
                      <option value="miscellaneous">Miscellaneous Fee</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Applicable Class</label>
                <div className="relative">
                  <select 
                    value={ newFee.classId } 
                    onChange={ e => setNewFee({...newFee, classId: e.target.value })} 
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-[10px] uppercase tracking-widest text-slate-900 appearance-none cursor-pointer"
                  >
                    <option value="all">All Classes</option>
                    { classes.map(c => <option key={ c.id } value={ c.id }>{ formatDisplayString(c.name) }</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Session</label>
                  <div className="relative">
                    <select 
                      required 
                      value={ newFee.sessionId } 
                      onChange={ e => setNewFee({...newFee, sessionId: e.target.value, termId: '' })} 
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-[10px] uppercase tracking-widest text-slate-900 appearance-none cursor-pointer"
                    >
                      <option value="">Select Session</option>
                      { sessions.map(s => <option key={ s.id } value={ s.id }>{ formatDisplayString(s.name) }</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Term</label>
                  <div className="relative">
                    <select 
                      required 
                      value={ newFee.termId } 
                      onChange={ e => setNewFee({...newFee, termId: e.target.value })} 
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-[10px] uppercase tracking-widest text-slate-900 appearance-none cursor-pointer"
                    >
                      <option value="">Select Term</option>
                      { newFee.sessionId && Object.values(termsMap[newFee.sessionId] || {}).map((t: any) => (
                        <option key={ t.id } value={ t.id }>{ formatDisplayString(t.name) }</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:border-blue-100 group">
                <input 
                  type="checkbox"
                  id="isMandatory"
                  checked={ newFee.isMandatory } 
                  onChange={ e => setNewFee({...newFee, isMandatory: e.target.checked })} 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-all cursor-pointer"
                />
                <label htmlFor="isMandatory" className="text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer group-hover:text-slate-900">Mandatory Fee</label>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-4">
              <button 
                type="button"
                onClick={() => {
                  setShowAddFee(false);
                  setEditingFee(null);
                  setNewFee({ name: '', amount: 0, classId: 'all', isMandatory: true, termId: '', sessionId: '', category: 'tuition' });
                }}
                className="flex-1 px-6 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-[2] bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
              >
                {editingFee ? 'Update Fee Structure' : 'Save Fee Structure'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

  {/* Generate Invoice Modal */}
  <AnimatePresence>
    { showGenerateInvoice && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200/60">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Generate Invoices</h3>
            <button onClick={() => setShowGenerateInvoice(false)} className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={ 20 } /></button>
          </div>
          <div className="space-y-6">
            <p className="text-xs text-slate-500 leading-relaxed font-medium">Generate invoices for students based on active fee structures for the selected session and term.</p>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Session</label>
                <div className="relative">
                  <select 
                    value={genSessionId}
                    onChange={e => {
                      setGenSessionId(e.target.value);
                      setGenTermId('');
                    }}
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-slate-50 font-black text-[10px] uppercase tracking-widest text-slate-900 appearance-none cursor-pointer"
                  >
                    <option value="">Select Session</option>
                    { sessions.map(s => <option key={ s.id } value={ s.id }>{ formatDisplayString(s.name) } {s.isCurrent ? '(Current)' : ''}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Term</label>
                <div className="relative">
                  <select 
                    disabled={!genSessionId}
                    value={genTermId}
                    onChange={e => setGenTermId(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-slate-50 font-black text-[10px] uppercase tracking-widest text-slate-900 appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select Term</option>
                    { genSessionId && Object.values(termsMap[genSessionId] || {}).map((t: any) => (
                      <option key={ t.id } value={ t.id }>{ formatDisplayString(t.name) } {t.isCurrent ? '(Current)' : ''}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Class</label>
                <div className="relative">
                  <select 
                    value={genClassId}
                    onChange={e => setGenClassId(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-slate-50 font-black text-[10px] uppercase tracking-widest text-slate-900 appearance-none cursor-pointer"
                  >
                    <option value="all">All Classes</option>
                    { classes.map(c => <option key={ c.id } value={ c.id }>{ formatDisplayString(c.name) }</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleGenerateInvoices(genClassId, genTermId, genSessionId)} 
              disabled={!genSessionId || !genTermId}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none mt-4 active:scale-95"
            >
              Generate Invoices
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

  {/* Record Payment Modal */}
  <AnimatePresence>
    { showRecordPayment && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/60 relative flex flex-col max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-8 border-b border-slate-100 shrink-0">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Record Manual Payment</h3>
            <button 
              onClick={() => {
                setShowRecordPayment(false);
                setPaymentInvoiceId('');
                setPaymentAmount(0);
                setPaymentMethod('cash');
                setPaymentReference('');
              }} 
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X size={ 20 } />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Select Invoice</label>
              <div className="relative">
                <select 
                  value={paymentInvoiceId}
                  onChange={e => {
                    setPaymentInvoiceId(e.target.value);
                    const inv = invoices.find(i => i.id === e.target.value);
                    if (inv) setPaymentAmount(inv.amount - inv.amountPaid);
                  }}
                  className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 text-sm appearance-none cursor-pointer"
                >
                  <option value="">Select an invoice...</option>
                  {invoices.filter(inv => inv.status !== 'paid' && inv.amountPaid < inv.amount).map(inv => {
                    const student = studentMap[inv.studentId];
                    const balance = inv.amount - inv.amountPaid;
                    return (
                      <option key={inv.id} value={inv.id}>
                        {student ? `${student.firstName} ${student.lastName}` : inv.studentId} — ₦{balance.toLocaleString()} outstanding
                      </option>
                    );
                  })}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {paymentInvoiceId && (() => {
              const inv = invoices.find(i => i.id === paymentInvoiceId);
              if (!inv) return null;
              const student = studentMap[inv.studentId];
              const balance = inv.amount - inv.amountPaid;
              return (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Student</span>
                    <span className="text-slate-900">{student ? `${formatDisplayString(student.firstName)} ${formatDisplayString(student.lastName)}` : inv.studentId}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Total Invoice</span>
                    <span className="text-slate-900">₦{inv.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Already Paid</span>
                    <span className="text-emerald-600">₦{inv.amountPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 pt-2 border-t border-slate-200">
                    <span>Outstanding Balance</span>
                    <span className="text-rose-600 text-sm font-black">₦{balance.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Amount (₦)</label>
                <input 
                  type="number"
                  min="0"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Payment Method</label>
                <div className="relative">
                  <select 
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-[10px] uppercase tracking-widest text-slate-900 appearance-none cursor-pointer"
                  >
                    <option value="cash">Cash</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="online">Online</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Reference / Receipt No. (Optional)</label>
              <input 
                type="text"
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                placeholder="e.g. Bank teller number, receipt ID"
                className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 text-sm"
              />
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-4">
            <button 
              type="button"
              onClick={() => {
                setShowRecordPayment(false);
                setPaymentInvoiceId('');
                setPaymentAmount(0);
                setPaymentMethod('cash');
                setPaymentReference('');
              }}
              className="flex-1 px-6 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleRecordPayment}
              disabled={!paymentInvoiceId || paymentAmount <= 0}
              className="flex-[2] bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none active:scale-95"
            >
              Record Payment
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
 </div>
 );
};
