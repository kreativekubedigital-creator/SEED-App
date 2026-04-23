import fs from 'fs';
import path from 'path';

const filesToClean = [
  'src/components/dashboards/SuperAdminDashboard.tsx',
  'src/components/dashboards/SchoolManagement.tsx',
  'src/components/dashboards/SchoolAdminDashboard.tsx',
  'src/components/dashboards/TeacherDashboard.tsx',
  'src/components/dashboards/StudentDashboard.tsx',
  'src/components/dashboards/ParentDashboard.tsx',
  'src/components/dashboards/SchoolSettings.tsx',
  'src/components/dashboards/SchoolClasses.tsx',
  'src/components/dashboards/SchoolAnnouncements.tsx',
  'src/components/dashboards/SchoolFinance.tsx',
  'src/components/dashboards/GradingSystemConfig.tsx',
  'src/components/dashboards/ClassReportCards.tsx',
  'src/components/dashboards/ClassTimetable.tsx',
  'src/components/dashboards/AIStudyBuddy.tsx',
  'src/App.tsx',
];

const workspaceRoot = 'c:\\Users\\Jhedai\\Desktop\\Antigavity\\SEED-main';

filesToClean.forEach(relPath => {
  const fullPath = path.join(workspaceRoot, relPath);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');

  // 1. Remove all dark: variants
  content = content.replace(/dark:[a-zA-Z0-9\/\-\[\]#%.:]+(?=[\s"`'}])/g, '');
  
  // 2. Global cleanup for hardcoded dark styles
  content = content.replace(/bg-\[#0a0a0a\]/g, 'bg-white');
  content = content.replace(/bg-slate-900(?=[\s"`'}])/g, 'bg-white');
  content = content.replace(/bg-slate-950(?=[\s"`'}])/g, 'bg-white');
  content = content.replace(/bg-white\/5(?=[\s"`'}])/g, 'bg-slate-50');
  content = content.replace(/bg-white\/10(?=[\s"`'}])/g, 'bg-slate-100');
  content = content.replace(/border-white\/5(?=[\s"`'}])/g, 'border-slate-100');
  content = content.replace(/border-white\/10(?=[\s"`'}])/g, 'border-slate-200');
  content = content.replace(/border-white\/20(?=[\s"`'}])/g, 'border-slate-300');
  content = content.replace(/border-white\/40(?=[\s"`'}])/g, 'border-slate-300');
  content = content.replace(/border-white\/50(?=[\s"`'}])/g, 'border-slate-300');
  content = content.replace(/divide-white\/5(?=[\s"`'}])/g, 'divide-slate-100');
  
  // 3. Text color logic - careful with text-white on primary buttons
  content = content.replace(/text-white(?=[\s"`'}])/g, (match, offset, str) => {
    // Look back to see if we are in a primary colored container
    const context = str.substring(Math.max(0, offset - 150), offset);
    if (context.includes('bg-blue-') || context.includes('bg-emerald-') || context.includes('bg-red-') || context.includes('bg-indigo-') || context.includes('bg-violet-') || context.includes('bg-purple-')) {
      return match; // Keep white text for high-contrast buttons
    }
    return 'text-slate-900';
  });

  // 4. Update slate-400/500 to better light mode contrast
  content = content.replace(/text-slate-400(?=[\s"`'}])/g, 'text-slate-500');

  // 5. Cleanup formatting issues caused by previous replacements
  content = content.replace(/  +/g, ' ');
  content = content.replace(/ ("|'|`)/g, '$1');
  content = content.replace(/("|'|`) /g, '$1');
  
  // Specific fix for the "size" attribute issue noticed
  content = content.replace(/([a-zA-Z0-9_-]+)"size/g, '$1" size');

  fs.writeFileSync(fullPath, content);
  console.log(`Deep cleaned ${relPath}`);
});
