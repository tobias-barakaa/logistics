import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../../database/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';


export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    example: 'Tobby',
    description: 'Name',
  })
  @IsString()
  name: string;


  @ApiProperty({
    example: 'test@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    minLength: 6,
    description: 'User password',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: '254724676742',
    minLength: 12,
    description: 'User PhoneNumber',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'Admin',
    minLength: 8,
    description: 'Admin',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
};

