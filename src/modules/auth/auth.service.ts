import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    ForbiddenException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { JwtService } from '@nestjs/jwt';
  import * as bcrypt from 'bcryptjs';
  import { User, UserRole } from '../../database/entities/user.entity';
  import { LoginDto, RegisterDto } from './dto/auth.dto';
  
  @Injectable()
  export class AuthService {
    constructor(
      @InjectRepository(User)
      private readonly userRepository: Repository<User>,
      private readonly jwtService: JwtService,
    ) {}
  
    async register(dto: RegisterDto, requestingUser?: User) {
      // Only admins can create other admin accounts
      if (dto.role === UserRole.ADMIN) {
        if (!requestingUser || requestingUser.role !== UserRole.ADMIN) {
          throw new ForbiddenException('Only admins can create admin accounts');
        }
      }
  
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException('Email is already registered');
  
      const hashed = await bcrypt.hash(dto.password, 10);
      const user = this.userRepository.create({ ...dto, password: hashed });
      const saved = await this.userRepository.save(user);
  
      const { password, ...safeUser } = saved;
      return { user: safeUser, token: this.signToken(saved) };
    }
  
    async login(dto: LoginDto) {
      const user = await this.userRepository.findOne({
        where: { email: dto.email, isActive: true },
      });
  
      if (!user || !(await bcrypt.compare(dto.password, user.password))) {
        throw new UnauthorizedException('Invalid email or password');
      }
  
      const { password, ...safeUser } = user;
      return { user: safeUser, token: this.signToken(user) };
    }
  
    async getProfile(id: string): Promise<Omit<User, 'password'>> {
      const user = await this.userRepository.findOneOrFail({ where: { id } });
      const { password, ...safeUser } = user;
      return safeUser;
    }
  
    private signToken(user: User): string {
      return this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
    }
  }