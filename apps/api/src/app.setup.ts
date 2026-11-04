import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

// Configuración compartida por main.ts y las pruebas e2e.
export function configureApp(app: INestApplication, opts: { swagger?: boolean } = {}) {
  // Mismo prefijo /api directo o detrás del proxy de Next.js, para que las cookies coincidan.
  app.setGlobalPrefix('api');
  app.use(helmet());
  // El logo de la empresa viaja en base64 (hasta 1 MB); el resto de las peticiones es pequeño.
  (app as NestExpressApplication).useBodyParser('json', { limit: '2mb' });
  app.use(cookieParser());
  if (opts.swagger) {
    const config = new DocumentBuilder()
      .setTitle('TecZone CRM API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }
}
