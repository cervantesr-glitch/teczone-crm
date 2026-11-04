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

  quoteSettings() {
    return this.read<QuoteSettings>(QUOTE_KEY, DEFAULT_QUOTE_SETTINGS);
  }

  async updateQuoteSettings(input: QuoteSettings, user: AuthUser) {
    await this.write(QUOTE_KEY, input, user);
    return this.quoteSettings();
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
