import { Global, Module } from '@nestjs/common';
import { HouseholdAccessService } from './household-access.service';

@Global()
@Module({
  providers: [HouseholdAccessService],
  exports: [HouseholdAccessService],
})
export class HouseholdModule {}
