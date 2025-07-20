import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationStatus, NotificationType } from '@app/common/dto/notification.dto';
import { EmailService } from './email.service';
import { UserCreatedEventDto } from '../dto/user-created.dto';
import { StructuredLogger } from '@app/common/logging';

@Injectable()
export class NotificationService {
  private readonly logger = new StructuredLogger('NotificationService');

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Processes user creation events and sends welcome notifications
   * This contains the actual business logic for handling user creation
   * as described in the notepad - validating data and triggering notifications
   */
  async processUserCreatedEvent(event: UserCreatedEventDto): Promise<void> {
    this.logger.log('Processing user creation event', {
      userId: event.userId,
      email: event.email,
    });

    try {
      // Validate that the data is complete and correctly formatted
      this.validateUserCreatedEvent(event);

      // Send welcome email to new user
      await this.sendWelcomeEmail(event);

      // Store notification record for auditing
      await this.createNotificationRecord({
        type: NotificationType.EMAIL,
        title: 'Welcome to MiniCRM!',
        message: `Welcome ${event.firstName}! Your account has been created with role: ${event.role}`,
        recipientId: event.userId,
        status: NotificationStatus.SENT,
      });

      this.logger.log('Successfully processed user creation event', {
        userId: event.userId,
        email: event.email,
      });
    } catch (error) {
      this.logger.error('Failed to process user creation event', error.stack, {
        userId: event.userId,
        email: event.email,
        error: error.message,
      });
      
      // Store failed notification record
      await this.createNotificationRecord({
        type: NotificationType.EMAIL,
        title: 'Welcome to MiniCRM!',
        message: `Welcome ${event.firstName}! Your account has been created with role: ${event.role}`,
        recipientId: event.userId,
        status: NotificationStatus.FAILED,
        errorMessage: error.message,
      });

      // Re-throw the error for proper error handling
      throw error;
    }
  }

  /**
   * Validates that the user creation event data is complete and correctly formatted
   * This ensures data integrity before processing
   */
  private validateUserCreatedEvent(event: UserCreatedEventDto): void {
    if (!event.userId || !event.email || !event.firstName || !event.lastName || !event.role) {
      throw new Error('User creation event missing required fields');
    }

    if (!this.isValidEmail(event.email)) {
      throw new Error(`Invalid email format: ${event.email}`);
    }

    this.logger.debug('User creation event validation passed', {
      userId: event.userId,
      email: event.email,
    });
  }

  /**
   * Sends a welcome email to the newly created user
   * This is the main notification action for user creation events
   */
  private async sendWelcomeEmail(event: UserCreatedEventDto): Promise<void> {
    await this.emailService.sendWelcomeEmail(
      event.email,
      event.firstName,
      event.role
    );
    
    this.logger.log('Welcome email sent successfully', {
      userId: event.userId,
      email: event.email,
    });
  }

  /**
   * Creates a notification record in the database for auditing purposes
   * This helps track notification history and status
   */
  private async createNotificationRecord(data: {
    type: NotificationType;
    title: string;
    message: string;
    recipientId: string;
    status: NotificationStatus;
    errorMessage?: string;
  }): Promise<void> {
    const notification = this.notificationRepository.create({
      type: data.type,
      title: data.title,
      message: data.message,
      recipientId: data.recipientId,
      status: data.status,
      errorMessage: data.errorMessage,
    });

    await this.notificationRepository.save(notification);
    this.logger.debug('Notification record created', {
      recipientId: data.recipientId,
      status: data.status,
      type: data.type,
    });
  }

  /**
   * Simple email validation helper
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
} 