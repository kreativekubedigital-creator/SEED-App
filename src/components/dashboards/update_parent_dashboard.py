import sys

file_path = r'c:\Users\Jhedai\Desktop\Antigavity\SEED-main\src\components\dashboards\ParentDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Update Imports
imports_done = False
for i, line in enumerate(lines):
    if "import { ParentFinance } from'./ParentFinance';" in line:
        lines[i] = "import { ParentFinance } from'./ParentFinance';\nimport { Invoice, Payment, Term, Session } from '../../types';\nimport { CreditCard, CheckCircle, Clock, Construction, ChevronRight } from 'lucide-react';\n"
        imports_done = True
        break

# 2. Add State
state_done = False
for i, line in enumerate(lines):
    if "const [loading, setLoading] = useState(true);" in line:
        lines.insert(i + 2, "  const [invoices, setInvoices] = useState<Invoice[]>([]);\n  const [termsMap, setTermsMap] = useState<Record<string, Record<string, Term>>>({});\n  const [sessions, setSessions] = useState<Session[]>([]);\n")
        state_done = True
        break

# 3. Add Fetching Logic & Helper Functions
logic_done = False
for i, line in enumerate(lines):
    if "return () => {" in line and "unsubResults();" in lines[i+1]:
        # Find the end of this useEffect
        for j in range(i, i + 10):
            if "}, [activeStudentId]);" in lines[j]:
                insertion_point = j + 1
                new_logic = """
  useEffect(() => {
    if (!user.schoolId || !activeStudentId) return;

    const unsubSessions = onSnapshot(collection(db, `schools/${user.schoolId}/sessions`), (snap) => {
      const sessData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
      setSessions(sessData);
      
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

    const qInvoices = query(collection(db, `schools/${user.schoolId}/invoices`), where('studentId', '==', activeStudentId));
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    });

    return () => {
      unsubSessions();
      unsubInvoices();
    };
  }, [user.schoolId, activeStudentId]);

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

  const totalBalance = invoices.reduce((acc, inv) => {
    if (inv.status === 'paid' || inv.amountPaid >= inv.amount) return acc;
    return acc + (inv.amount - inv.amountPaid);
  }, 0);

  const hasOverdue = invoices.some(inv => isOverdue(inv));
  const allPaid = invoices.length > 0 && totalBalance === 0;
"""
                lines.insert(insertion_point, new_logic)
                logic_done = True
                break
        if logic_done: break

# 4. Add Finance Card to UI
ui_done = False
for i, line in enumerate(reversed(lines)):
    if "<div className=\"bg-white p-4 rounded-2xl border border-slate-300 shadow-sm\">" in line:
        actual_index = len(lines) - 1 - i
        # Look for the closing </div> of this grid cell
        depth = 0
        for j in range(actual_index, len(lines)):
            depth += lines[j].count('<div') - lines[j].count('</div')
            if depth <= 0 and '</div' in lines[j]:
                finance_card = """
  <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col justify-center">
    <h3 className="font-medium text-xl text-slate-900 mb-6 flex items-center gap-3">
      <div className="p-2.5 bg-green-50 rounded-full border border-green-100/50 shadow-sm"><CreditCard size={ 20 } className="text-green-600"/></div>
      Finance Summary
    </h3>
    
    <div className="space-y-4">
      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center">
        <p className="text-sm text-slate-900 font-medium mb-1">Outstanding Balance</p>
        <p className={`text-3xl font-bold ${totalBalance > 0 ? 'text-blue-600' : 'text-green-600'}`}>
          ₦{totalBalance.toLocaleString()}
        </p>
        
        {allPaid && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
            <CheckCircle size={12} />
            FULLY PAID
          </div>
        )}
        
        {hasOverdue && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <Clock size={12} />
            OVERDUE WARNING
          </div>
        )}
      </div>

      <button 
        onClick={() => setActiveTab('finance')}
        className="w-full py-3 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
      >
        View Detailed Invoices <ChevronRight size={16} />
      </button>
    </div>
  </div>
"""
                lines.insert(j + 1, finance_card)
                ui_done = True
                break
        if ui_done: break

print(f"Imports: {imports_done}, State: {state_done}, Logic: {logic_done}, UI: {ui_done}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
