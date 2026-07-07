import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IncomesService } from './incomes.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createIncomeSchema,
  updateIncomeSchema,
  listIncomeQuerySchema,
} from './dto/income.schemas';
import type {
  CreateIncomeDto,
  UpdateIncomeDto,
  ListIncomeQuery,
} from './dto/income.schemas';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@UseGuards(JwtAuthGuard)
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createIncomeSchema)) dto: CreateIncomeDto,
  ) {
    return this.incomesService.create(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listIncomeQuerySchema)) query: ListIncomeQuery,
  ) {
    return this.incomesService.findAll(user.sub, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.incomesService.findOne(user.sub, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateIncomeSchema)) dto: UpdateIncomeDto,
  ) {
    return this.incomesService.update(user.sub, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.incomesService.remove(user.sub, id);
  }
}
