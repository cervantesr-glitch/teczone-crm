import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  companyLogoSchema,
  companySchema,
  defaultCompanySchema,
  updateCompanySchema,
  type CompanyInput,
  type CompanyLogoInput,
  type DefaultCompanyInput,
  type UpdateCompanyInput,
} from '@teczone/shared';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/types';
import { COMPANY_MANAGE_ROLES, hasAnyRole, PRODUCT_READ_ROLES } from '../common/access';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CompaniesService } from './companies.service';

@Roles(...PRODUCT_READ_ROLES)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  // Las inactivas solo las ve la gerencia, para administrarlas.
  @Get()
  list(@Query('includeInactive') includeInactive: string | undefined, @CurrentUser() user: AuthUser) {
    return this.companies.list(includeInactive === 'true' && hasAnyRole(user, COMPANY_MANAGE_ROLES));
  }

  @Roles(...COMPANY_MANAGE_ROLES)
  @Get('assignments')
  assignments() {
    return this.companies.assignments();
  }

  @Roles(...COMPANY_MANAGE_ROLES)
  @Put('assignments/:userId')
  assign(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(defaultCompanySchema)) body: DefaultCompanyInput,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.companies.assign(userId, body.companyId, actor);
  }

  @Get(':id/logo')
  async logo(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { buffer, mime } = await this.companies.logo(id);
    res.set({ 'Content-Type': mime, 'Content-Length': String(buffer.length), 'Cache-Control': 'private, no-cache' });
    res.end(buffer);
  }

  @Roles(...COMPANY_MANAGE_ROLES)
  @Post()
  create(@Body(new ZodValidationPipe(companySchema)) body: CompanyInput, @CurrentUser() actor: AuthUser) {
    return this.companies.create(body, actor);
  }

  @Roles(...COMPANY_MANAGE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCompanySchema)) body: UpdateCompanyInput,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.companies.update(id, body, actor);
  }

  @Roles(...COMPANY_MANAGE_ROLES)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.companies.remove(id, actor);
  }

  @Roles(...COMPANY_MANAGE_ROLES)
  @Put(':id/logo')
  @HttpCode(204)
  setLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(companyLogoSchema)) body: CompanyLogoInput,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.companies.setLogo(id, body.dataUrl, actor);
  }

  @Roles(...COMPANY_MANAGE_ROLES)
  @Delete(':id/logo')
  @HttpCode(204)
  removeLogo(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.companies.removeLogo(id, actor);
  }
}
