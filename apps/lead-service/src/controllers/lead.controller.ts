import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LeadService } from '../services/lead.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadResponseDto,
  LeadStatus,
} from '@app/common/dto/lead.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Leads')
@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully', type: LeadResponseDto })
  async createLead(@Body() createLeadDto: CreateLeadDto): Promise<LeadResponseDto> {
    return this.leadService.createLead(createLeadDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all leads' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully', type: [LeadResponseDto] })
  async getAllLeads(): Promise<LeadResponseDto[]> {
    return this.leadService.getAllLeads();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully', type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async getLeadById(@Param('id') id: string): Promise<LeadResponseDto> {
    return this.leadService.getLeadById(id);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get leads by user ID' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully', type: [LeadResponseDto] })
  async getLeadsByUserId(@Param('userId') userId: string): Promise<LeadResponseDto[]> {
    return this.leadService.getLeadsByUserId(userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lead' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully', type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async updateLead(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
  ): Promise<LeadResponseDto> {
    return this.leadService.updateLead(id, updateLeadDto);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign lead to user' })
  @ApiResponse({ status: 200, description: 'Lead assigned successfully', type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead or user not found' })
  async assignLead(
    @Param('id') leadId: string,
    @Body() body: { assignedUserId: string },
  ): Promise<LeadResponseDto> {
    return this.leadService.assignLead(leadId, body.assignedUserId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lead status' })
  @ApiResponse({ status: 200, description: 'Lead status updated successfully', type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async updateLeadStatus(
    @Param('id') leadId: string,
    @Body() body: { status: LeadStatus },
  ): Promise<LeadResponseDto> {
    return this.leadService.updateLeadStatus(leadId, body.status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete lead' })
  @ApiResponse({ status: 204, description: 'Lead deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async deleteLead(@Param('id') id: string): Promise<void> {
    return this.leadService.deleteLead(id);
  }
} 