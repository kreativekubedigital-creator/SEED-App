const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/dashboards');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const isStudentDashboard = path.basename(filePath) === 'StudentDashboard.tsx';

  // 1. Tabs
  // Replace active tab
  content = content.replace(/bg-white text-gray-900 shadow-sm border border-gray-200\/50/g, 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50');
  content = content.replace(/bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md border border-white\/20/g, 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50');
  
  // Replace inactive tab
  content = content.replace(/text-gray-500 hover:text-gray-700 hover:bg-gray-200\/50/g, 'text-gray-500 hover:text-gray-700 hover:bg-gray-100');
  content = content.replace(/text-gray-600 hover:text-gray-900 hover:bg-white\/60/g, 'text-gray-500 hover:text-gray-700 hover:bg-gray-100');

  // 2. Buttons
  // Primary buttons
  content = content.replace(/bg-gradient-to-r from-blue-600 to-indigo-600 text-white/g, 'bg-blue-600 text-white hover:bg-blue-700');
  content = content.replace(/bg-gradient-to-r from-blue-500 to-indigo-600 text-white/g, 'bg-blue-600 text-white hover:bg-blue-700');
  content = content.replace(/bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white/g, 'bg-blue-600 text-white hover:bg-blue-700');
  content = content.replace(/bg-gradient-to-r from-emerald-500 to-teal-600 text-white/g, 'bg-blue-600 text-white hover:bg-blue-700');
  content = content.replace(/bg-gradient-to-r from-orange-500 to-amber-600 text-white/g, 'bg-blue-600 text-white hover:bg-blue-700');
  
  // Remove hover:-translate-y-0.5 for a flatter, more modern feel
  content = content.replace(/hover:-translate-y-0\.5/g, '');
  content = content.replace(/hover:shadow-lg hover:shadow-blue-500\/30/g, '');
  content = content.replace(/hover:shadow-lg hover:shadow-purple-500\/30/g, '');
  content = content.replace(/hover:shadow-lg hover:shadow-emerald-500\/30/g, '');
  content = content.replace(/hover:shadow-lg hover:shadow-orange-500\/30/g, '');
  content = content.replace(/shadow-md border border-white\/20/g, 'shadow-sm');

  // Secondary buttons
  content = content.replace(/bg-white hover:bg-gray-50 border border-gray-200\/50/g, 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700');

  // 3. Cards
  if (!isStudentDashboard) {
    // Backgrounds
    content = content.replace(/bg-white\/80 backdrop-blur-md/g, 'bg-white');
    content = content.replace(/bg-white\/90 backdrop-blur-md/g, 'bg-white');
    content = content.replace(/bg-white\/50 hover:bg-white\/80/g, 'bg-white hover:bg-gray-50');
    
    // Borders
    content = content.replace(/border-white\/50/g, 'border-gray-100');
    content = content.replace(/border-white\/60/g, 'border-gray-100');
    
    // Shadows
    content = content.replace(/shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\]/g, 'shadow-sm');
    content = content.replace(/shadow-\[0_8px_30px_rgb\(0,0,0,0\.08\)\]/g, 'shadow-md');
    content = content.replace(/shadow-\[0_8px_30px_rgb\(0,0,0,0\.06\)\]/g, 'shadow-sm');
    
    // Rounded corners
    content = content.replace(/rounded-\[20px\]/g, 'rounded-2xl');
    content = content.replace(/rounded-\[24px\]/g, 'rounded-2xl');
    content = content.replace(/rounded-\[28px\]/g, 'rounded-2xl');
    content = content.replace(/rounded-\[32px\]/g, 'rounded-2xl');
  }

  // 4. Typography Hierarchy
  // Page titles
  content = content.replace(/text-3xl font-semibold/g, 'text-3xl font-bold');
  content = content.replace(/text-3xl font-medium/g, 'text-3xl font-bold');
  content = content.replace(/text-4xl font-semibold/g, 'text-4xl font-bold');
  content = content.replace(/text-4xl font-medium/g, 'text-4xl font-bold');
  
  // Section headers
  content = content.replace(/text-2xl font-bold/g, 'text-2xl font-semibold');
  content = content.replace(/text-2xl font-medium/g, 'text-2xl font-semibold');
  content = content.replace(/text-xl font-bold/g, 'text-xl font-semibold');
  content = content.replace(/text-xl font-medium/g, 'text-xl font-semibold');
  
  // Card titles
  content = content.replace(/text-lg font-bold/g, 'text-lg font-medium');
  content = content.replace(/text-lg font-semibold/g, 'text-lg font-medium');
  
  // Remove bold from numbers (if any left)
  // We already changed numbers to font-medium in previous step, let's keep them medium.

  // 5. Spacing
  // Increase spacing between sections
  content = content.replace(/space-y-6/g, 'space-y-8');
  content = content.replace(/space-y-4/g, 'space-y-6');

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
