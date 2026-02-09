import { Module, DynamicModule, Logger, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailProcessor } from './processors/email.processor';
import { EMAIL_QUEUE } from './queues/email.queue';
import { QueueFailureLogger } from './listeners/queue-failure.listener';
import {
  QueueFailureLog,
  QueueFailureLogSchema,
} from './schemas/queue-failure-log.schema';

@Module({})
export class NotificationsModule implements OnModuleInit {
  private static readonly logger = new Logger(NotificationsModule.name);
  private static isDevelopment = false;

  onModuleInit() {
    if (NotificationsModule.isDevelopment) {
      NotificationsModule.logger.log(
        '🎯 Bull Board is available at: http://localhost:3000/api/queues',
      );
    } else {
      NotificationsModule.logger.log(
        '🔒 Bull Board is disabled in production. View failures at: GET /notifications/queue-failures',
      );
    }
  }

  static forRoot(): DynamicModule {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    NotificationsModule.isDevelopment = isDevelopment;

    const baseImports = [
      BullModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          connection: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          },
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: 1000,
          },
        }),
        inject: [ConfigService],
      }),
      BullModule.registerQueue({
        name: EMAIL_QUEUE,
      }),
      MongooseModule.forFeature([
        { name: QueueFailureLog.name, schema: QueueFailureLogSchema },
      ]),
    ];

    const bullBoardImports = isDevelopment
      ? [
          BullBoardModule.forRoot({
            route: '/queues',
            adapter: ExpressAdapter,
          }),
          BullBoardModule.forFeature({
            name: EMAIL_QUEUE,
            adapter: BullMQAdapter,
          }),
        ]
      : [];

    return {
      module: NotificationsModule,
      imports: [...baseImports, ...bullBoardImports],
      controllers: [NotificationsController],
      providers: [NotificationService, EmailProcessor, QueueFailureLogger],
      exports: [NotificationService, BullModule],
    };
  }
}
