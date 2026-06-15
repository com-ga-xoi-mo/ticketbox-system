import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { DatabaseModule } from '../platform/database/database.module';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';

// Application — use-cases
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';

// Adapters — HTTP controllers
import { AuthController } from './adapters/http/auth.controller';
import { RolesGuard } from './adapters/http/guards/roles.guard';
import { ProfileController } from './adapters/http/profile.controller';

// Domain — DI tokens
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from './domain/ports/password-hasher.port';
import { TOKEN_ISSUER, type TokenIssuerPort } from './domain/ports/token-issuer.port';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from './domain/ports/user-repository.port';

// Infrastructure — concrete implementations
import { BcryptPasswordHasher } from './infrastructure/crypto/bcrypt-password-hasher';
import { PrismaUserRepository } from './infrastructure/database/prisma-user.repository';
import { JwtAuthGuard } from './infrastructure/passport/jwt-auth.guard';
import { JwtStrategy } from './infrastructure/passport/jwt.strategy';
import { JwtTokenIssuer } from './infrastructure/token/jwt-token-issuer';

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
        signOptions: { expiresIn: config.jwtExpiry },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    }),
  ],
  controllers: [AuthController, ProfileController],
  providers: [
    // Application layer
    {
      provide: RegisterUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
      useFactory: (
        userRepository: IUserRepository,
        passwordHasher: PasswordHasherPort,
        tokenIssuer: TokenIssuerPort,
      ) => new RegisterUseCase(userRepository, passwordHasher, tokenIssuer),
    },
    {
      provide: LoginUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
      useFactory: (
        userRepository: IUserRepository,
        passwordHasher: PasswordHasherPort,
        tokenIssuer: TokenIssuerPort,
      ) => new LoginUseCase(userRepository, passwordHasher, tokenIssuer),
    },

    // Infrastructure layer — Bind port to concrete implementation
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_ISSUER,
      useClass: JwtTokenIssuer,
    },

    // Infrastructure layer — Passport wiring
    JwtStrategy,
    JwtAuthGuard,

    // Shared guard (used across modules)
    RolesGuard,
  ],
  exports: [
    // Export guards so other modules (Concert, CheckIn, etc.) can use them
    JwtAuthGuard,
    RolesGuard,
    JwtModule,
  ],
})
export class AuthModule {}

// ---------------------------------------------------------------------------
// Convenience re-exports for consumers of this module
// ---------------------------------------------------------------------------
export { Roles } from './adapters/http/decorators/roles.decorator';
export { Role } from './domain/role.enum';
export type { JwtPayload } from './domain/jwt-payload.interface';
export type { AuthenticatedUser } from './domain/authenticated-user.interface';
export { JwtAuthGuard } from './infrastructure/passport/jwt-auth.guard';
export { RolesGuard } from './adapters/http/guards/roles.guard';
