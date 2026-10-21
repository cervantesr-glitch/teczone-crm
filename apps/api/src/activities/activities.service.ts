import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateActivityInput } from '@teczone/shared';
import type { AuthUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';

export type RelatedType = 'lead' | 'account' | 'opportunity';

const ownerSelect = { owner: { select: { id: true, name: true } } } as const;

// Actividades y tareas compartidas por leads, cuentas y oportunidades (FR-08, FR-09).
// Quien llama valida antes el permiso sobre la entidad relacionada.
@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(relatedType: RelatedType, relatedId: string) {
    return this.prisma.activity.findMany({
      where: { relatedType, relatedId },
      include: ownerSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  add(relatedType: RelatedType, relatedId: string, input: CreateActivityInput, user: AuthUser) {
    return this.prisma.activity.create({
      data: {
        ...input,
        occurredAt: input.type === 'TAREA' ? null : (input.occurredAt ?? new Date()),
        ownerId: user.id,
        relatedType,
        relatedId,
      },
      include: ownerSelect,
    });
  }

  async toggle(relatedType: RelatedType, relatedId: string, activityId: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id: activityId, relatedType, relatedId } });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    return this.prisma.activity.update({
      where: { id: activityId },
      data: { completedAt: activity.completedAt ? null : new Date() },
      include: ownerSelect,
    });
  }

  // Tarea pendiente más próxima por entidad: la "próxima acción".
  async nextActions(relatedType: RelatedType, ids: string[]) {
    const map = new Map<string, { id: string; subject: string; dueAt: Date }>();
    if (!ids.length) return map;
    const tasks = await this.prisma.activity.findMany({
      where: { relatedType, relatedId: { in: ids }, type: 'TAREA', completedAt: null, dueAt: { not: null } },
      orderBy: { dueAt: 'asc' },
    });
    for (const t of tasks) {
      if (!map.has(t.relatedId)) map.set(t.relatedId, { id: t.id, subject: t.subject, dueAt: t.dueAt! });
    }
    return map;
  }
}
