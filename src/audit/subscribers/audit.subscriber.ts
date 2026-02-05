import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  DataSource,
  EntityManager,
} from 'typeorm';
import { Model } from 'mongoose';
import { AuditLog } from '../schemas/audit-log.schema';
import { AuditAction, AuditStatus } from '../constants/audit-action.enum';
import { calculateDiff, sanitizeValues } from '../utils/diff.util';

interface AuditableEntity {
  id?: string;
  created_by?: string;
  updated_by?: string;
  manager?: EntityManager;
  constructor: { name: string };
}

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  private auditLogModel: Model<AuditLog>;

  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  setAuditLogModel(model: Model<AuditLog>): void {
    this.auditLogModel = model;
  }

  private async createAuditLog(
    action: AuditAction,
    entity: AuditableEntity,
    oldValues?: Record<string, unknown> | null,
    newValues?: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      const entityName = entity.constructor.name.replace('Entity', '');

      if (this.shouldSkipAudit(entityName) || !this.auditLogModel) {
        return;
      }

      const sanitizedOldValues = oldValues ? sanitizeValues(oldValues) : null;
      const sanitizedNewValues = newValues ? sanitizeValues(newValues) : null;

      const changesDiff =
        sanitizedOldValues && sanitizedNewValues
          ? calculateDiff(sanitizedOldValues, sanitizedNewValues)
          : null;

      const userId = this.extractUserId(entity);

      const auditLog = new this.auditLogModel({
        userId: userId ?? undefined,
        action,
        resourceType: entityName.toLowerCase(),
        resourceId: entity.id ?? '',
        oldValues: sanitizedOldValues,
        newValues: sanitizedNewValues,
        changesDiff: changesDiff,
        status: AuditStatus.SUCCESS,
      });

      await auditLog.save();
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  afterInsert(event: InsertEvent<AuditableEntity>): void {
    void this.createAuditLog(
      AuditAction.CREATE,
      event.entity,
      null,
      event.entity as unknown as Record<string, unknown>,
    );
  }

  afterUpdate(event: UpdateEvent<AuditableEntity>): void {
    if (event.entity) {
      void this.createAuditLog(
        AuditAction.UPDATE,
        event.entity,
        event.databaseEntity as unknown as Record<string, unknown>,
        event.entity as unknown as Record<string, unknown>,
      );
    }
  }

  afterRemove(event: RemoveEvent<AuditableEntity>): void {
    if (event.entity) {
      void this.createAuditLog(
        AuditAction.DELETE,
        event.entity,
        event.entity as unknown as Record<string, unknown>,
        null,
      );
    }
  }

  private extractUserId(entity: AuditableEntity): string | null {
    return entity.created_by ?? entity.updated_by ?? null;
  }

  private shouldSkipAudit(entityName: string): boolean {
    const skipEntities = ['AuditLog', 'ActivityLog'];
    return skipEntities.includes(entityName);
  }
}
