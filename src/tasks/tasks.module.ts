import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupTasks } from './cleanup.tasks';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule],
  providers: [CleanupTasks],
})
export class TasksModule {}
