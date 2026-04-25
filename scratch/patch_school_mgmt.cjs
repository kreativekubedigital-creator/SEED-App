const fs = require('fs');
const path = require('path');

const filePath = path.join('src', 'components', 'dashboards', 'SchoolManagement.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add imports
if (!content.includes('CreditCard')) {
  content = content.replace(/Menu\s*\}\s*from'lucide-react';/, "Menu,\n  CreditCard,\n  AlertCircle\n } from'lucide-react';");
}

// Update stats logic
const statsMatch = /const stats = useMemo\(\(\) => \(\{[\s\S]*?\}\), \[users\]\);/;
const newStatsLogic = `  const [stats, setStats] = useState({ 
    admins: 0, 
    teachers: 0, 
    students: 0, 
    parents: 0,
    totalRevenue: 0,
    outstandingFees: 0,
    activeClasses: 0
  });

  useEffect(() => {
    if (!school.id) return;
    
    // Calculate basic user stats
    const admins = users.filter(u => u.role === 'school_admin').length;
    const teachers = users.filter(u => u.role === 'teacher').length;
    const students = users.filter(u => u.role === 'student').length;
    const parents = users.filter(u => u.role === 'parent').length;

    // Fetch financial stats (invoices)
    const fetchFinanceStats = async () => {
      try {
        const invoicesSnap = await getDocs(collection(db, 'schools', school.id, 'invoices'));
        let totalPaid = 0;
        let totalOwed = 0;
        invoicesSnap.docs.forEach(doc => {
          const data = doc.data();
          totalPaid += (data.amountPaid || 0);
          totalOwed += (data.amount || 0) - (data.amountPaid || 0);
        });
        
        setStats({
          admins,
          teachers,
          students,
          parents,
          totalRevenue: totalPaid,
          outstandingFees: totalOwed,
          activeClasses: classes.length
        });
      } catch (err) {
        console.error('Error fetching finance stats:', err);
        setStats(prev => ({ ...prev, admins, teachers, students, parents, activeClasses: classes.length }));
      }
    };

    fetchFinanceStats();
  }, [users, classes, school.id]);`;

content = content.replace(statsMatch, newStatsLogic);

// Update overview stats grid
const gridMatch = /\{\/\* Stats Grid \*\/\}[\s\S]*?<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">[\s\S]*?\{stat\.value\}[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\}\)[\s\S]*?<\/div>/;
const newGrid = `  {/* Stats Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[
      { label: 'Total Revenue', value: \`₦\${stats.totalRevenue.toLocaleString()}\`, icon: CreditCard, colorClass: 'from-emerald-50 to-emerald-100 text-emerald-600 border-emerald-200/50' },
      { label: 'Outstanding', value: \`₦\${stats.outstandingFees.toLocaleString()}\`, icon: AlertCircle, colorClass: 'from-red-50 to-red-100 text-red-600 border-red-200/50' },
      { label: 'Active Students', value: stats.students, icon: GraduationCap, colorClass: 'from-blue-50 to-blue-100 text-blue-600 border-blue-200/50' },
      { label: 'Classes', value: stats.activeClasses, icon: BookOpen, colorClass: 'from-indigo-50 to-indigo-100 text-indigo-600 border-indigo-200/50' },
    ].map(stat => (
      <div key={ stat.label } className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className={\`w-10 h-10 bg-gradient-to-br \${ stat.colorClass } rounded-xl flex items-center justify-center shadow-sm border shrink-0\`}>
          <stat.icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{ stat.label }</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5 truncate">{ stat.value }</p>
        </div>
      </div>
    ))}
  </div>`;

content = content.replace(gridMatch, newGrid);

fs.writeFileSync(filePath, content);
console.log('Successfully patched SchoolManagement.tsx');
