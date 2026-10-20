import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import argon2 from 'argon2';
import type { AuthUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserInput, UpdateUserInput } from './users.schemas';

const publicSelect = {
  id: true,
  email: true,
  name: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: true } },
} as const;

type UserRow = { roles: { role: string }[] } & Record<string, unknown>;

function toPublic<T extends UserRow>(u: T) {
  return { ...u, roles: u.roles.map((r) => r.role) };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({ select: publicSelect, orderBy: { name: 'asc' } });
    return users.map(toPublic);
  }

  async create(input: CreateUserInput, actor: AuthUser) {
    const exists = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new ConflictException('Ya existe un usuario con ese correo');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await argon2.hash(input.password),
        roles: { create: input.roles.map((role) => ({ role })) },
      },
      select: publicSelect,
    });
    await this.prisma.auditLog.create({
      data: { entity: 'user', entityId: user.id, action: 'create', userId: actor.id, changes: { roles: input.roles } },
    });
    return toPublic(user);
  }

  async update(id: string, input: UpdateUserInput, actor: AuthUser) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Usuario no encontrado');
    if (id === actor.id && (input.active === false || (input.roles && !input.roles.includes('ADMIN')))) {
      throw new BadRequestException('No puedes desactivarte ni quitarte el rol de administrador');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      if (input.roles) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({ data: input.roles.map((role) => ({ userId: id, role })) });
      }
      // Desactivar o cambiar contraseña cierra todas las sesiones del usuario.
      if (input.active === false || input.password) {
        await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      const updated = await tx.user.update({
        where: { id },
        data: {
          name: input.name,
          active: input.active,
          passwordHash: input.password ? await argon2.hash(input.password) : undefined,
        },
        select: publicSelect,
      });
      await tx.auditLog.create({
        data: {
          entity: 'user',
          entityId: id,
          action: 'update',
          userId: actor.id,
          changes: { ...input, password: input.password ? '***' : undefined },
        },
      });
      return updated;
    });
    return toPublic(user);
  }
}
