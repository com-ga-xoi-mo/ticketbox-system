import { Queue } from 'bullmq';
const q = new Queue('artist-bio.processing', { connection: { host: 'localhost', port: 6379 } });
const waiting = await q.getWaiting();
const active = await q.getActive();
const failed = await q.getFailed();
console.log('waiting:', waiting.length, 'active:', active.length, 'failed:', failed.length);
if (failed.length) console.log('failed job reason:', failed[0].failedReason);
if (waiting.length) console.log('waiting job data:', JSON.stringify(waiting[0].data));
await q.close();
