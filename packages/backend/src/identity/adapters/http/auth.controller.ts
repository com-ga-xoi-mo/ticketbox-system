import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { RateLimited } from '../../../platform/rate-limiting/rate-limit.decorator';
import { RateLimitPolicy } from '../../../platform/rate-limiting/rate-limit-policy';

import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { GoogleSignInUseCase } from '../../application/use-cases/google-sign-in.use-case';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import {
  AccountLinkRequiredError,
  EmailAlreadyRegisteredError,
  GoogleAccountNotEligibleError,
  InvalidCredentialsError,
  InvalidGoogleCredentialError,
  InvalidResetTokenError,
  ResetTokenAlreadyUsedError,
  ResetTokenExpiredError,
  UserNotFoundError,
} from '../../domain/errors';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { toLoginResponse } from './identity-contract.mapper';

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
    private readonly googleSignInUseCase: GoogleSignInUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
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
      return toLoginResponse(await this.loginUseCase.execute(dto));
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw err;
    }
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleLoginDto) {
    try {
      return toLoginResponse(await this.googleSignInUseCase.execute(dto.credential));
    } catch (err) {
      if (err instanceof AccountLinkRequiredError) {
        throw new ConflictException({
          code: 'ACCOUNT_LINK_REQUIRED',
          message: 'Email is already registered. Sign in with your password.',
        });
      }
      if (err instanceof InvalidGoogleCredentialError || err instanceof GoogleAccountNotEligibleError) {
        throw new UnauthorizedException('Google authentication failed');
      }
      throw err;
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @RateLimited(RateLimitPolicy.AUTH_PASSWORD_RESET)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      await this.forgotPasswordUseCase.execute(dto.email);
      return { message: 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.' };
    } catch (err) {
      if (err instanceof UserNotFoundError) {
        throw new BadRequestException('Email chưa được đăng ký trong hệ thống.');
      }
      throw err;
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      await this.resetPasswordUseCase.execute(dto.token, dto.newPassword);
      return { message: 'Password reset successfully.' };
    } catch (err) {
      if (err instanceof ResetTokenExpiredError) {
        throw new BadRequestException({ code: 'TOKEN_EXPIRED', message: err.message });
      }
      if (err instanceof ResetTokenAlreadyUsedError) {
        throw new BadRequestException({ code: 'TOKEN_ALREADY_USED', message: err.message });
      }
      if (err instanceof InvalidResetTokenError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
