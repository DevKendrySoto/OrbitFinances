import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  reportRangeQuerySchema,
  createClosingSchema,
  listClosingsQuerySchema,
} from './dto/report.schemas';
import type {
  ReportRangeQuery,
  CreateClosingDto,
  ListClosingsQuery,
} from './dto/report.schemas';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getRange(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(reportRangeQuerySchema))
    query: ReportRangeQuery,
  ) {
    return this.reportsService.getRangeReport(user.sub, query);
  }

  @Post('closings')
  createClosing(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createClosingSchema)) dto: CreateClosingDto,
  ) {
    return this.reportsService.createClosing(user.sub, dto);
  }

  @Get('closings')
  listClosings(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listClosingsQuerySchema))
    query: ListClosingsQuery,
  ) {
    return this.reportsService.listClosings(user.sub, query);
  }

  @Get('closings/:period')
  getClosing(
    @CurrentUser() user: JwtPayload,
    @Param('period') period: string,
    @Query('householdId') householdId?: string,
  ) {
    return this.reportsService.getClosing(user.sub, period, householdId);
  }
}
