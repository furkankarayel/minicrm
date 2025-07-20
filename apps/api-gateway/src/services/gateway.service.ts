import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserSdkService } from '@app/sdk/user-sdk.service';
import { LeadSdkService } from '@app/sdk/lead-sdk.service';
import { StructuredLogger } from '@app/common/logging';

@Injectable()
export class GatewayService {
  private userSdkService: UserSdkService;
  private leadSdkService: LeadSdkService;
  private readonly logger = new StructuredLogger('GatewayService');

  constructor(private readonly configService: ConfigService) {
    const userServiceUrl = this.configService.get('USER_SERVICE_URL');
    if (!userServiceUrl) {
      throw new Error('USER_SERVICE_URL is not defined');
    }
    this.userSdkService = new UserSdkService(userServiceUrl);

    const leadServiceUrl = this.configService.get('LEAD_SERVICE_URL'); 
    if (!leadServiceUrl) {
      throw new Error('LEAD_SERVICE_URL is not defined');
    }
    this.leadSdkService = new LeadSdkService(leadServiceUrl);
  }

  async routeToUserService(method: string, path: string, body?: any, headers?: any): Promise<any> {
    try {
      this.logger.log('Routing to user service', {
        method,
        path,
        hasBody: !!body,
        hasAuthHeader: !!headers?.authorization,
      });

      const authHeader = headers?.authorization;
      const config = authHeader ? { headers: { Authorization: authHeader } } : undefined;
      
      switch (method) {
        case 'GET':
          if (path === '/auth/validate') {
            // Handle token validation
            return { message: 'Token is valid' };
          }
          if (path.startsWith('/email/')) {
            const email = path.replace('/email/', '');
            return this.userSdkService.getUserByEmail(email, config);
          }
          if (path === '/') {
            return this.userSdkService.getAllUsers(config);
          }
          const userId = path.replace('/', '');
          return this.userSdkService.getUserById(userId, config);

        case 'POST':
          if (path === '/auth/login') {
            return this.userSdkService.login(body);
          }
          if (path === '/auth/refresh') {
            return this.userSdkService.refreshToken(body.refreshToken);
          }
          return this.userSdkService.createUser(body);

        case 'PATCH':
          const updateUserId = path.replace('/', '');
          return this.userSdkService.updateUser(updateUserId, body);

        case 'DELETE':
          const deleteUserId = path.replace('/', '');
          return this.userSdkService.deleteUser(deleteUserId);

        default:
          throw new HttpException('Method not allowed', HttpStatus.METHOD_NOT_ALLOWED);
      }
    } catch (error) {
      this.logger.error('User service routing error', error.stack, {
        method,
        path,
        error: error.message,
      });
      throw new HttpException(
        error.message || 'User service error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async routeToLeadService(method: string, path: string, body?: any): Promise<any> {
    try {
      this.logger.log('Routing to lead service', {
        method,
        path,
        hasBody: !!body,
      });

      switch (method) {
        case 'GET':
          if (path.startsWith('/user/')) {
            const userId = path.replace('/user/', '');
            return this.leadSdkService.getLeadsByUserId(userId);
          }
          if (path === '/') {
            return this.leadSdkService.getAllLeads();
          }
          const leadId = path.replace('/', '');
          return this.leadSdkService.getLeadById(leadId);

        case 'POST':
          return this.leadSdkService.createLead(body);

        case 'PATCH':
          if (path.includes('/assign')) {
            const assignLeadId = path.replace('/assign', '').replace('/', '');
            return this.leadSdkService.assignLead(assignLeadId, body.assignedUserId);
          }
          if (path.includes('/status')) {
            const statusLeadId = path.replace('/status', '').replace('/', '');
            return this.leadSdkService.updateLeadStatus(statusLeadId, body.status);
          }
          const updateLeadId = path.replace('/', '');
          return this.leadSdkService.updateLead(updateLeadId, body);

        case 'DELETE':
          const deleteLeadId = path.replace('/', '');
          return this.leadSdkService.deleteLead(deleteLeadId);

        default:
          throw new HttpException('Method not allowed', HttpStatus.METHOD_NOT_ALLOWED);
      }
    } catch (error) {
      this.logger.error('Lead service routing error', error.stack, {
        method,
        path,
        error: error.message,
      });
      throw new HttpException(
        error.message || 'Lead service error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async checkAllServicesHealth(): Promise<any> {
    this.logger.log('Checking all services health');
    
    const healthChecks: any = {
      gateway: { status: 'healthy', timestamp: new Date().toISOString() },
      userService: null,
      leadService: null,
      notificationService: { status: 'kafka-consumer', timestamp: new Date().toISOString() },
    };

    try {
      // Check user service health
      const userResponse = await fetch(`${this.configService.get('USER_SERVICE_URL')}/users/health`);
      healthChecks.userService = {
        status: userResponse.ok ? 'healthy' : 'unhealthy',
        error: userResponse.statusText,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      healthChecks.userService = {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Check lead service health
      const leadResponse = await fetch(`${this.configService.get('LEAD_SERVICE_URL')}/leads/health`);
      healthChecks.leadService = {
        status: leadResponse.ok ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      healthChecks.leadService = {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }

    this.logger.log('Health check completed', {
      userService: healthChecks.userService?.status,
      leadService: healthChecks.leadService?.status,
    });

    return healthChecks;
  }
} 