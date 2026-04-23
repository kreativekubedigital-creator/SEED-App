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

  // Fix the spacing issues around operators and keywords that my previous regex might have caused
  content = content.replace(/===('|")/g, ' === $1');
  content = content.replace(/('|")===/g, '$1 === ');
  content = content.replace(/&&(?=\()/g, ' && ');
  content = content.replace(/\?(?={)/g, ' ? ');
  content = content.replace(/:(?=\[)/g, ' : ');
  content = content.replace(/,(?=[a-zA-Z0-9])/g, ', ');
  content = content.replace(/\{(?=[a-zA-Z0-9])/g, '{ ');
  content = content.replace(/(?<=[a-zA-Z0-9])\}/g, ' }');
  
  // Specific renames
  content = content.replace(/label: 'Admins'/g, "label: 'School Admins'");
  content = content.replace(/label:'Admins'/g, "label: 'School Admins'");

  fs.writeFileSync(fullPath, content);
  console.log(`Formatted and renamed in ${relPath}`);
});
