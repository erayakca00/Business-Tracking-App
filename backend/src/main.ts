import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import * as fs from 'node:fs';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable trust proxy for rate limiting behind reverse proxies (like Railway)
  app.set('trust proxy', 1);

  // Enable CORS BEFORE other middleware so preflight OPTIONS requests
  // get the correct headers before Helmet or other middleware can interfere.
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => {
        let trimmed = o.trim();
        // Guard against Render injecting only the internal service name
        // (no dots) instead of the full public hostname.
        if (trimmed && !/^https?:\/\//i.test(trimmed) && !trimmed.includes('.')) {
          console.warn(
            `[CORS] Origin "${trimmed}" looks like a bare service name. Appending ".onrender.com".`,
          );
          trimmed = `${trimmed}.onrender.com`;
        }
        return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      })
    : '*';
  console.log('[CORS] Allowed origins:', corsOrigins);
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global security headers (after CORS so preflight isn't blocked)
  app.use(
    helmet({
      contentSecurityPolicy: false, // relaxed for development and socket connections
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploaded files to other origins
    }),
  );

  // Create uploads directory if it doesn't exist
  const uploadDir = join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Serve static files from the uploads directory
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  // Listen on 0.0.0.0 to accept connections from other devices (Mobile)
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log(
    `Application is running on: http://localhost:${process.env.PORT || 3000}`,
  );
}
bootstrap();
