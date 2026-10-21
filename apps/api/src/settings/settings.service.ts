import { Injectable } from '@nestjs/common';
import { DEFAULT_COMPANY_SETTINGS, DEFAULT_QUOTE_SETTINGS, type CompanySettings, type QuoteSettings } from '@teczone/shared';
import type { Prisma } from '@teczone/db';
import type { AuthUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';

const QUOTE_KEY = 'quotes';
const COMPANY_KEY = 'company';

// Parámetros de cotización editables (NFR-08). Cada versión copia los valores que usó.
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  quoteSettings() {
    return this.read<QuoteSettings>(QUOTE_KEY, DEFAULT_QUOTE_SETTINGS);
  }

  async updateQuoteSettings(input: QuoteSettings, user: AuthUser) {
    await this.write(QUOTE_KEY, input, user);
    return this.quoteSettings();
  }

  // Datos del emisor para el PDF de cotización (FR-06).
  companySettings() {
    return this.read<CompanySettings>(COMPANY_KEY, DEFAULT_COMPANY_SETTINGS);
  }

  async updateCompanySettings(input: CompanySettings, user: AuthUser) {
    await this.write(COMPANY_KEY, input, user);
    return this.companySettings();
  }

  private async read<T extends object>(key: string, defaults: T): Promise<T> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    return { ...defaults, ...((row?.value as Partial<T> | undefined) ?? {}) };
  }

  private async write(key: string, input: object, user: AuthUser) {
    const value = input as Prisma.InputJsonValue;
    await this.prisma.$transaction([
      this.prisma.appSetting.upsert({
        where: { key },
        create: { key, value, updatedById: user.id },
        update: { value, updatedById: user.id },
      }),
      this.prisma.auditLog.create({
        data: { entity: 'setting', entityId: key, action: 'update', userId: user.id, changes: value },
      }),
    ]);
  }
}
