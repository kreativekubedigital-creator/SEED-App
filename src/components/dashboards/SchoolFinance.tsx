import React, { useState, useEffect } from'react';
import { db, collection, addDoc, updateDoc, doc, getDocs, query, where, onSnapshot, OperationType, handleFirestoreError } from'../../lib/compatibility';
import { School, FeeStructure, Invoice, Payment, Class, UserProfile } from '../../types';
import { Plus, Edit2, Trash2, FileText, CheckCircle, Clock, Search, X, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

 // Modals
 const [showAddFee, setShowAddFee] = useState(false);
 const [showGenerateInvoice, setShowGenerateInvoice] = useState(false);

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
  const [genSessionId, setGenSessionId] = useState('');
  const [genTermId, setGenTermId] = useState('');
  const [genClassId, setGenClassId] = useState('all');

 useEffect(() => {
  const unsubFees = onSnapshot(collection(db,`schools/${ school.id }/feeStructures`), (snap) => {
  setFeeStructures(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure)));
  });
  const unsubInvoices = onSnapshot(collection(db,`schools/${ school.id }/invoices`), (snap) => {
  setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
  });
  const unsubPayments = onSnapshot(collection(db,`schools/${ school.id }/payments`), (snap) => {
  setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
  });
  const unsubClasses = onSnapshot(collection(db,`schools/${ school.id }/classes`), (snap) => {
    setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class)));
  });
  const unsubStudents = onSnapshot(query(collection(db, 'users'), where('schoolId', '==', school.id), where('role', '==', 'student')), (snap) => {
    setStudents(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
  });

  // Fetch sessions to get terms and resumption dates
  const unsubSessions = onSnapshot(collection(db, `schools/${school.id}/sessions`), (snap) => {
    const sessData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setSessions(sessData);
    
    sessData.forEach(sess => {
      onSnapshot(collection(db, `schools/${school.id}/sessions/${sess.id}/terms`), (termSnap) => {
        const terms = termSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTermsMap(prev => ({
          ...prev,
          [sess.id]: terms.reduce((acc, t) => ({ ...acc, [t.id]: t }), {})
        }));
      });
    });
    setLoading(false);
  });

  return () => { unsubFees(); unsubInvoices(); unsubPayments(); unsubClasses(); unsubStudents(); unsubSessions(); };
  }, [school.id]);

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
 try {
 await addDoc(collection(db,`schools/${ school.id }/feeStructures`), {
 ...newFee,
 schoolId: school.id,
 createdAt: new Date().toISOString()
 });
  setShowAddFee(false);
  setNewFee({ name: '', amount: 0, classId: 'all', isMandatory: true, termId: '', sessionId: '', category: 'tuition' });
 } catch (err) {
 handleFirestoreError(err, OperationType.CREATE,`schools/${ school.id }/feeStructures`);
 }
 };

 const handleGenerateInvoices = async (classId: string, termId: string, sessionId: string) => {
 try {
 // Fetch students
 const qStudents = classId  === 'all'
 ? query(collection(db,'users'), where('schoolId','==', school.id), where('role','==','student'))
 : query(collection(db,'users'), where('schoolId','==', school.id), where('role','==','student'), where('classId','==', classId));
 
 const studentsSnap = await getDocs(qStudents);
 const students = studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));

 // Filter applicable fees
 const applicableFees = feeStructures.filter(f => 
 f.termId === termId && 
 f.sessionId === sessionId && 
 (f.classId  === 'all'|| f.classId === classId)
 );

 if (applicableFees.length === 0) {
 alert("No fee structures found for the selected criteria.");
 return;
 }

 const totalAmount = applicableFees.reduce((sum, fee) => sum + fee.amount, 0);
 const items = applicableFees.map(f => ({ name: f.name, amount: f.amount }));

 // Generate invoices
 for (const student of students) {
 // Check if invoice already exists
 const qExisting = query(
 collection(db,`schools/${ school.id }/invoices`), 
 where('studentId','==', student.uid),
 where('termId','==', termId),
 where('sessionId','==', sessionId)
 );
 const existingSnap = await getDocs(qExisting);
 
 if (existingSnap.empty) {
 await addDoc(collection(db,`schools/${ school.id }/invoices`), {
 schoolId: school.id,
 studentId: student.uid,
 termId,
 sessionId,
 amount: totalAmount,
 amountPaid: 0,
 status:'pending',
 dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
 items,
 createdAt: new Date().toISOString()
 });
 }
 }

 alert(`Invoices generated successfully for ${ students.length } students.`);
 setShowGenerateInvoice(false);
 } catch (err) {
 handleFirestoreError(err, OperationType.CREATE,`schools/${ school.id }/invoices`);
 }
 };

 if (loading) return <div>Loading finance data...</div>;

 return (
 <div className="space-y-6">
  {/* Tabs */}
  <div className="flex gap-4 border-b border-gray-100 mb-6">
    <button onClick={() => setActiveTab('feeAnalytics')} className={`pb-3 px-1 font-black text-[10px] uppercase tracking-widest transition-all ${ activeTab === 'feeAnalytics' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>
      <div className="flex items-center gap-2">
        <BarChart2 size={12} />
        Fee Analytics
      </div>
    </button>
    <button onClick={() => setActiveTab('feeStructures')} className={`pb-3 px-1 font-black text-[10px] uppercase tracking-widest transition-all ${ activeTab === 'feeStructures' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>Fee Structures</button>
    <button onClick={() => setActiveTab('invoices')} className={`pb-3 px-1 font-black text-[10px] uppercase tracking-widest transition-all ${ activeTab === 'invoices' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>Invoices</button>
    <button onClick={() => setActiveTab('payments')} className={`pb-3 px-1 font-black text-[10px] uppercase tracking-widest transition-all ${ activeTab === 'payments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>Payments</button>
  </div>

  { activeTab === 'feeAnalytics' && (
    <FeeAnalytics 
      school={school} 
      invoices={invoices} 
      payments={payments} 
      feeStructures={feeStructures} 
      classes={classes}
      termsMap={termsMap}
      students={students}
    />
  )}

 { activeTab  === 'feeStructures'&& (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-medium">Fee Structures</h3>
 <button onClick={() => setShowAddFee(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-700">
 <Plus size={ 16 } /> Add Fee
 </button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 { feeStructures.map(fee => (
 <div key={ fee.id } className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
 <div className="flex justify-between items-start mb-2">
 <h4 className="font-medium text-slate-900">{ fee.name }</h4>
 <span className="text-sm font-medium text-blue-600">₦{ fee.amount.toLocaleString()}</span>
 </div>
 <p className="text-xs text-slate-900 mb-4">Class: { fee.classId  === 'all'?'All Classes': classes.find(c => c.id === fee.classId)?.name || fee.classId }</p>
 <div className="flex gap-2">
 <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-md text-slate-900 uppercase tracking-wider">{ fee.isMandatory ?'Mandatory':'Optional'}</span>
 <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-md text-slate-900 uppercase tracking-wider">Term { fee.termId }</span>
 </div>
 </div>
 ))}
 { feeStructures.length === 0 && <p className="text-slate-900 text-sm col-span-full">No fee structures defined yet.</p>}
 </div>
 </div>
 )}

 { activeTab  === 'invoices'&& (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-medium">Student Invoices</h3>
 <button onClick={() => setShowGenerateInvoice(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-700">
 <FileText size={ 16 } /> Generate Invoices
 </button>
 </div>
 <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
 <table className="w-full text-left text-sm">
 <thead className="bg-slate-50 text-slate-900 uppercase tracking-wider text-[10px] font-medium">
 <tr>
 <th className="p-4">Student ID</th>
 <th className="p-4">Amount</th>
 <th className="p-4">Paid</th>
 <th className="p-4">Status</th>
 <th className="p-4">Due Date</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 { invoices.map(inv => {
    const paid = inv.status === 'paid' || inv.amountPaid >= inv.amount;
    const overdue = isOverdue(inv);
    const balance = inv.amount - inv.amountPaid;

    return (
      <tr key={ inv.id } className="hover:bg-slate-50 transition-colors">
      <td className="p-4 font-medium">{ inv.studentId }</td>
      <td className="p-4">₦{ inv.amount.toLocaleString()}</td>
      <td className="p-4">₦{ inv.amountPaid.toLocaleString()}</td>
      <td className="p-4">
      <div className="flex flex-col gap-1">
        <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold w-fit flex items-center gap-1 ${
        paid ? 'bg-emerald-100 text-emerald-700' :
        inv.amountPaid > 0 ? 'bg-amber-100 text-amber-700' :
        'bg-rose-100 text-rose-700'
        }`}>
        { paid ? <><CheckCircle size={10} /> FULLY PAID</> : inv.amountPaid > 0 ? 'PARTIAL' : 'UNPAID' }
        </span>
        {overdue && !paid && (
          <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
            <Clock size={10} /> OVERDUE
          </span>
        )}
      </div>
      </td>
      <td className="p-4 text-slate-900">
        <div>{ new Date(inv.dueDate).toLocaleDateString()}</div>
        {balance > 0 && <div className="text-[10px] text-amber-600 font-bold">OUTSTANDING: ₦{balance.toLocaleString()}</div>}
      </td>
      </tr>
    );
  })}
 { invoices.length === 0 && <tr><td colSpan={ 5 } className="p-4 text-center text-slate-900">No invoices found.</td></tr>}
 </tbody>
 </table>
 </div>
 </div>
 )}

 { activeTab  === 'payments'&& (
 <div className="space-y-4">
 <h3 className="text-lg font-medium">Payment History</h3>
 <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
 <table className="w-full text-left text-sm">
 <thead className="bg-slate-50 text-slate-900 uppercase tracking-wider text-[10px] font-medium">
 <tr>
 <th className="p-4">Date</th>
 <th className="p-4">Student ID</th>
 <th className="p-4">Amount</th>
 <th className="p-4">Method</th>
 <th className="p-4">Reference</th>
 <th className="p-4">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 { payments.map(pay => (
 <tr key={ pay.id } className="hover:bg-slate-50">
 <td className="p-4 text-slate-900">{ new Date(pay.date).toLocaleString()}</td>
 <td className="p-4 font-medium">{ pay.studentId }</td>
 <td className="p-4">₦{ pay.amount.toLocaleString()}</td>
 <td className="p-4 capitalize">{ pay.method }</td>
 <td className="p-4 text-xs font-mono text-slate-900">{ pay.reference }</td>
 <td className="p-4">
 <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-medium ${
 pay.status  === 'success'?'bg-green-100 text-green-700':
 pay.status  === 'pending'?'bg-yellow-100 text-yellow-700':
'bg-red-100 text-red-700'
 }`}>
 { pay.status }
 </span>
 </td>
 </tr>
 ))}
 { payments.length === 0 && <tr><td colSpan={ 6 } className="p-4 text-center text-slate-900">No payments found.</td></tr>}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Add Fee Modal */}
 <AnimatePresence>
 { showAddFee && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-xl font-medium">Add Fee Structure</h3>
 <button onClick={() => setShowAddFee(false)} className="text-slate-900 hover:text-slate-900"><X size={ 24 } /></button>
 </div>
 <form onSubmit={ handleSaveFee } className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-slate-900 mb-1">Fee Name</label>
 <input required type="text"value={ newFee.name } onChange={ e => setNewFee({...newFee, name: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"placeholder="e.g. Tuition Fee"/>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-900 mb-1">Amount (₦)</label>
 <input required type="number"min="0"value={ newFee.amount } onChange={ e => setNewFee({...newFee, amount: Number(e.target.value)})} className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"/>
 </div>
 <div>
  <label className="block text-xs font-medium text-slate-900 mb-1">Category</label>
  <select required value={ newFee.category } onChange={ e => setNewFee({...newFee, category: e.target.value as any })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none">
    <option value="tuition">Tuition Fee</option>
    <option value="activities">Activities Fee</option>
    <option value="miscellaneous">Miscellaneous Fee</option>
  </select>
  </div>
 <div>
 <label className="block text-xs font-medium text-slate-900 mb-1">Applicable Class</label>
 <select value={ newFee.classId } onChange={ e => setNewFee({...newFee, classId: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none">
 <option value="all">All Classes</option>
 { classes.map(c => <option key={ c.id } value={ c.id }>{ c.name }</option>)}
 </select>
 </div>
  <div className="grid grid-cols-2 gap-4">
    <div>
    <label className="block text-xs font-medium text-slate-900 mb-1">Session</label>
    <select required value={ newFee.sessionId } onChange={ e => setNewFee({...newFee, sessionId: e.target.value, termId: '' })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none">
    <option value="">Select Session</option>
    { sessions.map(s => <option key={ s.id } value={ s.id }>{ s.name }</option>)}
    </select>
    </div>
    <div>
    <label className="block text-xs font-medium text-slate-900 mb-1">Term</label>
    <select required value={ newFee.termId } onChange={ e => setNewFee({...newFee, termId: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none">
    <option value="">Select Term</option>
    { newFee.sessionId && Object.values(termsMap[newFee.sessionId] || {}).map((t: any) => (
      <option key={ t.id } value={ t.id }>{ t.name }</option>
    ))}
    </select>
    </div>
  </div>
  <div className="flex items-center gap-2">
  <input type="checkbox"id="isMandatory"checked={ newFee.isMandatory } onChange={ e => setNewFee({...newFee, isMandatory: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
  <label htmlFor="isMandatory"className="text-sm text-slate-900">Mandatory Fee</label>
  </div>
 <button type="submit"className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">Save Fee</button>
 </form>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Generate Invoice Modal */}
 <AnimatePresence>
 { showGenerateInvoice && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-xl font-medium">Generate Invoices</h3>
 <button onClick={() => setShowGenerateInvoice(false)} className="text-slate-900 hover:text-slate-900"><X size={ 24 } /></button>
 </div>
  <div className="space-y-4">
  <p className="text-sm text-slate-500 leading-relaxed">Generate invoices for students based on active fee structures for the selected session and term.</p>
  
  <div className="space-y-4">
    <div>
    <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1">Session</label>
    <select 
      value={genSessionId}
      onChange={e => {
        setGenSessionId(e.target.value);
        setGenTermId('');
      }}
      className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none bg-slate-50 font-medium"
    >
      <option value="">Select Session</option>
      { sessions.map(s => <option key={ s.id } value={ s.id }>{ s.name } {s.isCurrent ? '(Current)' : ''}</option>)}
    </select>
    </div>

    <div>
    <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1">Term</label>
    <select 
      disabled={!genSessionId}
      value={genTermId}
      onChange={e => setGenTermId(e.target.value)}
      className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none bg-slate-50 font-medium disabled:opacity-50"
    >
      <option value="">Select Term</option>
      { genSessionId && Object.values(termsMap[genSessionId] || {}).map((t: any) => (
        <option key={ t.id } value={ t.id }>{ t.name } {t.isCurrent ? '(Current)' : ''}</option>
      ))}
    </select>
    </div>

    <div>
    <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1">Class</label>
    <select 
      value={genClassId}
      onChange={e => setGenClassId(e.target.value)}
      className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none bg-slate-50 font-medium"
    >
    <option value="all">All Classes</option>
    { classes.map(c => <option key={ c.id } value={ c.id }>{ c.name }</option>)}
    </select>
    </div>
  </div>

  <button 
    onClick={() => handleGenerateInvoices(genClassId, genTermId, genSessionId)} 
    disabled={!genSessionId || !genTermId}
    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none mt-4"
  >
    Generate Invoices
  </button>
  </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
};
