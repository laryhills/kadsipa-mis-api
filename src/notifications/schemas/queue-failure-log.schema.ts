import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'queue_failure_logs', timestamps: true })
export class QueueFailureLog extends Document {
  @Prop({ required: true })
  jobId: string;

  @Prop({ required: true })
  queueName: string;

  @Prop({ required: true })
  jobName: string;

  @Prop({ type: Object, required: true })
  jobData: Record<string, any>;

  @Prop({ required: true })
  errorMessage: string;

  @Prop({ type: Object })
  errorStack: string;

  @Prop({ required: true })
  attemptsMade: number;

  @Prop({ required: true })
  failedAt: Date;

  @Prop({ default: 'failed' })
  status: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const QueueFailureLogSchema =
  SchemaFactory.createForClass(QueueFailureLog);

QueueFailureLogSchema.index({ jobId: 1 });
QueueFailureLogSchema.index({ queueName: 1, failedAt: -1 });
QueueFailureLogSchema.index({ failedAt: -1 });
