const fs = require('fs');
const path = require('path');

const files = [
  'src/components/dashboards/StudentDashboard.tsx',
  'src/components/dashboards/StudentQuizzes.tsx',
  'src/components/dashboards/StudentResultView.tsx',
  'src/components/dashboards/StudentGames.tsx',
  'src/components/dashboards/StudentLessons.tsx',
  'src/components/dashboards/StudentAssignments.tsx',
  'src/components/dashboards/ClassTimetable.tsx',
  'src/components/dashboards/AIStudyBuddy.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix the font-normal issue
  content = content.replace(/font-normal/g, 'font-medium');
  
  // Fix the text-black issue (we'll just use text-gray-800 for most text-black)
  content = content.replace(/text-black/g, 'text-gray-800');

  // Replace bg-{color}-400 with bg-{color}-100
  content = content.replace(/bg-orange-400/g, 'bg-orange-100');
  content = content.replace(/bg-blue-400/g, 'bg-blue-100');
  content = content.replace(/bg-purple-400/g, 'bg-purple-100');
  content = content.replace(/bg-pink-400/g, 'bg-pink-100');
  content = content.replace(/bg-green-400/g, 'bg-green-100');
  content = content.replace(/bg-yellow-400/g, 'bg-yellow-100');
  content = content.replace(/bg-red-400/g, 'bg-red-100');
  
  // Replace bg-{color}-500 with bg-{color}-200
  content = content.replace(/bg-orange-500/g, 'bg-orange-200');
  content = content.replace(/bg-blue-500/g, 'bg-blue-200');
  content = content.replace(/bg-purple-500/g, 'bg-purple-200');
  content = content.replace(/bg-pink-500/g, 'bg-pink-200');
  content = content.replace(/bg-green-500/g, 'bg-green-200');
  content = content.replace(/bg-yellow-500/g, 'bg-yellow-200');
  content = content.replace(/bg-red-500/g, 'bg-red-200');

  // Replace text-white with text-gray-800 in the context of these cards
  content = content.replace(/text-white/g, 'text-gray-800');
  
  // But wait, buttons like bg-blue-600 text-gray-800 will look bad. Let's fix buttons.
  content = content.replace(/bg-blue-600 text-gray-800/g, 'bg-blue-600 text-white');
  content = content.replace(/bg-gray-900 text-gray-800/g, 'bg-gray-900 text-white');
  content = content.replace(/bg-purple-600 text-gray-800/g, 'bg-purple-600 text-white');
  content = content.replace(/bg-orange-600 text-gray-800/g, 'bg-orange-600 text-white');
  content = content.replace(/bg-green-600 text-gray-800/g, 'bg-green-600 text-white');
  content = content.replace(/bg-pink-600 text-gray-800/g, 'bg-pink-600 text-white');
  content = content.replace(/bg-red-600 text-gray-800/g, 'bg-red-600 text-white');
  
  // Fix text-gray-800/80, text-gray-800/90, text-gray-800/70
  content = content.replace(/text-gray-800\/80/g, 'text-gray-700');
  content = content.replace(/text-gray-800\/90/g, 'text-gray-800');
  content = content.replace(/text-gray-800\/70/g, 'text-gray-600');
  content = content.replace(/text-gray-800\/60/g, 'text-gray-600');
  content = content.replace(/text-gray-800\/50/g, 'text-gray-500');
  
  // Fix bg-white/30, bg-white/20 etc
  content = content.replace(/bg-white\/30/g, 'bg-white/60');
  content = content.replace(/bg-white\/20/g, 'bg-white/40');
  
  // Fix text-blue-50, text-purple-50 etc
  content = content.replace(/text-blue-50 /g, 'text-blue-900 ');
  content = content.replace(/text-purple-50 /g, 'text-purple-900 ');
  content = content.replace(/text-orange-50 /g, 'text-orange-900 ');
  content = content.replace(/text-pink-50 /g, 'text-pink-900 ');
  content = content.replace(/text-green-50 /g, 'text-green-900 ');
  content = content.replace(/text-yellow-50 /g, 'text-yellow-900 ');
  content = content.replace(/text-red-50 /g, 'text-red-900 ');

  // Fix text-blue-100, text-purple-100 etc
  content = content.replace(/text-blue-100/g, 'text-blue-800');
  content = content.replace(/text-purple-100/g, 'text-purple-800');
  content = content.replace(/text-orange-100/g, 'text-orange-800');
  content = content.replace(/text-pink-100/g, 'text-pink-800');
  content = content.replace(/text-green-100/g, 'text-green-800');
  content = content.replace(/text-yellow-100/g, 'text-yellow-800');
  content = content.replace(/text-red-100/g, 'text-red-800');

  fs.writeFileSync(file, content);
});
console.log('Colors updated to lighter shades.');
