import { Module } from '@nestjs/common';
import { WeeklyReportController } from './weekly-report.controller';
import { WeeklyReportService } from './weekly-report.service';
import { LlmService } from '@/llm/llm.service';
import { DingTalkService } from '@/dingtalk/dingtalk.service';
import { StorageService } from '@/storage/object/storage.service';

@Module({
  controllers: [WeeklyReportController],
  providers: [WeeklyReportService, LlmService, DingTalkService, StorageService],
  exports: [WeeklyReportService],
})
export class WeeklyReportModule {}
