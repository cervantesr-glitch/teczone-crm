import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.setup';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app, { swagger: process.env.NODE_ENV !== 'production' });
  const port = Number(process.env.API_PORT ?? 4000);
  // En producción la API solo escucha dentro del servidor; el público entra por la web.
  await app.listen(port, process.env.API_HOST ?? '0.0.0.0');
  console.log(`API escuchando en http://localhost:${port} (documentación en /docs)`);
}

bootstrap();
