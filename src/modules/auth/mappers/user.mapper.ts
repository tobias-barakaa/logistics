import { User } from '../../../database/entities/user.entity';
import { UserResponseDto } from '../dto/auth.response.dto';

export class UserMapper {
  static toResponseDto(user: User): UserResponseDto {
    const response = new UserResponseDto(user);
    // Ensure password is never included
    delete (response as any).password;
    return response;
  }

  static toResponseDtoArray(users: User[]): UserResponseDto[] {
    return users.map(user => this.toResponseDto(user));
  }
}