import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  createActivitySchema,
  createQuoteSchema,
  quoteCommentSchema,
  quoteDraftSchema,
  quoteListQuerySchema,
  quoteOutcomeSchema,
  rejectApprovalSchema,
  sendQuoteSchema,
  type CreateActivityInput,
  type CreateQuoteInput,
  type QuoteDraftInput,
  type QuoteListQuery,
  type QuoteOutcomeInput,
  type SendQuoteInput,
} from '@teczone/shared';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/types';
import { QUOTE_APPROVER_ROLES, QUOTE_READ_ROLES, QUOTE_WRITE_ROLES } from '../common/access';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { QuotesService } from './quotes.service';

@Roles(...QUOTE_READ_ROLES)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(quoteListQuerySchema)) query: QuoteListQuery, @CurrentUser() user: AuthUser) {
    return this.quotes.list(query, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.quotes.get(id, user);
  }

  @Get(':id/pdf')
  async pdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version') version: string | undefined,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const n = version ? Number.parseInt(version, 10) : undefined;
    const { filename, buffer } = await this.quotes.pdf(id, Number.isFinite(n) ? n : undefined, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Roles(...QUOTE_WRITE_ROLES)
  @Post()
  create(@Body(new ZodValidationPipe(createQuoteSchema)) body: CreateQuoteInput, @CurrentUser() user: AuthUser) {
    return this.quotes.create(body, user);
  }

  @Roles(...QUOTE_WRITE_ROLES)
  @Put(':id/draft')
  saveDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(quoteDraftSchema)) body: QuoteDraftInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.saveDraft(id, body, user);
  }

  @Roles(...QUOTE_WRITE_ROLES)
  @Post(':id/submit')
  @HttpCode(200)
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.quotes.submit(id, user);
  }

  @Roles(...QUOTE_APPROVER_ROLES)
  @Post(':id/approve')
  @HttpCode(200)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(quoteCommentSchema)) body: { comment: string | null },
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.approve(id, body.comment, user);
  }

  @Roles(...QUOTE_APPROVER_ROLES)
  @Post(':id/reject-approval')
  @HttpCode(200)
  rejectApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(rejectApprovalSchema)) body: { comment: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.rejectApproval(id, body.comment, user);
  }

  @Roles(...QUOTE_WRITE_ROLES)
  @Post(':id/send')
  @HttpCode(200)
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(sendQuoteSchema)) body: SendQuoteInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.send(id, body, user);
  }

  @Roles(...QUOTE_WRITE_ROLES)
  @Post(':id/outcome')
  @HttpCode(200)
  outcome(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(quoteOutcomeSchema)) body: QuoteOutcomeInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.outcome(id, body, user);
  }

  @Roles(...QUOTE_WRITE_ROLES)
  @Post(':id/versions')
  newVersion(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.quotes.newVersion(id, user);
  }

  @Roles(...QUOTE_WRITE_ROLES)
  @Post(':id/activities')
  addActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createActivitySchema)) body: CreateActivityInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.addActivity(id, body, user);
  }

  @Roles(...QUOTE_WRITE_ROLES)
  @Post(':id/activities/:activityId/toggle')
  @HttpCode(200)
  toggleActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.toggleActivity(id, activityId, user);
  }
}
