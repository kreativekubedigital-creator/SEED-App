const https = require('https');
https.get('https://seedng.vercel.app/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data.includes('seed-logo.gif'));
    console.log(data.includes('seed-logo-navbar.gif'));
  });
});
