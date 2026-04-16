import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import express from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { UserResponseDto } from './dto/auth.response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new driver account
   * Role is automatically assigned as DRIVER
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    const { user, token } = await this.authService.register(registerDto);
    return { user, message: 'Registration successful' };
  }

  /**
   * Login for existing users (both DRIVER and ADMIN)
   * Sets JWT token as HTTP-only cookie
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const { user, token } = await this.authService.login(loginDto);

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    // Set cookie with secure options
    response.cookie('access_token', token, {
      httpOnly: true,      // Prevents XSS attacks
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict',   // Prevents CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return { user };
  }

  /**
   * Logout user by clearing the access token cookie
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) response: express.Response) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
    });
    
    return { message: 'Logged out successfully' };
  }

  /**
   * Get current authenticated user's profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.authService.getProfile(user.id);
  }
}