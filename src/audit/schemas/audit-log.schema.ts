import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AuditAction, AuditStatus } from '../constants/audit-action.enum';

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog extends Document {
  @Prop({ required: false })
  userId?: string;

  @Prop({ required: true })
  action: AuditAction;

  @Prop({ required: false })
  resourceType?: string;

  @Prop({ required: false })
  resourceId?: string;

  @Prop({ type: Object, required: false })
  oldValues?: Record<string, any> | null;

  @Prop({ type: Object, required: false })
  newValues?: Record<string, any> | null;

  @Prop({ type: Object, required: false })
  changesDiff?: Record<string, any> | null;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ default: AuditStatus.SUCCESS })
  status: AuditStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
