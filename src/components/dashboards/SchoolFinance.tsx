import React, { useState, useEffect } from'react';
import { db, collection, addDoc, updateDoc, doc, getDocs, query, where, onSnapshot, OperationType, handleFirestoreError } from'../../firebase';
import { School, FeeStructure, Invoice, Payment, Class, UserProfile } from'../../types';
import { Plus, Edit2, Trash2, FileText, CheckCircle, Clock, Search, X } from'lucide-react';
import { motion, AnimatePresence } from'motion/react';

export const SchoolFinance = ({ school }: { school: School }) => {
 const [activeTab, setActiveTab] = useState<'feeStructures'|'invoices'|'payments'>('feeStructures');
 const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [payments, setPayments] = useState<Payment[]>([]);
 const [classes, setClasses] = useState<Class[]>([]);
 const [loading, setLoading] = useState(true);

 // Modals
 const [showAddFee, setShowAddFee] = useState(false);
 const [showGenerateInvoice, setShowGenerateInvoice] = useState(false);

 // Form states
 const [newFee, setNewFee] = useState<Partial<FeeStructure>>({ name:'', amount: 0, classId:'all', isMandatory: true, termId:'1', sessionId:'2025/2026'});

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
 setLoading(false);
 });

 return () => { unsubFees(); unsubInvoices(); unsubPayments(); unsubClasses(); };
 }, [school.id]);

 const handleSaveFee = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 await addDoc(collection(db,`schools/${ school.id }/feeStructures`), {
 ...newFee,
 schoolId: school.id,
 createdAt: new Date().toISOString()
 });
 setShowAddFee(false);
 setNewFee({ name:'', amount: 0, classId:'all', isMandatory: true, termId:'1', sessionId:'2025/2026'});
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
 <div className="flex gap-4 border-b border-gray-200">
 <button onClick={() => setActiveTab('feeStructures')} className={`pb-2 px-1 font-medium text-sm ${ activeTab  === 'feeStructures'?'border-b-2 border-blue-600 text-blue-600':'text-slate-900 hover:text-slate-900'}`}>Fee Structures</button>
 <button onClick={() => setActiveTab('invoices')} className={`pb-2 px-1 font-medium text-sm ${ activeTab  === 'invoices'?'border-b-2 border-blue-600 text-blue-600':'text-slate-900 hover:text-slate-900'}`}>Invoices</button>
 <button onClick={() => setActiveTab('payments')} className={`pb-2 px-1 font-medium text-sm ${ activeTab  === 'payments'?'border-b-2 border-blue-600 text-blue-600':'text-slate-900 hover:text-slate-900'}`}>Payments</button>
 </div>

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
 { invoices.map(inv => (
 <tr key={ inv.id } className="hover:bg-slate-50">
 <td className="p-4 font-medium">{ inv.studentId }</td>
 <td className="p-4">₦{ inv.amount.toLocaleString()}</td>
 <td className="p-4">₦{ inv.amountPaid.toLocaleString()}</td>
 <td className="p-4">
 <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-medium ${
 inv.status  === 'paid'?'bg-green-100 text-green-700':
 inv.status  === 'partial'?'bg-yellow-100 text-yellow-700':
'bg-red-100 text-red-700'
 }`}>
 { inv.status }
 </span>
 </td>
 <td className="p-4 text-slate-900">{ new Date(inv.dueDate).toLocaleDateString()}</td>
 </tr>
 ))}
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
 <label className="block text-xs font-medium text-slate-900 mb-1">Applicable Class</label>
 <select value={ newFee.classId } onChange={ e => setNewFee({...newFee, classId: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none">
 <option value="all">All Classes</option>
 { classes.map(c => <option key={ c.id } value={ c.id }>{ c.name }</option>)}
 </select>
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
 <p className="text-sm text-slate-900">Select a class to generate invoices for the current term based on active fee structures.</p>
 <div>
 <label className="block text-xs font-medium text-slate-900 mb-1">Class</label>
 <select className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none">
 <option value="all">All Classes</option>
 { classes.map(c => <option key={ c.id } value={ c.id }>{ c.name }</option>)}
 </select>
 </div>
 <button onClick={() => handleGenerateInvoices('all','1','2025/2026')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">Generate</button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
};
