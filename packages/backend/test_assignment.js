const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const { accessToken: token } = JSON.parse(data);
    const getOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/admin/concerts/4adb0414-cdc0-4f5b-bfa7-d4a134bb7c0c/staff',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    http.get(getOptions, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => { data2 += chunk; });
      res2.on('end', () => {
        console.log("GET Status:", res2.statusCode);
        console.log("Response:", data2);
      });
    });
  });
});

req.write(JSON.stringify({ email: 'admin@ticketbox.test', password: 'demoPassword' }));
req.end();
