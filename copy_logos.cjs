const fs = require('fs');
const path = require('path');

fs.mkdirSync('src/assets/logos', { recursive: true });

const files = fs.readdirSync('public/assets/logos');
files.forEach(file => {
  fs.copyFileSync(
    path.join('public/assets/logos', file),
    path.join('src/assets/logos', file)
  );
});
console.log('Copied files to src/assets/logos');
