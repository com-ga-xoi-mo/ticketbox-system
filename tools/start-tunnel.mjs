import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';

const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';
const ENV_PATH = '.env';

console.log('Starting ngrok on port 3000...');
const ngrok = spawn('ngrok', ['http', '3000'], { stdio: 'ignore' });

function getTunnelUrl() {
  return new Promise((resolve, reject) => {
    http.get(NGROK_API, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const secureTunnel = parsed.tunnels.find(t => t.public_url.startsWith('https://'));
          if (secureTunnel) resolve(secureTunnel.public_url);
          else reject(new Error('No secure tunnel found'));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function updateEnv(publicUrl) {
  let env = fs.readFileSync(ENV_PATH, 'utf8');
  
  const vnpayReturn = `${publicUrl}/payments/vnpay/return`;
  const vnpayIpn = `${publicUrl}/payments/vnpay/ipn`;
  const momoIpn = `${publicUrl}/payments/momo/ipn`;

  env = env.replace(/VNPAY_RETURN_URL=.*/g, `VNPAY_RETURN_URL=${vnpayReturn}`);
  env = env.replace(/VNPAY_IPN_URL=.*/g, `VNPAY_IPN_URL=${vnpayIpn}`);
  env = env.replace(/MOMO_IPN_URL=.*/g, `MOMO_IPN_URL=${momoIpn}`);

  fs.writeFileSync(ENV_PATH, env);
  console.log('✅ Updated .env with new ngrok URL:');
  console.log(`  VNPAY_RETURN_URL=${vnpayReturn}`);
  console.log(`  VNPAY_IPN_URL=${vnpayIpn}`);
  console.log(`  MOMO_IPN_URL=${momoIpn}`);
}

async function main() {
  let attempts = 0;
  while (attempts < 10) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const url = await getTunnelUrl();
      await updateEnv(url);
      console.log('🎉 Ngrok tunnel is active! Leave this terminal running.');
      return;
    } catch (e) {
      // Ignore and retry
    }
    attempts++;
  }
  console.error('❌ Failed to fetch ngrok URL. Make sure ngrok is authenticated.');
  ngrok.kill();
}

main();

process.on('SIGINT', () => {
  console.log('\nClosing ngrok tunnel...');
  ngrok.kill();
  process.exit();
});
