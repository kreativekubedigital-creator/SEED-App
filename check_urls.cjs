const https = require('https');
https.get('https://seedng.vercel.app/assets/logos/seed-logo.gif', (res) => {
  console.log('seed-logo.gif:', res.statusCode);
});
https.get('https://seedng.vercel.app/assets/logos/seed-logo-navbar.gif', (res) => {
  console.log('seed-logo-navbar.gif:', res.statusCode);
});
https.get('https://seedng.vercel.app/assets/logos/seed-logo-2.gif', (res) => {
  console.log('seed-logo-2.gif:', res.statusCode);
});
