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

/** The routing layer also appends the matched segments as query params —
 * "...path" or "path" depending on the mode. No API route uses either
 * name, so strip both: the global ValidationPipe (whitelist +
 * forbidNonWhitelisted) rejects unknown query props. */
function normalizeVercelUrl(url: string): string {
  const [pathname, search = ''] = url.split('?');
  if (!search) {
    return pathname;
  }
  const params = new URLSearchParams(search);
  if (!params.has('...path') && !params.has('path')) {
    return `${pathname}?${search}`;
  }
  params.delete('...path');
  params.delete('path');
  const cleanSearch = params.toString();
  return cleanSearch ? `${pathname}?${cleanSearch}` : pathname;
}

export default async function vercelHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const app = await createHandler();

  req.url = normalizeVercelUrl(req.url ?? '/');
  if (req.query) {
    delete (req.query as Record<string, unknown>)['...path'];
    delete (req.query as Record<string, unknown>).path;
  }

  app(req, res);
}