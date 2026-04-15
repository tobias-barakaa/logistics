import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../../database/entities/user.entity';
import { StringValue } from 'ms';


@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // useFactory: (config: ConfigService) => ({
      //   secret: config.get<string>('JWT_SECRET'),
      //   signOptions: {
      //     expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d'),
      //   },
      // }),

      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '7d') as StringValue,
        },
      })
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // Export so other modules can use JwtAuthGuard and inject AuthService
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}