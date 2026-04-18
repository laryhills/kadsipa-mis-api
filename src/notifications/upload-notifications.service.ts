import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationStatus,
  NotificationType,
  UploadNotificationEntity,
} from './entities/upload-notification.entity';

export interface CreateUploadNotificationDto {
  interventionId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  sourceFile?: string;
  createdById: string;
}

@Injectable()
export class UploadNotificationsService {
  constructor(
    @InjectRepository(UploadNotificationEntity)
    private readonly notificationRepository: Repository<UploadNotificationEntity>,
  ) {}

  async create(
    dto: CreateUploadNotificationDto,
  ): Promise<UploadNotificationEntity> {
    const notification = this.notificationRepository.create(dto);
    return await this.notificationRepository.save(notification);
  }

  async findAll(
    userId?: string,
    status?: string,
  ): Promise<UploadNotificationEntity[]> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.intervention', 'intervention')
      .leftJoin('notification.createdBy', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
      .orderBy('notification.createdAt', 'DESC');

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (userId) {
      conditions.push('notification.createdById = :userId');
      params.userId = userId;
    }
    if (status) {
      conditions.push('notification.status = :status');
      params.status = status;
    }

    if (conditions.length > 0) {
      query.where(conditions.join(' AND '), params);
    }

    return await query.getMany();
  }

  async findByIntervention(
    interventionId: string,
  ): Promise<UploadNotificationEntity[]> {
    return await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.createdBy', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
      .where('notification.interventionId = :interventionId', {
        interventionId,
      })
      .orderBy('notification.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<UploadNotificationEntity> {
    const notification = await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.intervention', 'intervention')
      .leftJoin('notification.createdBy', 'createdBy')
      .addSelect(['createdBy.id', 'createdBy.email', 'createdBy.full_name'])
      .where('notification.id = :id', { id })
      .getOne();

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async markAsRead(id: string): Promise<UploadNotificationEntity> {
    const notification = await this.findOne(id);
    notification.status = NotificationStatus.READ;
    return await this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { createdById: userId, status: NotificationStatus.UNREAD },
      { status: NotificationStatus.READ },
    );
  }

  async countUnread(userId?: string): Promise<number> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.status = :status', {
        status: NotificationStatus.UNREAD,
      });

    if (userId) {
      query.andWhere('notification.createdById = :userId', { userId });
    }

    return await query.getCount();
  }

  async remove(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);
  }
}
