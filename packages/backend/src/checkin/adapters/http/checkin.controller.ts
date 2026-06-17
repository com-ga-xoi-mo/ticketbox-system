import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { OnlineCheckinUseCase } from '../../application/use-cases/online-checkin.use-case';
import type { OnlineScanResult } from '../../domain/checkin-scan.types';
import { OnlineCheckinDto } from './dto/online-checkin.dto';

@Controller('checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHECKIN_STAFF)
export class CheckinController {
  constructor(private readonly onlineCheckin: OnlineCheckinUseCase) {}

  @Post('scan')
  async scan(
    @Body() dto: OnlineCheckinDto,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<OnlineScanResult> {
    return this.onlineCheckin.execute({
      actor: { userId: req.user.id, roles: req.user.roles },
      assignmentId: dto.assignmentId,
      concertId: dto.concertId,
      gateName: dto.gate,
      qrPayload: dto.qrPayload,
      scannedAt: new Date(dto.scannedAt),
      deviceId: dto.deviceId,
    });
  }
}
