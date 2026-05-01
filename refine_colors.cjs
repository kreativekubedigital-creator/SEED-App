const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/dashboards');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const isStudentDashboard = path.basename(filePath) === 'StudentDashboard.tsx';

  // 1. Tabs & Highlights
  // Replace black/dark blue highlights with premium blue
  content = content.replace(/bg-slate-950/g, 'bg-blue-600');
  content = content.replace(/bg-slate-900/g, 'bg-blue-600');
  content = content.replace(/bg-gray-900/g, 'bg-blue-600');
  content = content.replace(/text-slate-950/g, 'text-slate-900'); // Soften headings
  
  // Update shadows to match blue theme
  content = content.replace(/shadow-slate-950\/10/g, 'shadow-blue-500/10');
  content = content.replace(/shadow-slate-900\/20/g, 'shadow-blue-500/20');
  content = content.replace(/shadow-slate-950\/5/g, 'shadow-blue-500/5');

  // 1.1 Tabs (Specific refinements)
  content = content.replace(/bg-blue-50 text-blue-700 shadow-sm border border-blue-100\/50/g, 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50');
  
  // 2. Buttons
  content = content.replace(/bg-blue-600 text-white hover:bg-blue-700/g, 'bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20');

  // 3. Typography Weight Reductions
  content = content.replace(/font-black/g, 'font-bold');
  content = content.replace(/font-bold/g, 'font-semibold');
  // Avoid double replacement if font-black was already changed to font-bold
  // We should do this in one pass or be careful.
  // Let's use a temporary placeholder.
  content = content.replace(/font-black/g, 'TEMP_FONT_BOLD');
  content = content.replace(/font-bold/g, 'font-semibold');
  content = content.replace(/TEMP_FONT_BOLD/g, 'font-bold');

  // 4. Specific Component Fixes
  if (isStudentDashboard) {
    // Ensure headings remain readable but not overly heavy
    content = content.replace(/text-4xl font-bold/g, 'text-3xl font-bold');
  }

  // 5. Spacing & Borders
  content = content.replace(/border-slate-100/g, 'border-slate-200/60');
  content = content.replace(/bg-slate-50\/50/g, 'bg-slate-50/80');


  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
}

function walkDir(currentPath) {
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    const fullPath = path.join(currentPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

walkDir(dir);
console.log('Done');
