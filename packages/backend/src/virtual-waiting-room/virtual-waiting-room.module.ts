import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { WAITING_ROOM_ADMISSION_PORT } from '../ordering/domain/ports/waiting-room-admission.port';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { DatabaseModule } from '../platform/database/database.module';
import { RedisModule } from '../platform/redis/redis.module';
import { WaitingRoomController } from './adapters/http/waiting-room.controller';
import { OrganizerWaitingRoomController } from './adapters/http/organizer-waiting-room.controller';
import { AdmitWaitingRoomUseCase } from './application/use-cases/admit-waiting-room.use-case';
import { ComputeEffectiveActiveUseCase } from './application/use-cases/compute-effective-active.use-case';
import { ConfigureWaitingRoomUseCase } from './application/use-cases/configure-waiting-room.use-case';
import { GetWaitingRoomConfigUseCase } from './application/use-cases/get-waiting-room-config.use-case';
import { GetWaitingRoomStatusUseCase } from './application/use-cases/get-waiting-room-status.use-case';
import { IncrementWaitingRoomLoadUseCase } from './application/use-cases/increment-waiting-room-load.use-case';
import { JoinWaitingRoomUseCase } from './application/use-cases/join-waiting-room.use-case';
import { LeaveWaitingRoomUseCase } from './application/use-cases/leave-waiting-room.use-case';
import { ReleaseAdmissionSlotUseCase } from './application/use-cases/release-admission-slot.use-case';
import { SetWaitingRoomOverrideUseCase } from './application/use-cases/set-waiting-room-override.use-case';
import { ValidateAdmissionUseCase } from './application/use-cases/validate-admission.use-case';
import { WAITING_ROOM_CONFIG_REPOSITORY } from './domain/ports/waiting-room-config-repository.port';
import { WAITING_ROOM_STORE } from './domain/ports/waiting-room-store.port';
import { PrismaWaitingRoomConfigRepository } from './infrastructure/database/prisma-waiting-room-config.repository';
import { WaitingRoomAdmissionAdapter } from './infrastructure/ordering/waiting-room-admission.adapter';
import { WaitingRoomStreamTokenService } from './infrastructure/realtime/waiting-room-stream-token.service';
import { RedisWaitingRoomStore } from './infrastructure/redis/redis-waiting-room.store';

@Module({
  imports: [AuthModule, DatabaseModule, RedisModule, PlatformConfigModule],
  controllers: [WaitingRoomController, OrganizerWaitingRoomController],
  providers: [
    {
      provide: WAITING_ROOM_CONFIG_REPOSITORY,
      useClass: PrismaWaitingRoomConfigRepository,
    },
    {
      provide: WAITING_ROOM_STORE,
      useClass: RedisWaitingRoomStore,
    },
    ComputeEffectiveActiveUseCase,
    ConfigureWaitingRoomUseCase,
    GetWaitingRoomConfigUseCase,
    GetWaitingRoomStatusUseCase,
    JoinWaitingRoomUseCase,
    LeaveWaitingRoomUseCase,
    AdmitWaitingRoomUseCase,
    ValidateAdmissionUseCase,
    ReleaseAdmissionSlotUseCase,
    IncrementWaitingRoomLoadUseCase,
    SetWaitingRoomOverrideUseCase,
    WaitingRoomStreamTokenService,
    {
      provide: WAITING_ROOM_ADMISSION_PORT,
      useClass: WaitingRoomAdmissionAdapter,
    },
  ],
  exports: [
    WAITING_ROOM_ADMISSION_PORT,
    WAITING_ROOM_CONFIG_REPOSITORY,
    WAITING_ROOM_STORE,
    AdmitWaitingRoomUseCase,
    ValidateAdmissionUseCase,
    ReleaseAdmissionSlotUseCase,
    IncrementWaitingRoomLoadUseCase,
  ],
})
export class VirtualWaitingRoomModule {}

