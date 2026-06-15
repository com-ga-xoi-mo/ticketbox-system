import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { PlatformConfigService } from '../../../packages/backend/src';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(PlatformConfigService);

  await app.listen(config.port);
  Logger.log(`TicketBox API listening on port ${config.port}`, 'Bootstrap');
}

void bootstrap();
