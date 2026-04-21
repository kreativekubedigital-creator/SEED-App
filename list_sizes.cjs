const fs = require('fs');
const files = fs.readdirSync('public/assets/logos');
files.forEach(f => console.log(f, fs.statSync('public/assets/logos/' + f).size));
