import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { EmailAlreadyRegisteredError, InvalidCredentialsError } from '../../domain/errors';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * HTTP adapter for authentication endpoints.
 *
 * Responsibilities:
 *  - Parse and validate HTTP request bodies (via class-validator DTOs).
 *  - Delegate business logic to application use-cases.
 *  - Map use-case results back to HTTP responses.
 *
 * This class has no business logic. It is a thin translation layer between
 * HTTP and the application layer.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.registerUseCase.execute(dto);
    } catch (err) {
      if (err instanceof EmailAlreadyRegisteredError) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    try {
      return await this.loginUseCase.execute(dto);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw err;
    }
  }
}
