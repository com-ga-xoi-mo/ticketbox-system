import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { DatabaseModule } from '../platform/database/database.module';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';

// Application — use-cases
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { AuthorizeAdminActionUseCase } from './application/use-cases/authorize-admin-action.use-case';
import { AuthorizeCheckinAssignmentUseCase } from './application/use-cases/authorize-checkin-assignment.use-case';
import { AuthorizeConcertManagementUseCase } from './application/use-cases/authorize-concert-management.use-case';
import { ManageCheckinStaffAssignmentsUseCase } from './application/use-cases/manage-checkin-staff-assignments.use-case';

// Adapters — HTTP controllers
import { AdminCheckinStaffAssignmentsController } from './adapters/http/admin-checkin-staff-assignments.controller';
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
import {
  CHECKIN_STAFF_ASSIGNMENT_REPOSITORY,
  type CheckinStaffAssignmentRepositoryPort,
} from './domain/ports/checkin-staff-assignment.port';
import {
  CONCERT_OWNERSHIP_REPOSITORY,
  type ConcertOwnershipRepositoryPort,
} from './domain/ports/concert-ownership.port';

// Infrastructure — concrete implementations
import { BcryptPasswordHasher } from './infrastructure/crypto/bcrypt-password-hasher';
import { PrismaCheckinStaffAssignmentRepository } from './infrastructure/database/prisma-checkin-staff-assignment.repository';
import { PrismaConcertOwnershipRepository } from './infrastructure/database/prisma-concert-ownership.repository';
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
  controllers: [AuthController, ProfileController, AdminCheckinStaffAssignmentsController],
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
    {
      provide: AuthorizeAdminActionUseCase,
      useFactory: () => new AuthorizeAdminActionUseCase(),
    },
    {
      provide: AuthorizeConcertManagementUseCase,
      inject: [CONCERT_OWNERSHIP_REPOSITORY],
      useFactory: (concertOwnershipRepository: ConcertOwnershipRepositoryPort) =>
        new AuthorizeConcertManagementUseCase(concertOwnershipRepository),
    },
    {
      provide: AuthorizeCheckinAssignmentUseCase,
      inject: [CHECKIN_STAFF_ASSIGNMENT_REPOSITORY],
      useFactory: (assignmentRepository: CheckinStaffAssignmentRepositoryPort) =>
        new AuthorizeCheckinAssignmentUseCase(assignmentRepository),
    },
    {
      provide: ManageCheckinStaffAssignmentsUseCase,
      inject: [CHECKIN_STAFF_ASSIGNMENT_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        assignmentRepository: CheckinStaffAssignmentRepositoryPort,
        authorizeConcertManagement: AuthorizeConcertManagementUseCase,
      ) =>
        new ManageCheckinStaffAssignmentsUseCase(
          assignmentRepository,
          authorizeConcertManagement,
        ),
    },

    // Infrastructure layer — Bind port to concrete implementation
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: CONCERT_OWNERSHIP_REPOSITORY,
      useClass: PrismaConcertOwnershipRepository,
    },
    {
      provide: CHECKIN_STAFF_ASSIGNMENT_REPOSITORY,
      useClass: PrismaCheckinStaffAssignmentRepository,
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
    AuthorizeAdminActionUseCase,
    AuthorizeConcertManagementUseCase,
    AuthorizeCheckinAssignmentUseCase,
    ManageCheckinStaffAssignmentsUseCase,
    CHECKIN_STAFF_ASSIGNMENT_REPOSITORY,
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
export { AuthorizeAdminActionUseCase } from './application/use-cases/authorize-admin-action.use-case';
export { AuthorizeConcertManagementUseCase } from './application/use-cases/authorize-concert-management.use-case';
export { AuthorizeCheckinAssignmentUseCase } from './application/use-cases/authorize-checkin-assignment.use-case';
export { ManageCheckinStaffAssignmentsUseCase } from './application/use-cases/manage-checkin-staff-assignments.use-case';
