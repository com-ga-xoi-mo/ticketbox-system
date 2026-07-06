import fs from 'fs';

async function fetchApi(path, options = {}) {
  const res = await fetch(`http://localhost:3000${path}`, options);
  let body = null;
  try { body = await res.json(); } catch(e) {}
  return { status: res.status, body };
}

async function run() {
  console.log("=== TicketBox Edge Case Simulator ===");
  
  // 1. Register a test user
  console.log("1. Logging in as audience@ticketbox.test...");

  const loginRes = await fetchApi('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'audience@ticketbox.test', password: 'demoPassword' })
  });
  
  if (loginRes.status !== 200) {
      console.log("Login failed!", loginRes.body);
      return;
  }
  const token = loginRes.body.accessToken;
  console.log("-> Token acquired.");

  // Get concert list BEFORE rate limiting our own IP
  const concertsRes = await fetchApi('/concerts');
  if (!concertsRes.body || !concertsRes.body.length) {
      console.log("No concerts found in DB. Exiting test.");
      return;
  }
  
  // Get detailed concert info to fetch ticket types
  const concertSlug = concertsRes.body[0].slug;
  const detailRes = await fetchApi(`/concerts/${concertSlug}`);
  const concert = detailRes.body;
  const ticketType = concert.ticketTypes.find(t => t.name === 'SVIP') || concert.ticketTypes[0];

  // 2. Tải trọng đột biến (Rate Limiting) trên API /concerts
  console.log("\n2. Tải trọng đột biến (Rate Limiting on GET /concerts)");
  console.log("-> Firing 150 simultaneous requests (Capacity is 120)...");
  const rateLimitPromises = [];
  for (let i = 0; i < 150; i++) {
    rateLimitPromises.push(fetchApi('/concerts'));
  }
  const rateLimitResults = await Promise.all(rateLimitPromises);
  const statusCounts = rateLimitResults.reduce((acc, res) => {
    acc[res.status] = (acc[res.status] || 0) + 1;
    return acc;
  }, {});
  console.log("-> Responses by Status Code:", statusCounts);
  if (statusCounts['429']) {
    console.log("-> ✅ Rate limiting is successfully kicking in under load (429 Too Many Requests)!");
  } else {
    console.log("-> ❌ Rate limiting did NOT kick in. All requests returned", Object.keys(statusCounts));
  }

  // 3. Tranh chấp vé & Giới hạn per-user (Concurrency checkout)
  console.log("\n3. Tranh chấp vé & Giới hạn per-user");
  console.log(`-> Target Concert: ${concert.title}, TicketType: ${ticketType.name} (ID: ${ticketType.id})`);

  console.log("-> Firing 20 simultaneous order requests (each for 2 tickets) for the same user...");
  // Each order uses the checkout rate limit which is 5. So we should see 429 for some.
  // And the per-user limit is usually 4 tickets. So only max 2 orders (4 tickets) should succeed.
  const orderPromises = [];
  for (let i = 0; i < 20; i++) {
    orderPromises.push(fetchApi('/checkout/orders', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        concertId: concert.id,
        items: [{ ticketTypeId: ticketType.id, quantity: 2 }]
      })
    }));
  }
  const orderResults = await Promise.all(orderPromises);
  const orderStatusCounts = orderResults.reduce((acc, res) => {
    acc[res.status] = (acc[res.status] || 0) + 1;
    return acc;
  }, {});
  console.log("-> Order Responses by Status Code:", orderStatusCounts);
  const successOrders = orderResults.filter(r => r.status === 201);
  console.log(`-> Successfully placed ${successOrders.length} orders.`);
  
  const conflictErrors = orderResults.filter(r => r.status === 409 || r.status === 400 || r.status === 429);
  console.log(`-> Errors (RateLimit/Validation/Conflict): ${conflictErrors.length}`);
  if (conflictErrors.length > 0) {
      console.log("-> Details of errors (sample):");
      const errorTypes = [...new Set(conflictErrors.map(r => r.body?.message || r.body?.error || r.status))];
      console.log("   Seen errors:", errorTypes);
  }
  
  if (successOrders.length <= 2) {
      console.log("-> ✅ Per-user limits and Rate Limits successfully enforced during concurrent attack!");
  } else {
      console.log("-> ❌ Failed to enforce limits under concurrency!");
  }

  console.log("\n=== Testing Complete ===");
}

run().catch(console.error);
