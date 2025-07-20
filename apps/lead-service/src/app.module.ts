import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { LeadController } from './controllers/lead.controller';
import { LeadService } from './services/lead.service';
import { Lead } from './entities/lead.entity';
import { UserSdkService } from '@app/sdk/user-sdk.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [Lead],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Lead]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'lead-service',
              brokers: configService.get('KAFKA_BROKERS')?.split(',') || ['localhost:9092'],
            },
            consumer: {
              groupId: 'lead-service-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [LeadController],
  providers: [
    LeadService,
    {
      provide: UserSdkService,
      useFactory: (configService: ConfigService) => {
        const userServiceUrl = configService.get('USER_SERVICE_URL');
        if (!userServiceUrl) {
          throw new Error('USER_SERVICE_URL is not defined');
        }
        return new UserSdkService(userServiceUrl);
      },
      inject: [ConfigService],
    },
  ],
  exports: [LeadService],
})
export class AppModule {} 