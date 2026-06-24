import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = { host: 'localhost', port: 6379 };
const q = new Queue('artist-bio.processing', { connection });
const isPaused = await q.isPaused();
const counts = await q.getJobCounts();
console.log('isPaused:', isPaused);
console.log('counts:', counts);

const redis = new IORedis({ host: 'localhost', port: 6379 });
const keys = await redis.keys('bull:*');
console.log('\nAll BullMQ queue keys:');
[...new Set(keys.map(k => k.split(':').slice(0,2).join(':')))].sort().forEach(k => console.log(' ', k));
await redis.quit();
await q.close();
