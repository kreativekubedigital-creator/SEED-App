const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/dashboards/SchoolManagement.tsx',
  'src/components/dashboards/TeacherDashboard.tsx',
  'src/components/dashboards/SuperAdminDashboard.tsx',
  'src/components/dashboards/StudentDashboard.tsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update general input fields
    const oldInputClass = /className="w-full px-4 py-2\.5 rounded-xl border border-gray-200\/50 bg-white\/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500\/10 outline-none transition-all font-medium text-gray-900"/g;
    const newInputClass = 'className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 cursor-text"';
    
    content = content.replace(oldInputClass, newInputClass);

    // Also update textareas
    const oldTextareaClass = /className="w-full px-4 py-2\.5 rounded-xl border border-gray-200\/50 bg-white\/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500\/10 outline-none transition-all font-medium text-gray-900 min-h-\[120px\]"/g;
    const newTextareaClass = 'className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 min-h-[120px] cursor-text"';

    content = content.replace(oldTextareaClass, newTextareaClass);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
