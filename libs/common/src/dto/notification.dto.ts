import { IsString, IsOptional, IsEnum, IsUUID, IsObject } from 'class-validator';
import { BaseDto } from './base.dto';

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export class CreateNotificationDto extends BaseDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsUUID()
  recipientId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  templateId?: string;
}

export class NotificationResponseDto extends BaseDto {
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  templateId?: string;
  sentAt?: string;
  errorMessage?: string;
} 