const fs = require('fs');
const path = require('path');

const directories = [
  'src/components/dashboards',
  'src/components',
  'src'
];

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'EACCES') return;
    }
  });
  return filelist;
};

let allFiles = [];
directories.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    if (fs.statSync(fullPath).isDirectory()) {
      allFiles = allFiles.concat(walkSync(fullPath));
    } else {
      allFiles.push(fullPath);
    }
  }
});

const tsxFiles = allFiles.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

// Exclude the student dashboard files we already fixed
const excludeFiles = [
  'StudentDashboard.tsx',
  'StudentQuizzes.tsx',
  'StudentResultView.tsx',
  'StudentGames.tsx',
  'StudentLessons.tsx',
  'StudentAssignments.tsx',
  'ClassTimetable.tsx',
  'AIStudyBuddy.tsx'
];

tsxFiles.forEach(file => {
  if (excludeFiles.some(ex => file.endsWith(ex))) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace text-black with text-gray-800
  content = content.replace(/text-black/g, 'text-gray-800');
  
  // Replace font-normal with font-medium
  content = content.replace(/font-normal/g, 'font-medium');
  
  fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed other files.');
