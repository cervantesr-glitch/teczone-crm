import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import {
  assignLeadSchema,
  changeLeadStatusSchema,
  convertLeadSchema,
  createActivitySchema,
  createLeadSchema,
  duplicateCheckSchema,
  leadListQuerySchema,
  qualificationSchema,
  updateLeadSchema,
  type ChangeLeadStatusInput,
  type ConvertLeadInput,
  type CreateActivityInput,
  type CreateLeadInput,
  type DuplicateCheckInput,
  type LeadListQuery,
  type Qualification,
  type UpdateLeadInput,
} from '@teczone/shared';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LEAD_READ_ROLES, LEAD_WRITE_ROLES } from './lead-access';
import { LeadsService } from './leads.service';

@Roles(...LEAD_READ_ROLES)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(leadListQuerySchema)) query: LeadListQuery, @CurrentUser() user: AuthUser) {
    return this.leads.list(query, user);
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.leads.summary(user);
  }

  @Roles(...LEAD_WRITE_ROLES)
  @Post('duplicates')
  @HttpCode(200)
  duplicates(@Body(new ZodValidationPipe(duplicateCheckSchema)) body: DuplicateCheckInput) {
    return this.leads.findDuplicates(body);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.leads.get(id, user);
  }

  @Roles(...LEAD_WRITE_ROLES)
  @Post()
  create(@Body(new ZodValidationPipe(createLeadSchema)) body: CreateLeadInput, @CurrentUser() user: AuthUser) {
    return this.leads.create(body, user);
  }

  @Roles(...LEAD_WRITE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) body: UpdateLeadInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.update(id, body, user);
  }

  @Roles(...LEAD_WRITE_ROLES)
  @Put(':id/owner')
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(assignLeadSchema)) body: { ownerId: string | null },
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.assign(id, body.ownerId, user);
  }

  @Roles(...LEAD_WRITE_ROLES)
  @Post(':id/status')
  @HttpCode(200)
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(changeLeadStatusSchema)) body: ChangeLeadStatusInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.changeStatus(id, body, user);
  }

  @Roles(...LEAD_WRITE_ROLES)
  @Post(':id/convert')
  @HttpCode(200)
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(convertLeadSchema)) body: ConvertLeadInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.convert(id, body, user);
  }

  @Roles(...LEAD_WRITE_ROLES)
  @Put(':id/qualification')
  qualify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(qualificationSchema)) body: Qualification,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.qualify(id, body, user);
  }

  @Roles(...LEAD_WRITE_ROLES)
  @Post(':id/activities')
  addActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createActivitySchema)) body: CreateActivityInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.addActivity(id, body, user);
  }

  @Roles(...LEAD_WRITE_ROLES)
  @Post(':id/activities/:activityId/toggle')
  @HttpCode(200)
  toggleActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.completeActivity(id, activityId, user);
  }

  @Roles('ADMIN', 'GERENTE_COMERCIAL')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.leads.remove(id, user);
  }
}
