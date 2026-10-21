import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  accountListQuerySchema,
  contactFieldsSchema,
  createAccountSchema,
  updateAccountSchema,
  updateContactSchema,
  type AccountListQuery,
  type ContactInput,
  type CreateAccountInput,
  type UpdateAccountInput,
  type UpdateContactInput,
} from '@teczone/shared';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/types';
import { ACCOUNT_READ_ROLES, ACCOUNT_WRITE_ROLES } from '../common/access';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AccountsService } from './accounts.service';

@Roles(...ACCOUNT_READ_ROLES)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(accountListQuerySchema)) query: AccountListQuery) {
    return this.accounts.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.accounts.get(id, user);
  }

  @Roles(...ACCOUNT_WRITE_ROLES)
  @Post()
  create(@Body(new ZodValidationPipe(createAccountSchema)) body: CreateAccountInput, @CurrentUser() user: AuthUser) {
    return this.accounts.create(body, user);
  }

  @Roles(...ACCOUNT_WRITE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateAccountSchema)) body: UpdateAccountInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accounts.update(id, body, user);
  }

  @Roles(...ACCOUNT_WRITE_ROLES)
  @Post(':id/contacts')
  addContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(contactFieldsSchema)) body: ContactInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accounts.addContact(id, body, user);
  }

  @Roles(...ACCOUNT_WRITE_ROLES)
  @Patch(':id/contacts/:contactId')
  updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body(new ZodValidationPipe(updateContactSchema)) body: UpdateContactInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accounts.updateContact(id, contactId, body, user);
  }
}
