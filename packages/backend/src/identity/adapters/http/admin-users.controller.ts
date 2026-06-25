import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../domain/authenticated-user.interface';
import {
  EmailAlreadyRegisteredError,
  ForbiddenAdminActionError,
  UserNotFoundError,
} from '../../domain/errors';
import { Role } from '../../domain/role.enum';
import { JwtAuthGuard } from '../../infrastructure/passport/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import {
  CreateUserAccountUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  SetUserStatusUseCase,
  UpdateUserAccountUseCase,
} from '../../application/use-cases/admin-account-management.use-cases';
import { CreateAdminUserDto, ListUsersQueryDto, SetUserStatusDto, UpdateAdminUserDto } from './dto/admin-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(
    private readonly createUseCase: CreateUserAccountUseCase,
    private readonly listUseCase: ListUsersUseCase,
    private readonly getUseCase: GetUserUseCase,
    private readonly updateUseCase: UpdateUserAccountUseCase,
    private readonly setStatusUseCase: SetUserStatusUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateAdminUserDto, @Request() req: { user: AuthenticatedUser }) {
    return this.handleErrors(() =>
      this.createUseCase.execute({ actor: { userId: req.user.id, roles: req.user.roles } }, dto),
    );
  }

  @Get()
  async list(@Query() query: ListUsersQueryDto, @Request() req: { user: AuthenticatedUser }) {
    return this.handleErrors(() =>
      this.listUseCase.execute({ actor: { userId: req.user.id, roles: req.user.roles } }, query),
    );
  }

  @Get(':id')
  async get(@Param('id') id: string, @Request() req: { user: AuthenticatedUser }) {
    return this.handleErrors(() =>
      this.getUseCase.execute({ actor: { userId: req.user.id, roles: req.user.roles } }, id),
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto, @Request() req: { user: AuthenticatedUser }) {
    return this.handleErrors(() =>
      this.updateUseCase.execute({ actor: { userId: req.user.id, roles: req.user.roles } }, id, dto),
    );
  }

  @Patch(':id/status')
  async setStatus(@Param('id') id: string, @Body() dto: SetUserStatusDto, @Request() req: { user: AuthenticatedUser }) {
    return this.handleErrors(() =>
      this.setStatusUseCase.execute({ actor: { userId: req.user.id, roles: req.user.roles } }, id, dto.status),
    );
  }

  private async handleErrors<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (err: unknown) {
      if (err instanceof ForbiddenAdminActionError) {
        throw new ForbiddenException(err.message);
      }
      if (err instanceof UserNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof EmailAlreadyRegisteredError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
