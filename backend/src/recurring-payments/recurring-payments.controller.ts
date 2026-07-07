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
import { RecurringPaymentsService } from './recurring-payments.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createRecurringPaymentSchema,
  updateRecurringPaymentSchema,
  listRecurringPaymentQuerySchema,
  listOccurrenceQuerySchema,
  payOccurrenceSchema,
} from './dto/recurring-payment.schemas';
import type {
  CreateRecurringPaymentDto,
  UpdateRecurringPaymentDto,
  ListRecurringPaymentQuery,
  ListOccurrenceQuery,
  PayOccurrenceDto,
} from './dto/recurring-payment.schemas';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@UseGuards(JwtAuthGuard)
@Controller('recurring-payments')
export class RecurringPaymentsController {
  constructor(
    private readonly recurringPaymentsService: RecurringPaymentsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createRecurringPaymentSchema))
    dto: CreateRecurringPaymentDto,
  ) {
    return this.recurringPaymentsService.create(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listRecurringPaymentQuerySchema))
    query: ListRecurringPaymentQuery,
  ) {
    return this.recurringPaymentsService.findAll(user.sub, query);
  }

  @Get('occurrences')
  listOccurrences(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listOccurrenceQuerySchema))
    query: ListOccurrenceQuery,
  ) {
    return this.recurringPaymentsService.listOccurrences(user.sub, query);
  }

  @Patch('occurrences/:occurrenceId/pay')
  payOccurrence(
    @CurrentUser() user: JwtPayload,
    @Param('occurrenceId') occurrenceId: string,
    @Body(new ZodValidationPipe(payOccurrenceSchema)) dto: PayOccurrenceDto,
  ) {
    return this.recurringPaymentsService.payOccurrence(
      user.sub,
      occurrenceId,
      dto,
    );
  }

  @Patch('occurrences/:occurrenceId/cancel')
  cancelOccurrence(
    @CurrentUser() user: JwtPayload,
    @Param('occurrenceId') occurrenceId: string,
  ) {
    return this.recurringPaymentsService.cancelOccurrence(
      user.sub,
      occurrenceId,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.recurringPaymentsService.findOne(user.sub, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRecurringPaymentSchema))
    dto: UpdateRecurringPaymentDto,
  ) {
    return this.recurringPaymentsService.update(user.sub, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.recurringPaymentsService.remove(user.sub, id);
  }
}
