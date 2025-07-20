import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { Notification } from '../entities/notification.entity';
import { UserCreatedEventDto } from '../dto/user-created.dto';
import { NotificationStatus, NotificationType } from '@app/common/dto/notification.dto';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailService: EmailService;
  let notificationRepository: Repository<Notification>;

  const mockEmailService = {
    sendWelcomeEmail: jest.fn(),
  };

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailService = module.get<EmailService>(EmailService);
    notificationRepository = module.get<Repository<Notification>>(getRepositoryToken(Notification));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processUserCreatedEvent', () => {
    const validEvent: UserCreatedEventDto = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
      timestamp: '2023-01-01T00:00:00Z',
    };

    it('should process a valid user creation event successfully', async () => {
      // Arrange
      const mockNotification = {
        id: '1',
        type: NotificationType.EMAIL,
        title: 'Welcome to MiniCRM!',
        message: 'Welcome John! Your account has been created with role: user',
        recipientId: validEvent.userId,
        status: NotificationStatus.SENT,
      };

      mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);
      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      // Act
      await service.processUserCreatedEvent(validEvent);

      // Assert
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        validEvent.email,
        validEvent.firstName,
        validEvent.role
      );
      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        type: NotificationType.EMAIL,
        title: 'Welcome to MiniCRM!',
        message: 'Welcome John! Your account has been created with role: user',
        recipientId: validEvent.userId,
        status: NotificationStatus.SENT,
      });
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(mockNotification);
    });

    it('should throw an error for invalid email format', async () => {
      // Arrange
      const invalidEvent = { ...validEvent, email: 'invalid-email' };

      // Act & Assert
      await expect(service.processUserCreatedEvent(invalidEvent)).rejects.toThrow(
        'Invalid email format: invalid-email'
      );
    });

    it('should throw an error for missing required fields', async () => {
      // Arrange
      const invalidEvent = { ...validEvent, email: '' };

      // Act & Assert
      await expect(service.processUserCreatedEvent(invalidEvent)).rejects.toThrow(
        'User creation event missing required fields'
      );
    });

    it('should handle email service failure and create failed notification record', async () => {
      // Arrange
      const emailError = new Error('Email service unavailable');
      const mockFailedNotification = {
        id: '1',
        type: NotificationType.EMAIL,
        title: 'Welcome to MiniCRM!',
        message: 'Welcome John! Your account has been created with role: user',
        recipientId: validEvent.userId,
        status: NotificationStatus.FAILED,
        errorMessage: emailError.message,
      };

      mockEmailService.sendWelcomeEmail.mockRejectedValue(emailError);
      mockNotificationRepository.create.mockReturnValue(mockFailedNotification);
      mockNotificationRepository.save.mockResolvedValue(mockFailedNotification);

      // Act & Assert
      await expect(service.processUserCreatedEvent(validEvent)).rejects.toThrow(emailError);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        type: NotificationType.EMAIL,
        title: 'Welcome to MiniCRM!',
        message: 'Welcome John! Your account has been created with role: user',
        recipientId: validEvent.userId,
        status: NotificationStatus.FAILED,
        errorMessage: emailError.message,
      });
    });
  });
}); 