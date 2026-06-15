import {
  ConflictException,
  Injectable,
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: PlatformConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokenResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.config.bcryptRounds);

    // Ensure AUDIENCE role row exists (seeded), then create user
    const audienceRole = await this.prisma.role.findUnique({
      where: { code: 'AUDIENCE' },
    });

    if (!audienceRole) {
      throw new Error('AUDIENCE role not found in database. Run seed first.');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        roles: {
          create: {
            roleId: audienceRole.id,
          },
        },
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    const roles = user.roles.map((ur) => ur.role.code as Role);
    return { accessToken: this.generateToken(user.id, roles) };
  }

  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    const isValidPassword =
      user !== null && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.roles.map((ur) => ur.role.code as Role);
    return { accessToken: this.generateToken(user.id, roles) };
  }

  private generateToken(userId: string, roles: Role[]): string {
    const payload: JwtPayload = { sub: userId, roles };
    return this.jwtService.sign(payload);
  }
}
