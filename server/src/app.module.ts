import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { WeeklyReportModule } from '@/weekly-report/weekly-report.module';

@Module({
  imports: [WeeklyReportModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
