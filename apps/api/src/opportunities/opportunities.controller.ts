import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  changeStageSchema,
  createOpportunitySchema,
  createActivitySchema,
  opportunityListQuerySchema,
  updateOpportunitySchema,
  type ChangeStageInput,
  type CreateOpportunityInput,
  type CreateActivityInput,
  type OpportunityListQuery,
  type UpdateOpportunityInput,
} from '@teczone/shared';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/types';
import { OPPORTUNITY_READ_ROLES, OPPORTUNITY_WRITE_ROLES } from '../common/access';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { OpportunitiesService } from './opportunities.service';

@Roles(...OPPORTUNITY_READ_ROLES)
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(opportunityListQuerySchema)) query: OpportunityListQuery, @CurrentUser() user: AuthUser) {
    return this.opportunities.list(query, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.opportunities.get(id, user);
  }

  @Roles(...OPPORTUNITY_WRITE_ROLES)
  @Post()
  create(@Body(new ZodValidationPipe(createOpportunitySchema)) body: CreateOpportunityInput, @CurrentUser() user: AuthUser) {
    return this.opportunities.create(body, user);
  }

  @Roles(...OPPORTUNITY_WRITE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateOpportunitySchema)) body: UpdateOpportunityInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.opportunities.update(id, body, user);
  }

  @Roles(...OPPORTUNITY_WRITE_ROLES)
  @Post(':id/stage')
  @HttpCode(200)
  changeStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(changeStageSchema)) body: ChangeStageInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.opportunities.changeStage(id, body, user);
  }

  @Roles(...OPPORTUNITY_WRITE_ROLES)
  @Post(':id/activities')
  addActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createActivitySchema)) body: CreateActivityInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.opportunities.addActivity(id, body, user);
  }

  @Roles(...OPPORTUNITY_WRITE_ROLES)
  @Post(':id/activities/:activityId/toggle')
  @HttpCode(200)
  toggleActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.opportunities.toggleActivity(id, activityId, user);
  }
}
