import { NestFactory } from '@nestjs/core';
import type { Express } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Detrás del proxy de Render (u otro hosting con reverse proxy): sin esto,
  // Express ve la IP interna del proxy para todos los requests y el rate
  // limiting de @nestjs/throttler agrupa a todos los usuarios en un mismo bucket.
  (app.getHttpAdapter().getInstance() as Express).set('trust proxy', 1);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
