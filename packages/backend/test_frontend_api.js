const http = require('http');

// Make a request to the backend like the frontend would
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/admin/users?role=CHECKIN_STAFF&status=ACTIVE',
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log("Status:", res.statusCode);
});
req.end();
