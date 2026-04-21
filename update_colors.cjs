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

tsxFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace faded text colors with black
  content = content.replace(/text-gray-400/g, 'text-black');
  content = content.replace(/text-gray-500/g, 'text-black');
  content = content.replace(/text-gray-600/g, 'text-black');
  content = content.replace(/text-gray-700/g, 'text-black');
  content = content.replace(/text-gray-800/g, 'text-black');
  content = content.replace(/text-gray-900/g, 'text-black');
  
  // Replace bolded text with normal
  content = content.replace(/font-bold/g, 'font-normal');
  content = content.replace(/font-semibold/g, 'font-normal');
  content = content.replace(/font-medium/g, 'font-normal');
  
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
});

