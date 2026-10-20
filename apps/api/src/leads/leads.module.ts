import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [AccountsModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
