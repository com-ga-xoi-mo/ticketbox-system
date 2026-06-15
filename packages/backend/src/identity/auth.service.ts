import {
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../platform/database/prisma.service';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import type { JwtPayload } from './domain/jwt-payload.interface';
import { Role } from './domain/role.enum';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

export interface AuthTokenResponse {
  accessToken: string;
}

// Prisma error code for unique constraint violation
const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

@Injectable()
export class AuthService implements OnModuleInit {
  /** Cached at startup — AUDIENCE role ID never changes after seed */
  private audienceRoleId!: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: PlatformConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { code: 'AUDIENCE' } });
    if (!role) {
      throw new Error('AUDIENCE role not found in database. Run seed first.');
    }
    this.audienceRoleId = role.id;
  }

  async register(dto: RegisterDto): Promise<AuthTokenResponse> {
    const passwordHash = await bcrypt.hash(dto.password, this.config.bcryptRounds);

    let userId: string;
    let userRoles: Array<{ role: { code: string } }>;

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          roles: {
            create: { roleId: this.audienceRoleId },
          },
        },
        include: {
          roles: { include: { role: true } },
        },
      });
      userId = user.id;
      userRoles = user.roles as Array<{ role: { code: string } }>;
    } catch (err: unknown) {
      // Catch both concurrent-registration and simple duplicate email
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === PRISMA_UNIQUE_CONSTRAINT
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }

    const roles = userRoles.map((ur) => ur.role.code as Role);
    return { accessToken: this.generateToken(userId, roles) };
  }

  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: { include: { role: true } },
      },
    });

    const isValidPassword =
      user !== null && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = (user!.roles as Array<{ role: { code: string } }>).map(
      (ur) => ur.role.code as Role,
    );
    return { accessToken: this.generateToken(user!.id, roles) };
  }

  private generateToken(userId: string, roles: Role[]): string {
    const payload: JwtPayload = { sub: userId, roles };
    return this.jwtService.sign(payload);
  }
}
