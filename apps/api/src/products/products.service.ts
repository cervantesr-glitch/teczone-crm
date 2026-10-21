import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ProductInput, ProductListQuery, UpdateProductInput } from '@teczone/shared';
import { Prisma } from '@teczone/db';
import { PrismaService } from '../prisma/prisma.service';

// Catálogo de productos y servicios para cotizar (FR-03).
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ProductListQuery) {
    const where: Prisma.ProductWhereInput = {
      category: query.category,
      ...(query.active === 'all' ? {} : { active: query.active === 'true' }),
      ...(query.q
        ? { OR: [{ name: { contains: query.q } }, { sku: { contains: query.q } }, { brand: { contains: query.q } }] }
        : {}),
    };
    return this.prisma.product.findMany({ where, orderBy: { name: 'asc' }, take: 500 });
  }

  create(input: ProductInput) {
    return this.prisma.product.create({ data: input }).catch(duplicateSku);
  }

  async update(id: string, input: UpdateProductInput) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return this.prisma.product.update({ where: { id }, data: input }).catch(duplicateSku);
  }
}

function duplicateSku(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    throw new ConflictException('Ya existe un producto con ese SKU');
  }
  throw e;
}
