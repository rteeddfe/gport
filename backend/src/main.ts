import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createRequire } from 'node:module';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor.js';
import { buildApiValidationPipe } from './common/pipes/api-validation-pipe.js';

const require = createRequire(import.meta.url);
const helmet = require('helmet') as typeof import('helmet').default;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // File URLs are stored host-relative (/files/:id) and must resolve on the
  // API origin without the /api prefix (the storefront proxies that path).
  app.setGlobalPrefix('api', { exclude: ['files/:id'] });

  // Behind a reverse proxy (PaaS, nginx) this makes req.ip — and therefore the
  // rate limiter — see the real client IP. Opt-in via TRUST_PROXY (e.g. "1").
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

  // API surface must not be disclosed in production deployments.
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GPort API')
      .setDescription('REST API for the GPort digital games store')
      .setVersion('0.2.0')
      .addBearerAuth()
      .build();

    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  app.enableShutdownHooks();

  const port = configService.get<number>('port') ?? 3001;

  await app.listen(port);

  new Logger('Bootstrap').log(
    `API ready at http://localhost:${port}/api${isProduction ? '' : ' (Swagger: /api/docs)'}`,
  );
}

await bootstrap();