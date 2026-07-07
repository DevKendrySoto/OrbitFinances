import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RecurringPaymentsController } from './recurring-payments.controller';
import { RecurringPaymentsService } from './recurring-payments.service';

@Module({
  imports: [AuthModule],
  controllers: [RecurringPaymentsController],
  providers: [RecurringPaymentsService],
})
export class RecurringPaymentsModule {}
