const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/dashboards/TeacherResultWorkspace.tsx',
  'src/components/dashboards/SchoolClasses.tsx',
  'src/components/dashboards/SchoolManagement.tsx',
  'src/components/dashboards/ResultManagement.tsx',
  'src/components/dashboards/SchoolSettings.tsx',
  'src/components/dashboards/SuperAdminDashboard.tsx',
  'src/components/dashboards/TeacherQuizzes.tsx',
  'src/components/dashboards/StudentResultView.tsx',
  'src/components/dashboards/GradingSystemConfig.tsx',
  'src/components/dashboards/AIStudyBuddy.tsx',
  'src/components/dashboards/SchoolAnnouncements.tsx',
  'src/components/dashboards/TeacherDashboard.tsx',
  'src/components/dashboards/StudentDashboard.tsx'
];

const replacements = [
  {
    // General inputs with white/50 background
    pattern: /className="w-full px-4 py-2\.5 rounded-xl border border-gray-200\/50 bg-white\/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500\/10 outline-none transition-all font-medium text-gray-900"/g,
    replacement: 'className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 cursor-text"'
  },
  {
    // Inputs with focus:ring-2
    pattern: /className="w-full px-4 py-2\.5 rounded-xl border border-gray-200\/50 bg-white\/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500\/20 outline-none transition-all font-medium text-gray-900"/g,
    replacement: 'className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 cursor-text"'
  },
  {
    // Inputs with focus:ring-2 and text-sm
    pattern: /className="w-full p-4 rounded-xl border border-gray-200 bg-white\/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500\/20 outline-none transition-all font-medium text-sm"/g,
    replacement: 'className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 cursor-text"'
  },
  {
    // Selects with py-3
    pattern: /className="w-full px-4 py-3 rounded-xl border border-gray-200\/50 bg-white\/50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-gray-900"/g,
    replacement: 'className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 cursor-pointer"'
  },
  {
    // Textareas
    pattern: /className="w-full px-4 py-2\.5 rounded-xl border border-gray-200\/50 bg-white\/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500\/10 outline-none transition-all font-medium text-gray-900 min-h-\[120px\]"/g,
    replacement: 'className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 min-h-[120px] cursor-text"'
  },
  {
    // GradingSystemConfig inputs
    pattern: /className="w-full px-3 py-2\.5 rounded-xl border border-gray-100 bg-white text-center font-medium text-gray-900 focus:border-emerald-500 outline-none"/g,
    replacement: 'className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-gray-900 text-center cursor-text"'
  },
  {
    // GradingSystemConfig select
    pattern: /className="w-full px-4 py-3 rounded-xl border border-gray-200\/50 bg-white\/50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-gray-900"/g,
    replacement: 'className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 cursor-pointer"'
  },
  {
    // TeacherQuizzes question input
    pattern: /className="w-full px-4 py-2\.5 rounded-xl border border-gray-200\/50 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500\/10 outline-none transition-all font-medium text-gray-900"/g,
    replacement: 'className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 cursor-text"'
  },
  {
    // TeacherQuizzes option input (non-correct)
    pattern: /className={`flex-1 px-4 py-3\.5 rounded-xl border outline-none transition-all bg-white font-medium text-sm \${q\.correctOption === oIndex \? 'border-emerald-500 ring-2 ring-emerald-500\/20' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500\/20'}`}/g,
    replacement: 'className={`flex-1 px-4 py-3.5 rounded-xl border outline-none transition-all font-medium text-sm ${q.correctOption === oIndex ? \'border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10\' : \'border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10\'}`}'
  },
  {
    // SchoolClasses input
    pattern: /className="w-full px-4 py-2\.5 rounded-xl border border-gray-200\/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500\/10 outline-none transition-all bg-white\/50 text-gray-900 font-medium placeholder:text-gray-400"/g,
    replacement: 'className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 cursor-text"'
  }
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    replacements.forEach(r => {
      content = content.replace(r.pattern, r.replacement);
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file}`);
    } else {
      console.log(`No changes needed for ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
