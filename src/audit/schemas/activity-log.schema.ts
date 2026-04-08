import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ActivityType } from '../constants/audit-action.enum';

@Schema({ timestamps: true, collection: 'activity_logs' })
export class ActivityLog extends Document {
  @Prop({ required: false })
  userId?: string;

  @Prop({ type: String, enum: ActivityType, required: false })
  activityType?: ActivityType;

  @Prop({ required: false })
  description?: string;

  @Prop({ type: Object, required: false })
  logDetails?: Record<string, any>;

  @Prop({ required: false })
  ipAddress?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
