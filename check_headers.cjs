const https = require('https');
https.get('https://seedng.vercel.app/assets/logos/seed-logo.gif', (res) => {
  console.log('seed-logo.gif content-type:', res.headers['content-type']);
  console.log('seed-logo.gif content-length:', res.headers['content-length']);
});
