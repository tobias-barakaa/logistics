import {
    Controller,
    Post,
    Get,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
  } from '@nestjs/common';
  import { AuthService } from './auth.service';
  import { User } from '../../database/entities/user.entity';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from 'src/common/guards';
  
  @Controller('auth')
  export class AuthController {
    constructor(private readonly authService: AuthService) {}
  
    // POST /api/v1/auth/register
    // Public — but creating admin roles requires the caller to be an admin
    @Post('register')
    register(@Body() dto: RegisterDto, @CurrentUser() requestingUser?: User) {
      return this.authService.register(dto, requestingUser);
    }
  
    // POST /api/v1/auth/login
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() dto: LoginDto) {
      return this.authService.login(dto);
    }
  
    // GET /api/v1/auth/me
    @Get('me')
    @UseGuards(JwtAuthGuard)
    getProfile(@CurrentUser() user: User) {
      return this.authService.getProfile(user.id);
    }
  }