import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@teczone/shared';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload, AuthUser } from './types';

const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos';

export interface IssuedTokens {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { roles: true } });
    // Se verifica siempre un hash para no revelar por tiempo de respuesta si el correo existe.
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const valid = await argon2.verify(await hash, password);
    if (!user || !valid || !user.active) throw new UnauthorizedException(INVALID_CREDENTIALS);

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit(user.id, 'login');
    return this.issue(toAuthUser(user));
  }

  // Rota el refresh token: el usado queda revocado y se emite uno nuevo.
  async refresh(refreshToken: string | undefined): Promise<IssuedTokens> {
    if (!refreshToken) throw new UnauthorizedException('Sesión expirada');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: { include: { roles: true } } },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.active) {
      throw new UnauthorizedException('Sesión expirada');
    }
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issue(toAuthUser(stored.user));
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(user: AuthUser): Promise<IssuedTokens> {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email, name: user.name, roles: user.roles };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('base64url');
    const days = Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 7);
    const refreshExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: sha256(refreshToken), expiresAt: refreshExpiresAt },
    });
    return { user, accessToken, refreshToken, refreshExpiresAt };
  }

  private async audit(userId: string, action: string) {
    await this.prisma.auditLog.create({ data: { entity: 'user', entityId: userId, action, userId } });
  }
}

const DUMMY_HASH = argon2.hash('contraseña-inexistente');

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function toAuthUser(user: { id: string; email: string; name: string; roles: { role: Role }[] }): AuthUser {
  return { id: user.id, email: user.email, name: user.name, roles: user.roles.map((r) => r.role) };
}
