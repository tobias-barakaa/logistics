import {
  Injectable,
  UnauthorizedException,
  ConflictException,
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

  // Public registration — creates DRIVER accounts only.
  // Admin accounts are created exclusively via: npm run seed:admin
  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email is already registered');

    const hashed = await bcrypt.hash(dto.password, 10);

    // Force role to DRIVER regardless of what was sent in the body.
    // No API caller can ever self-promote to admin.
    const user = this.userRepository.create({
      ...dto,
      password: hashed,
      role: UserRole.DRIVER,
    });
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