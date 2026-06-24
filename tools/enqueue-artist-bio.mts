import { Queue } from 'bullmq';
const artistBioId = process.argv[2];
if (!artistBioId) { console.error('Usage: npx.cmd tsx tools/enqueue-artist-bio.mts <artistBioId>'); process.exit(1); }
const q = new Queue('artist-bio.processing', { connection: { host: 'localhost', port: 6379 }, prefix: 'ticketbox' });
const job = await q.add('artist_bio.requested', { artistBioId }, {
  jobId: `artist-bio-${artistBioId}-manual`,
  removeOnComplete: true,
  removeOnFail: false,
});
console.log('Enqueued job:', job.id);
await q.close();
