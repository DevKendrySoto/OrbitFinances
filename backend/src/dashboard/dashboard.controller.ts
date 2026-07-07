import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { dashboardSummaryQuerySchema } from './dto/dashboard.schemas';
import type { DashboardSummaryQuery } from './dto/dashboard.schemas';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(dashboardSummaryQuerySchema))
    query: DashboardSummaryQuery,
  ) {
    return this.dashboardService.getSummary(user.sub, query);
  }
}
