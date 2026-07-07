import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';

@Module({
  imports: [AuthModule],
  controllers: [IncomesController],
  providers: [IncomesService],
})
export class IncomesModule {}
