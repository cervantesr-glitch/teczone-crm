import { Body, Controller, Get, Put } from '@nestjs/common';
import { quoteSettingsSchema, type QuoteSettings } from '@teczone/shared';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/types';
import { PRODUCT_READ_ROLES, QUOTE_APPROVER_ROLES } from '../common/access';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Roles(...PRODUCT_READ_ROLES)
  @Get('quotes')
  quotes() {
    return this.settings.quoteSettings();
  }

  @Roles(...QUOTE_APPROVER_ROLES)
  @Put('quotes')
  updateQuotes(@Body(new ZodValidationPipe(quoteSettingsSchema)) body: QuoteSettings, @CurrentUser() user: AuthUser) {
    return this.settings.updateQuoteSettings(body, user);
  }
}
