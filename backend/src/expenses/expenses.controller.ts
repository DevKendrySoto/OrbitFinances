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
import { ExpensesService } from './expenses.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpenseQuerySchema,
} from './dto/expense.schemas';
import type {
  CreateExpenseDto,
  UpdateExpenseDto,
  ListExpenseQuery,
} from './dto/expense.schemas';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createExpenseSchema)) dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listExpenseQuerySchema))
    query: ListExpenseQuery,
  ) {
    return this.expensesService.findAll(user.sub, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.expensesService.findOne(user.sub, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExpenseSchema)) dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user.sub, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.expensesService.remove(user.sub, id);
  }
}
