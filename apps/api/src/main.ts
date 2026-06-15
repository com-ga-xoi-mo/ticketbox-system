import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PlatformConfigService } from '@ticketbox/backend';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: true });

  const config = app.get(PlatformConfigService);

  await app.listen(config.port);
  Logger.log(`TicketBox API listening on port ${config.port}`, 'Bootstrap');
}

void bootstrap();
