import { Controller, Get } from '@nestjs/common';
import { SELLER_ROLES } from '../leads/lead-access';
import { PrismaService } from '../prisma/prisma.service';

// Catálogos de solo lectura para formularios. Su edición llegará con la pantalla de configuración.
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('lead-sources')
  leadSources() {
    return this.prisma.leadSource.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  @Get('disqualification-reasons')
  disqualificationReasons() {
    return this.prisma.disqualificationReason.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  // Personas a las que se puede asignar un lead.
  @Get('sellers')
  async sellers() {
    return this.prisma.user.findMany({
      where: {
        active: true,
        roles: { some: { role: { in: SELLER_ROLES } } },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
