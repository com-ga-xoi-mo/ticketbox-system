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
    
    // Create assignment first
    const postOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/admin/concerts/4adb0414-cdc0-4f5b-bfa7-d4a134bb7c0c/staff',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    };
    const req2 = http.request(postOptions, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => { data2 += chunk; });
      res2.on('end', () => {
        // Now get list
        const getOptions = {
          hostname: 'localhost',
          port: 3000,
          path: '/admin/concerts/4adb0414-cdc0-4f5b-bfa7-d4a134bb7c0c/staff',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        };
        http.get(getOptions, (res3) => {
          let data3 = '';
          res3.on('data', (chunk) => { data3 += chunk; });
          res3.on('end', () => {
            console.log(data3);
          });
        });
      });
    });
    req2.write(JSON.stringify({ staffUserId: '538fe46e-fa21-418b-88bd-9575473b39df', gateName: 'Gate A' }));
    req2.end();
  });
});
req.write(JSON.stringify({ email: 'admin@ticketbox.test', password: 'demoPassword' }));
req.end();
