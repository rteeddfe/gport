import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module.js';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { TimeoutInterceptor } from '../src/common/interceptors/timeout.interceptor.js';
import { buildApiValidationPipe } from '../src/common/pipes/api-validation-pipe.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const helmet = require('helmet') as typeof import('helmet').default;

let handler: ((req: Request, res: Response) => void) | undefined;

async function createHandler() {
  if (handler) {
    return handler;
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api', { exclude: ['files/:id'] });

  const trustProxy = configService.get<boolean | number | string | undefined>(
    'trustProxy',
  );

  if (trustProxy !== undefined) {
    const expressApp = app.getHttpAdapter().getInstance() as {
      set(name: string, value: unknown): void;
    };

    expressApp.set('trust proxy', trustProxy);
  }

  app.use(helmet());

  app.enableCors({
    origin: configService.get<string[]>('corsOrigins') ?? [],
    credentials: true,
  });

  app.useGlobalPipes(buildApiValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TimeoutInterceptor());

  app.enableShutdownHooks();

  await app.init();

  handler = app.getHttpAdapter().getInstance() as (
    req: Request,
    res: Response,
  ) => void;

  return handler;
}

export default async function vercelHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const app = await createHandler();

  if (req.query?.path) {
    delete req.query.path;
  }

  app(req, res);
}