import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { Lead } from '../entities/lead.entity';
import { CreateLeadDto, UpdateLeadDto, LeadResponseDto, LeadStatus } from '@app/common/dto/lead.dto';
import { UserResponseDto } from '@app/common/dto/user.dto';
import { KAFKA_TOPICS, LeadCreatedEvent, LeadUpdatedEvent, LeadAssignedEvent, LeadStatusChangedEvent, LeadDeletedEvent } from '../../../../kafka/kafka-config'
import { UserSdkService } from '@app/sdk/user-sdk.service';
import { StructuredLogger } from '@app/common/logging';

@Injectable()
export class LeadService {
  private readonly logger = new StructuredLogger('LeadService');

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientProxy,
    private readonly userSdkService: UserSdkService,
  ) {}

  async createLead(createLeadDto: CreateLeadDto): Promise<LeadResponseDto> {
    this.logger.log('Creating new lead', {
      email: createLeadDto.email,
      firstName: createLeadDto.firstName,
      lastName: createLeadDto.lastName,
      assignedUserId: createLeadDto.assignedUserId,
    });

    const lead = this.leadRepository.create(createLeadDto);
    const savedLead = await this.leadRepository.save(lead);

    // Publish lead created event
    const event: LeadCreatedEvent = {
      leadId: savedLead.id,
      firstName: savedLead.firstName,
      lastName: savedLead.lastName,
      email: savedLead.email,
      assignedUserId: savedLead.assignedUserId,
      source: savedLead.source,
      timestamp: new Date().toISOString(),
    };

    this.logger.logEvent('lead.created', event);
    this.kafkaClient.emit(KAFKA_TOPICS.LEAD.CREATED, event);

    this.logger.log('Lead created successfully', {
      leadId: savedLead.id,
      email: savedLead.email,
    });

    return this.mapToResponseDto(savedLead);
  }

  async getLeadById(id: string): Promise<LeadResponseDto> {
    this.logger.log('Getting lead by ID', { leadId: id });

    const lead = await this.leadRepository.findOne({ where: { id } });
    if (!lead) {
      this.logger.warn('Lead not found', { leadId: id });
      throw new NotFoundException('Lead not found');
    }

    return this.mapToResponseDto(lead);
  }

  async updateLead(id: string, updateLeadDto: UpdateLeadDto): Promise<LeadResponseDto> {
    this.logger.log('Updating lead', { leadId: id, fields: Object.keys(updateLeadDto) });

    const lead = await this.leadRepository.findOne({ where: { id } });
    if (!lead) {
      this.logger.warn('Lead not found for update', { leadId: id });
      throw new NotFoundException('Lead not found');
    }

    const previousStatus = lead.status;
    const previousUserId = lead.assignedUserId;

    Object.assign(lead, updateLeadDto);
    const updatedLead = await this.leadRepository.save(lead);

    // Publish lead updated event
    const event: LeadUpdatedEvent = {
      leadId: updatedLead.id,
      firstName: updateLeadDto.firstName,
      lastName: updateLeadDto.lastName,
      email: updateLeadDto.email,
      status: updateLeadDto.status,
      timestamp: new Date().toISOString(),
    };

    this.logger.logEvent('lead.updated', event);
    this.kafkaClient.emit(KAFKA_TOPICS.LEAD.UPDATED, event);

    // Publish status changed event if status was updated
    if (updateLeadDto.status && updateLeadDto.status !== previousStatus) {
      const statusEvent: LeadStatusChangedEvent = {
        leadId: updatedLead.id,
        previousStatus,
        newStatus: updateLeadDto.status,
        userId: 'system', // This should be the user who made the change
        timestamp: new Date().toISOString(),
      };

      this.logger.logEvent('lead.status_changed', statusEvent);
      this.kafkaClient.emit(KAFKA_TOPICS.LEAD.STATUS_CHANGED, statusEvent);
    }

    // Publish assigned event if assigned user was changed
    if (updateLeadDto.assignedUserId && updateLeadDto.assignedUserId !== previousUserId) {
      const assignedEvent: LeadAssignedEvent = {
        leadId: updatedLead.id,
        previousUserId,
        newUserId: updateLeadDto.assignedUserId,
        timestamp: new Date().toISOString(),
      };

      this.logger.logEvent('lead.assigned', assignedEvent);
      this.kafkaClient.emit(KAFKA_TOPICS.LEAD.ASSIGNED, assignedEvent);
    }

    this.logger.log('Lead updated successfully', { leadId: id });
    return this.mapToResponseDto(updatedLead);
  }

  async deleteLead(id: string): Promise<void> {
    this.logger.log('Deleting lead', { leadId: id });

    const lead = await this.leadRepository.findOne({ where: { id } });
    if (!lead) {
      this.logger.warn('Lead not found for deletion', { leadId: id });
      throw new NotFoundException('Lead not found');
    }

    await this.leadRepository.remove(lead);

    // Publish lead deleted event
    const event: LeadDeletedEvent = {
      leadId: id,
      timestamp: new Date().toISOString(),
    };

    this.logger.logEvent('lead.deleted', event);
    this.kafkaClient.emit(KAFKA_TOPICS.LEAD.DELETED, event);

    this.logger.log('Lead deleted successfully', { leadId: id });
  }

  async getAllLeads(): Promise<LeadResponseDto[]> {
    this.logger.log('Getting all leads');
    
    const leads = await this.leadRepository.find();
    this.logger.log('Retrieved all leads', { count: leads.length });
    
    return Promise.all(leads.map(lead => this.mapToResponseDto(lead)));
  }

  async getLeadsByUserId(userId: string): Promise<LeadResponseDto[]> {
    this.logger.log('Getting leads by user ID', { userId });
    
    const leads = await this.leadRepository.find({
      where: { assignedUserId: userId },
    });
    
    this.logger.log('Retrieved leads for user', { userId, count: leads.length });
    return Promise.all(leads.map(lead => this.mapToResponseDto(lead)));
  }

  async assignLead(leadId: string, userId: string): Promise<LeadResponseDto> {
    this.logger.log('Assigning lead to user', { leadId, userId });

    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      this.logger.warn('Lead not found for assignment', { leadId });
      throw new NotFoundException('Lead not found');
    }

    // Verify user exists
    try {
      const startTime = Date.now();
      await this.userSdkService.getUserById(userId);
      const duration = Date.now() - startTime;
      
      this.logger.logServiceCall('UserService', 'getUserById', duration);
    } catch (error) {
      this.logger.error('User not found for lead assignment', error.stack, {
        leadId,
        userId,
        error: error.message,
      });
      throw new NotFoundException('User not found');
    }

    const previousUserId = lead.assignedUserId;
    lead.assignedUserId = userId;
    const updatedLead = await this.leadRepository.save(lead);

    // Publish lead assigned event
    const event: LeadAssignedEvent = {
      leadId: updatedLead.id,
      previousUserId,
      newUserId: userId,
      timestamp: new Date().toISOString(),
    };

    this.logger.logEvent('lead.assigned', event);
    this.kafkaClient.emit(KAFKA_TOPICS.LEAD.ASSIGNED, event);

    this.logger.log('Lead assigned successfully', { leadId, userId });
    return this.mapToResponseDto(updatedLead);
  }

  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<LeadResponseDto> {
    this.logger.log('Updating lead status', { leadId, status });

    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      this.logger.warn('Lead not found for status update', { leadId });
      throw new NotFoundException('Lead not found');
    }

    const previousStatus = lead.status;
    lead.status = status;
    const updatedLead = await this.leadRepository.save(lead);

    // Publish status changed event
    const event: LeadStatusChangedEvent = {
      leadId: updatedLead.id,
      previousStatus,
      newStatus: status,
      userId: 'system', // This should be the user who made the change
      timestamp: new Date().toISOString(),
    };

    this.logger.logEvent('lead.status_changed', event);
    this.kafkaClient.emit(KAFKA_TOPICS.LEAD.STATUS_CHANGED, event);

    this.logger.log('Lead status updated successfully', { leadId, previousStatus, newStatus: status });
    return this.mapToResponseDto(updatedLead);
  }

  private async mapToResponseDto(lead: Lead): Promise<LeadResponseDto> {
    let assignedUser: UserResponseDto | null = null;
    if (lead.assignedUserId) {
      try {
        const startTime = Date.now();
        assignedUser = await this.userSdkService.getUserById(lead.assignedUserId);
        const duration = Date.now() - startTime;
        
        this.logger.logServiceCall('UserService', 'getUserById', duration);
      } catch (error) {
        this.logger.warn('Failed to fetch assigned user for lead', {
          leadId: lead.id,
          assignedUserId: lead.assignedUserId,
          error: error.message,
        });
      }
    }

    return {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      position: lead.position,
      notes: lead.notes,
      status: lead.status,
      source: lead.source,
      assignedUserId: lead.assignedUserId,
      assignedUser: assignedUser && assignedUser.id ? {
        id: assignedUser.id,
        firstName: assignedUser.firstName,
        lastName: assignedUser.lastName,
        email: assignedUser.email,
      } : undefined,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }
} 