import { IsEmail, IsString, IsOptional, MinLength, IsEnum } from 'class-validator';
import { BaseDto } from './base.dto';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES_REP = 'sales_rep',
}

export class CreateUserDto extends BaseDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.SALES_REP;
}

export class UpdateUserDto extends BaseDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UserResponseDto extends BaseDto {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class AuthResponseDto {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
} 