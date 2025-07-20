import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { StructuredLogger } from '@app/common/logging';

async function bootstrap() {
  const logger = new StructuredLogger('Notification Service');
  
  // Create the microservice application (no HTTP server)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      },
      consumer: {
        groupId: 'notification-service-consumer',
      },
    },
  });

  // Start the microservice
  await app.listen();
  
  logger.log('Notification Service (Kafka Consumer) started successfully', {
    kafkaBrokers: process.env.KAFKA_BROKERS || 'localhost:9092',
    consumerGroup: 'notification-service-consumer',
  });
}

bootstrap(); 