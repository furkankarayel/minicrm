import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class BaseDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}

export class PaginationDto {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}

export class ApiResponseDto<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;

  constructor(success: boolean, data?: T, message?: string, error?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
} 