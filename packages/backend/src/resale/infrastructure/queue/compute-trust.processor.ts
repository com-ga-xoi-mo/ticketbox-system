import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ComputeTrustScoreUseCase } from '../../application/use-cases/trust.use-cases';

@Processor('compute-seller-trust')
export class ResaleTrustProcessor extends WorkerHost {
  private readonly logger = new Logger(ResaleTrustProcessor.name);

  constructor(private readonly computeTrustScoreUseCase: ComputeTrustScoreUseCase) {
    super();
  }

  async process(job: Job<{ sellerId: string; event?: string }>) {
    try {
      await this.computeTrustScoreUseCase.execute(job.data.sellerId, job.data.event);
    } catch (err) {
      this.logger.error(`Failed to compute trust score for seller ${job.data.sellerId}`, err);
      throw err;
    }
  }
}
