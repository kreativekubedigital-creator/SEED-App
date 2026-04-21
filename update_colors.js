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

  // Replace bg-{color}-400 with bg-{color}-100
  content = content.replace(/bg-orange-400/g, 'bg-orange-100');
  content = content.replace(/bg-blue-400/g, 'bg-blue-100');
  content = content.replace(/bg-purple-400/g, 'bg-purple-100');
  content = content.replace(/bg-pink-400/g, 'bg-pink-100');
  content = content.replace(/bg-green-400/g, 'bg-green-100');
  content = content.replace(/bg-yellow-400/g, 'bg-yellow-100');
  content = content.replace(/bg-red-400/g, 'bg-red-100');
  
  // Replace text-white with text-gray-800 in the context of these cards
  // We'll replace text-white with text-gray-900 where it's used with these cards
  content = content.replace(/text-white/g, 'text-gray-900');
  
  // But wait, buttons like bg-blue-600 text-gray-900 will look bad. Let's fix buttons.
  content = content.replace(/bg-blue-600 text-gray-900/g, 'bg-blue-600 text-white');
  content = content.replace(/bg-gray-900 text-gray-900/g, 'bg-gray-900 text-white');
  content = content.replace(/bg-purple-600 text-gray-900/g, 'bg-purple-600 text-white');
  content = content.replace(/bg-orange-600 text-gray-900/g, 'bg-orange-600 text-white');
  content = content.replace(/bg-green-600 text-gray-900/g, 'bg-green-600 text-white');
  content = content.replace(/bg-pink-600 text-gray-900/g, 'bg-pink-600 text-white');
  content = content.replace(/bg-red-600 text-gray-900/g, 'bg-red-600 text-white');
  
  // Fix text-white/80, text-white/90, text-white/70
  content = content.replace(/text-gray-900\/80/g, 'text-gray-700');
  content = content.replace(/text-gray-900\/90/g, 'text-gray-800');
  content = content.replace(/text-gray-900\/70/g, 'text-gray-600');
  
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
