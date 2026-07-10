import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiInsightsController } from './ai-insights.controller';
import { AiInsightsService } from './ai-insights.service';

@Module({
  imports: [AuthModule],
  controllers: [AiInsightsController],
  providers: [AiInsightsService],
})
export class AiInsightsModule {}
