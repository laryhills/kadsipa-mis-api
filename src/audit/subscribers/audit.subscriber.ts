import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  DataSource,
  EntityManager,
} from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
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
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  private async createAuditLog(
    action: AuditAction,
    entity: AuditableEntity,
    oldValues?: Record<string, unknown> | null,
    newValues?: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      const entityName = entity.constructor.name.replace('Entity', '');

      if (this.shouldSkipAudit(entityName) || !entity.manager) {
        return;
      }

      const auditLogRepository = entity.manager.getRepository(AuditLogEntity);

      const sanitizedOldValues = oldValues ? sanitizeValues(oldValues) : null;
      const sanitizedNewValues = newValues ? sanitizeValues(newValues) : null;

      const changesDiff =
        sanitizedOldValues && sanitizedNewValues
          ? calculateDiff(sanitizedOldValues, sanitizedNewValues)
          : null;

      const userId = this.extractUserId(entity);

      const auditLog = auditLogRepository.create({
        user_id: userId ?? undefined,
        action,
        resource_type: entityName.toLowerCase(),
        resource_id: entity.id ?? '',
        old_values: sanitizedOldValues,
        new_values: sanitizedNewValues,
        changes_diff: changesDiff,
        status: AuditStatus.SUCCESS,
      });

      await auditLogRepository.save(auditLog);
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
