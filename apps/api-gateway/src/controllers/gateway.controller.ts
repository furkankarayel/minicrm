import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  All,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GatewayService } from '../services/gateway.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('API Gateway')
@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @All('users/*')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Route user service requests' })
  async routeUserService(@Request() req, @Body() body?: any): Promise<any> {
    return this.gatewayService.routeToUserService(req.method, req.url.replace('/users', ''), body, req.headers);
  }

  @All('leads/*')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Route lead service requests' })
  async routeLeadService(@Request() req, @Body() body?: any): Promise<any> {
    return this.gatewayService.routeToLeadService(req.method, req.url.replace('/leads', ''), body);
  }

  @Post('auth/register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 200, description: 'Registration successful' })
  async register(@Body() registerDto: any): Promise<any> {
    return this.gatewayService.routeToUserService('POST', '/auth/register', registerDto);
  }

  @Post('auth/login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() loginDto: any): Promise<any> {
    return this.gatewayService.routeToUserService('POST', '/auth/login', loginDto);
  }

  @Post('auth/refresh')
  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refreshToken(@Body() body: any): Promise<any> {
    return this.gatewayService.routeToUserService('POST', '/auth/refresh', body);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for all services' })
  @ApiResponse({ status: 200, description: 'All services are healthy' })
  async healthCheck(): Promise<any> {
    return this.gatewayService.checkAllServicesHealth();
  }

  @Get('admin/test')
  @ApiOperation({ summary: 'Gateway health check endpoint' })
  @ApiResponse({ status: 200, description: 'Gateway is healthy' })
  async gatewayHealthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'API Gateway is running',
      timestamp: new Date().toISOString(),
    };
  }
} 