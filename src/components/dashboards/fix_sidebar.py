import sys

file_path = r'c:\Users\Jhedai\Desktop\Antigavity\SEED-main\src\components\dashboards\SchoolManagement.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Desktop Overview Button
old_desktop = """     <button
       onClick={() => {
         setActiveTab('overview');
         setRoleFilter('all');
         setIsMobileMenuOpen(false);
       }}
       className={ cn(
         "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all w-full text-left group border mb-4",
         activeTab === 'overview'
           ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 border-blue-500"
           : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent"
       )}
     >
       <LayoutDashboard size={ 18 } className="shrink-0 transition-colors" />
       <span>Overview</span>
     </button>"""

new_desktop = """     <button
       onClick={() => {
         setActiveTab('overview');
         setRoleFilter('all');
         setIsMobileMenuOpen(false);
       }}
       className={ cn(
         "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all w-full text-left group border mb-4",
         activeTab === 'overview'
           ? "bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100/50"
           : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent"
       )}
     >
       <LayoutDashboard size={ 18 } className="shrink-0 transition-colors" />
       <span>Overview</span>
     </button>"""

# Fix Mobile Overview Button
old_mobile = """     <button
       onClick={() => {
         setActiveTab('overview');
         setRoleFilter('all');
         setIsMobileMenuOpen(false);
       }}
       className={ cn(
         "flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all w-full text-left group",
         activeTab === 'overview'
           ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
           : "text-slate-600 hover:bg-slate-50"
       )}
     >
       <LayoutDashboard size={ 20 } className="shrink-0" />
       <span>Overview</span>
     </button>"""

new_mobile = """     <button
       onClick={() => {
         setActiveTab('overview');
         setRoleFilter('all');
         setIsMobileMenuOpen(false);
       }}
       className={ cn(
         "flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all w-full text-left group",
         activeTab === 'overview'
           ? "bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100/50"
           : "text-slate-600 hover:bg-slate-50"
       )}
     >
       <LayoutDashboard size={ 20 } className="shrink-0" />
       <span>Overview</span>
     </button>"""

if old_desktop in content:
    content = content.replace(old_desktop, new_desktop)
    print("Fixed Desktop Overview button")
else:
    print("Could not find Desktop Overview button exactly")

if old_mobile in content:
    content = content.replace(old_mobile, new_mobile)
    print("Fixed Mobile Overview button")
else:
    print("Could not find Mobile Overview button exactly")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
