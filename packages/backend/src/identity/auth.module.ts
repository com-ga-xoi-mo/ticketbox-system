import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { DatabaseModule } from '../platform/database/database.module';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ProfileController } from './profile.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PlatformConfigModule,
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [PlatformConfigModule],
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtExpiry as any },
      }),
    }),
  ],
  controllers: [AuthController, ProfileController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}

// Re-export decorators and guards for convenience
export { Roles } from './decorators/roles.decorator';
export { Role } from './domain/role.enum';
export type { JwtPayload } from './domain/jwt-payload.interface';
export type { AuthenticatedUser } from './strategies/jwt.strategy';
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';
