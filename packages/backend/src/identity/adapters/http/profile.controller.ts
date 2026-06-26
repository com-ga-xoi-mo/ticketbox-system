import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateMyProfileDto } from './dto/profile.dto';
import { UpdateMyPasswordDto } from './dto/password.dto';
import { UpdateMyPasswordUseCase } from '../../application/use-cases/update-my-password.use-case';
import { UploadMyAvatarUseCase } from '../../application/use-cases/upload-my-avatar.use-case';
import { RemoveMyAvatarUseCase } from '../../application/use-cases/remove-my-avatar.use-case';
import { InvalidAvatarError } from '../../application/services/avatar-image-validator';
import { UpdateMyProfileUseCase } from '../../application/use-cases/update-my-profile.use-case';

import { GetMyProfileQuery } from '../../application/queries/get-my-profile.query';
import type { AuthenticatedUser } from '../../domain/authenticated-user.interface';
import { InvalidCredentialsError } from '../../domain/errors';
import { Role } from '../../domain/role.enum';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from '../../infrastructure/passport/jwt-auth.guard';
import { toMyProfileResponse } from './identity-contract.mapper';

/**
 * HTTP adapter for the authenticated user's own profile.
 *
 * Demonstrates how JwtAuthGuard + RolesGuard protect a route.
 * All authenticated users (any role) may access their own profile.
 */
@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController {
  constructor(
    private readonly getMyProfile: GetMyProfileQuery,
    private readonly updateMyProfile: UpdateMyProfileUseCase,
    private readonly updateMyPassword: UpdateMyPasswordUseCase,
    private readonly uploadMyAvatar: UploadMyAvatarUseCase,
    private readonly removeMyAvatar: RemoveMyAvatarUseCase,
  ) {}

  @Get('profile')
  @Roles(Role.AUDIENCE, Role.ORGANIZER, Role.CHECKIN_STAFF, Role.ADMIN)
  async getProfile(@Request() req: { user: AuthenticatedUser }) {
    const profile = await this.getMyProfile.execute(req.user.id);
    if (!profile) {
      throw new UnauthorizedException('Authenticated user no longer exists');
    }

    return toMyProfileResponse(req.user, profile);
  }

  @Patch('profile')
  @Roles(Role.AUDIENCE, Role.ORGANIZER, Role.CHECKIN_STAFF, Role.ADMIN)
  async updateProfile(@Request() req: { user: AuthenticatedUser }, @Body() dto: UpdateMyProfileDto) {
    await this.updateMyProfile.execute(req.user.id, dto);
    const profile = await this.getMyProfile.execute(req.user.id);
    if (!profile) {
      throw new UnauthorizedException('Authenticated user no longer exists');
    }
    return toMyProfileResponse(req.user, profile);
  }

  @Patch('password')
  @Roles(Role.AUDIENCE, Role.ORGANIZER, Role.CHECKIN_STAFF, Role.ADMIN)
  async updatePassword(@Request() req: { user: AuthenticatedUser }, @Body() dto: UpdateMyPasswordDto) {
    try {
      await this.updateMyPassword.execute(req.user.id, dto);
      return { success: true as const };
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid current password');
      }
      throw err;
    }
  }

  @Post('avatar')
  @Roles(Role.AUDIENCE, Role.ORGANIZER, Role.CHECKIN_STAFF, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Request() req: { user: AuthenticatedUser },
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    try {
      return await this.uploadMyAvatar.execute({
        userId: req.user.id,
        fileBuffer: file?.buffer ?? Buffer.alloc(0),
        originalName: file?.originalname ?? '',
        mimeType: file?.mimetype ?? '',
        sizeBytes: file?.size ?? 0,
      });
    } catch (err) {
      if (err instanceof InvalidAvatarError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Delete('avatar')
  @Roles(Role.AUDIENCE, Role.ORGANIZER, Role.CHECKIN_STAFF, Role.ADMIN)
  async removeAvatar(@Request() req: { user: AuthenticatedUser }) {
    await this.removeMyAvatar.execute(req.user.id);
    const profile = await this.getMyProfile.execute(req.user.id);
    if (!profile) {
      throw new UnauthorizedException('Authenticated user no longer exists');
    }
    return toMyProfileResponse(req.user, profile);
  }
}
