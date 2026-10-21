import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  productListQuerySchema,
  productSchema,
  updateProductSchema,
  type ProductInput,
  type ProductListQuery,
  type UpdateProductInput,
} from '@teczone/shared';
import { Roles } from '../auth/decorators';
import { PRODUCT_READ_ROLES, PRODUCT_WRITE_ROLES } from '../common/access';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ProductsService } from './products.service';

@Roles(...PRODUCT_READ_ROLES)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(productListQuerySchema)) query: ProductListQuery) {
    return this.products.list(query);
  }

  @Roles(...PRODUCT_WRITE_ROLES)
  @Post()
  create(@Body(new ZodValidationPipe(productSchema)) body: ProductInput) {
    return this.products.create(body);
  }

  @Roles(...PRODUCT_WRITE_ROLES)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductInput) {
    return this.products.update(id, body);
  }
}
