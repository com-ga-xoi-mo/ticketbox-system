import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ComputeTrustScoreUseCase } from '../../application/use-cases/trust.use-cases';

@Processor('compute-seller-trust')
export class ResaleTrustProcessor extends WorkerHost {
  constructor(private readonly computeTrustScoreUseCase: ComputeTrustScoreUseCase) {
    super();
  }

  async process(job: Job<{ sellerId: string }>) {
    await this.computeTrustScoreUseCase.execute(job.data.sellerId);
  }
}
