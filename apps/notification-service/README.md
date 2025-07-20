# Notification Service

## Overview

The Notification Service is a standalone backend component responsible for listening to events (specifically, when a new user is created) and triggering a notification in response (like sending an email or logging a message). It is built using NestJS, which helps organize code in a clean and testable way.

## Architecture

### Events Instead of API Calls
Instead of receiving direct API calls (like a traditional web server), this service subscribes to a stream of events. These events come from a system called Kafka, which works like a messaging bus between different parts of an application.

### Waiting for User Creation Events
The service listens to a specific kind of message called `user.created`, which tells it that a new user has registered somewhere else in the system.

### Receiving and Validating Data
When the event arrives, the service:
- Reads the event data (user ID, name, email, etc.)
- Validates that the data is complete and correctly formatted

### Triggering a Notification
After validating the data, the service sends a notification — for example, it might:
- Send a welcome email
- Log the event for auditing
- Trigger a push notification or alert another system

## Code Organization

The service follows a modular and layered design, meaning that each part of the code has a specific job:

### Controller (`notification.controller.ts`)
- Listens for incoming messages
- Does not contain logic, only passes data to the right place
- Handles message routing from Kafka to the service

### Service (`notification.service.ts`)
- Contains the actual business logic
- Processes user creation events and sends welcome emails
- Validates incoming data
- Manages notification records

### DTO (`user-created.dto.ts`)
- Defines what the incoming message should look like
- Includes validation rules (e.g., "email must be valid")
- Ensures data integrity

### Email Service (`email.service.ts`)
- Handles email sending functionality
- Supports both SMTP and development ethereal email
- Provides welcome email templates

## Benefits of This Approach

### Scalable
- New types of notifications can be added easily
- The service can be extended to handle other events (lead creation, status changes, etc.)

### Reliable
- Even if the main user system goes down, this service can keep processing events from Kafka
- Failed notifications are logged and can be retried

### Decoupled
- It doesn't rely on direct calls from other systems
- It only reacts when something important happens
- Other services don't need to know about notification logic

### Testable
- Logic is separated from message handling
- We can test it without needing Kafka running
- Each component has a single responsibility

## Configuration

The service requires the following environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/notifications

# Kafka
KAFKA_BROKERS=localhost:9092

# Email (SMTP)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@minicrm.com

# Development
NODE_ENV=development
```

## Running the Service

```bash
# Install dependencies
pnpm install

# Start the service
pnpm run start:dev

# Or with Docker
docker-compose up notification-service
```

## Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e
```

## Adding New Notification Types

To add support for new notification types (e.g., lead creation events):

1. Create a new DTO for the event data
2. Add a new method in the service to handle the event
3. Add a new controller method to listen for the event
4. Update the email service with new email templates if needed

This modular approach makes it easy to extend the service without affecting existing functionality. 