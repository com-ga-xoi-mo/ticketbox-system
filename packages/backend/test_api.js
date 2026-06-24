const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const { token } = JSON.parse(data);
    const getOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/users?role=CHECKIN_STAFF&status=ACTIVE',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    http.get(getOptions, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => { data2 += chunk; });
      res2.on('end', () => {
        console.log("API response:", data2);
      });
    });
  });
});

req.write(JSON.stringify({ email: 'admin@ticketbox.test', password: 'password123' }));
req.end();
