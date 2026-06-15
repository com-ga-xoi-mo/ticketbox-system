const url = process.env.HEALTH_URL ?? 'http://localhost:3000/health';

const response = await fetch(url);
const body = await response.text();

if (!response.ok) {
  console.error(`Health check failed: ${response.status} ${response.statusText}`);
  console.error(body);
  process.exit(1);
}

console.log(body);
