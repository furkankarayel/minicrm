import { Injectable } from '@nestjs/common';
import { HttpClient } from './http-client';
import { LeadResponseDto, CreateLeadDto, UpdateLeadDto } from '@app/common/dto/lead.dto';

@Injectable()
export class LeadSdkService {
  private httpClient: HttpClient;

  constructor(baseURL: string) {
    this.httpClient = new HttpClient({ baseURL });
  }

  async createLead(createLeadDto: CreateLeadDto): Promise<LeadResponseDto> {
    return this.httpClient.post<LeadResponseDto>('/leads', createLeadDto);
  }

  async getLeadById(id: string): Promise<LeadResponseDto> {
    return this.httpClient.get<LeadResponseDto>(`/leads/${id}`);
  }

  async updateLead(id: string, updateLeadDto: UpdateLeadDto): Promise<LeadResponseDto> {
    return this.httpClient.patch<LeadResponseDto>(`/leads/${id}`, updateLeadDto);
  }

  async deleteLead(id: string): Promise<void> {
    return this.httpClient.delete<void>(`/leads/${id}`);
  }

  async getAllLeads(): Promise<LeadResponseDto[]> {
    return this.httpClient.get<LeadResponseDto[]>('/leads');
  }

  async getLeadsByUserId(userId: string): Promise<LeadResponseDto[]> {
    return this.httpClient.get<LeadResponseDto[]>(`/leads/user/${userId}`);
  }

  async assignLead(leadId: string, userId: string): Promise<LeadResponseDto> {
    return this.httpClient.patch<LeadResponseDto>(`/leads/${leadId}/assign`, { assignedUserId: userId });
  }

  async updateLeadStatus(leadId: string, status: string): Promise<LeadResponseDto> {
    return this.httpClient.patch<LeadResponseDto>(`/leads/${leadId}/status`, { status });
  }
} 