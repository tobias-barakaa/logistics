import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../database/entities/user.entity';
import { UserMapper } from './mappers/user.mapper';
import { UserResponseDto } from './dto/auth.response.dto';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new driver account
   * Role is automatically set to DRIVER - no role field accepted in request
   */
  async register(registerDto: RegisterDto): Promise<{ user: UserResponseDto; token: string }> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user with EXPLICIT field mapping (never use spread on DTO!)
    const user = this.userRepository.create({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      role: UserRole.DRIVER, 
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);
    
    // Generate token
    const token = this.signToken(savedUser);
    
    // Return safe user object without password
    return {
      user: UserMapper.toResponseDto(savedUser),
      token,
    };
  }

  /**
   * Login for all user types (DRIVER, ADMIN, etc.)
   */
  async login(loginDto: LoginDto): Promise<{ user: UserResponseDto; token: string }> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.signToken(user);
    
    return {
      user: UserMapper.toResponseDto(user),
      token,
    };
  }

  /**
   * Get user profile by ID (excluding password)
   */
  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return UserMapper.toResponseDto(user);
  }

  /**
   * Generate JWT token for authenticated user
   */
  private signToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    
    return this.jwtService.sign(payload);
  }
}