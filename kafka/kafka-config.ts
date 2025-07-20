import { KafkaOptions, Transport } from '@nestjs/microservices';

export const KAFKA_CONFIG: KafkaOptions = {
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: 'crm-service',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    },
    consumer: {
      groupId: 'crm-consumer-group',
    },
  },
};

// Kafka Topics
export const KAFKA_TOPICS = {
  USER: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DELETED: 'user.deleted',
  },
  LEAD: {
    CREATED: 'lead.created',
    UPDATED: 'lead.updated',
    ASSIGNED: 'lead.assigned',
    STATUS_CHANGED: 'lead.status_changed',
    DELETED: 'lead.deleted',
  },
  NOTIFICATION: {
    SENT: 'notification.sent',
    FAILED: 'notification.failed',
  },
} as const;

// Event Interfaces
export interface UserCreatedEvent {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  timestamp: string;
}

export interface UserUpdatedEvent {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  timestamp: string;
}

export interface UserDeletedEvent {
  userId: string;
  timestamp: string;
}

export interface LeadCreatedEvent {
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  assignedUserId?: string;
  source: string;
  timestamp: string;
}

export interface LeadUpdatedEvent {
  leadId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  timestamp: string;
}

export interface LeadAssignedEvent {
  leadId: string;
  previousUserId?: string;
  newUserId: string;
  timestamp: string;
}

export interface LeadStatusChangedEvent {
  leadId: string;
  previousStatus: string;
  newStatus: string;
  userId: string;
  timestamp: string;
}

export interface LeadDeletedEvent {
  leadId: string;
  timestamp: string;
}

export interface NotificationSentEvent {
  notificationId: string;
  type: string;
  recipientId: string;
  title: string;
  message: string;
  timestamp: string;
}

export interface NotificationFailedEvent {
  notificationId: string;
  type: string;
  recipientId: string;
  error: string;
  timestamp: string;
}

// Kafka Event Types
export type KafkaEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | LeadCreatedEvent
  | LeadUpdatedEvent
  | LeadAssignedEvent
  | LeadStatusChangedEvent
  | LeadDeletedEvent
  | NotificationSentEvent
  | NotificationFailedEvent; 