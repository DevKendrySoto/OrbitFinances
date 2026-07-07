import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createGoalSchema,
  updateGoalSchema,
  listGoalQuerySchema,
  createContributionSchema,
} from './dto/goal.schemas';
import type {
  CreateGoalDto,
  UpdateGoalDto,
  ListGoalQuery,
  CreateContributionDto,
} from './dto/goal.schemas';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createGoalSchema)) dto: CreateGoalDto,
  ) {
    return this.goalsService.create(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listGoalQuerySchema)) query: ListGoalQuery,
  ) {
    return this.goalsService.findAll(user.sub, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.goalsService.findOne(user.sub, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGoalSchema)) dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(user.sub, id, dto);
  }

  @Post(':id/contributions')
  addContribution(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createContributionSchema))
    dto: CreateContributionDto,
  ) {
    return this.goalsService.addContribution(user.sub, id, dto);
  }
}
