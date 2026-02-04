import { SetMetadata } from '@nestjs/common';
import { ActivityType } from '../constants/audit-action.enum';

export const AUDIT_METADATA_KEY = 'audit_metadata';

export interface AuditMetadata {
  activityType: ActivityType;
  description: string;
}

export const Audit = (activityType: ActivityType, description: string) =>
  SetMetadata(AUDIT_METADATA_KEY, { activityType, description });
