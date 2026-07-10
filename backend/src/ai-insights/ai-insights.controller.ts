import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AiInsightsService } from './ai-insights.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { listInsightsQuerySchema } from './dto/ai-insights.schemas';
import type { ListInsightsQuery } from './dto/ai-insights.schemas';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@UseGuards(JwtAuthGuard)
@Controller('ai-insights')
export class AiInsightsController {
  constructor(private readonly aiInsightsService: AiInsightsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listInsightsQuerySchema))
    query: ListInsightsQuery,
  ) {
    return this.aiInsightsService.list(user.sub, query);
  }

  @Patch(':id/dismiss')
  dismiss(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.aiInsightsService.dismiss(user.sub, id);
  }
}
