import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from '../services/notification.service';
import { UserCreatedEventDto } from '../dto/user-created.dto';
import { KAFKA_TOPICS } from '../../../../kafka/kafka-config';
import { StructuredLogger } from '@app/common/logging';

@Controller()
export class NotificationController {
  private readonly logger = new StructuredLogger('NotificationController');

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Listens for user creation events from Kafka
   * This controller only handles message routing and passes data to the service
   * It does not contain business logic, following the notepad description
   */
  @MessagePattern(KAFKA_TOPICS.USER.CREATED)
  async handleUserCreated(@Payload() event: UserCreatedEventDto): Promise<void> {
    this.logger.logEvent('user.created', event);
    this.logger.log('Received user.created event', {
      userId: event.userId,
      email: event.email,
    });
    
    // Pass the event data to the service for processing
    // The controller only handles message routing, not business logic
    await this.notificationService.processUserCreatedEvent(event);
  }
} 