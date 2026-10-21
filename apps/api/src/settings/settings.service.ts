import { Injectable } from '@nestjs/common';
import { DEFAULT_QUOTE_SETTINGS, type QuoteSettings } from '@teczone/shared';
import type { Prisma } from '@teczone/db';
import type { AuthUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';

const QUOTE_KEY = 'quotes';

// Parámetros de cotización editables (NFR-08). Cada versión copia los valores que usó.
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async quoteSettings(): Promise<QuoteSettings> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: QUOTE_KEY } });
    return { ...DEFAULT_QUOTE_SETTINGS, ...((row?.value as Partial<QuoteSettings> | undefined) ?? {}) };
  }

  async updateQuoteSettings(input: QuoteSettings, user: AuthUser) {
    const value = input as unknown as Prisma.InputJsonValue;
    await this.prisma.$transaction([
      this.prisma.appSetting.upsert({
        where: { key: QUOTE_KEY },
        create: { key: QUOTE_KEY, value, updatedById: user.id },
        update: { value, updatedById: user.id },
      }),
      this.prisma.auditLog.create({
        data: { entity: 'setting', entityId: QUOTE_KEY, action: 'update', userId: user.id, changes: value },
      }),
    ]);
    return this.quoteSettings();
  }
}
