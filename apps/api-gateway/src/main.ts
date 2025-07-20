import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { StructuredLogger } from '@app/common/logging';
import { LoggingInterceptor } from '@app/common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new StructuredLogger('API Gateway');

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('MiniCRM API Gateway')
    .setDescription('The MiniCRM API Gateway - Single entry point for all microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log('API Gateway started successfully', {
    port,
    swaggerUrl: `http://localhost:${port}/api`,
    healthCheckUrl: `http://localhost:${port}/health`,
  });
}

bootstrap(); 