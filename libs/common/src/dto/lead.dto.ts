import { IsString, IsOptional, IsEmail, IsPhoneNumber, IsEnum, IsUUID } from 'class-validator';
import { BaseDto } from './base.dto';

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  EMAIL_CAMPAIGN = 'email_campaign',
  PHONE_CALL = 'phone_call',
  OTHER = 'other',
}

export class CreateLeadDto extends BaseDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource = LeadSource.OTHER;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}

export class UpdateLeadDto extends BaseDto {
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
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}

export class LeadResponseDto extends BaseDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  notes?: string;
  status: LeadStatus;
  source: LeadSource;
  assignedUserId?: string;
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
} 