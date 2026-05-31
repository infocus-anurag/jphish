import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PhishServerModule } from './phish-server/phish-server.module';
import * as fs from 'fs';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Parse cookies so the auth controller can read the refresh-token cookie.
  app.use(cookieParser());

  // Global configuration
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Enable CORS
  app.enableCors({
    origin: configService.get('API_CORS_ORIGIN') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global pipes for validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('PhishGuard AI API')
    .setDescription('Phishing Simulation Platform API')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT'
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Campaigns', 'Campaign management endpoints')
    .addTag('Reports', 'Analytics and reporting endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  // Ensure migrations directory exists
  const migrationsDir = './src/database/migrations';
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const port = configService.get<number>('PORT', 3001);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host, () => {
    console.log(`✅ PhishGuard AI API Server running on http://${host}:${port}`);
    console.log(`📚 Swagger Documentation: http://${host}:${port}/swagger`);
    console.log(`📊 Bull Dashboard: http://${host}:${port}/bull`);
  });

  // Boot the public phish-server as a SECOND, isolated Nest app on its own port.
  // It exposes ONLY the surface a target can reach (/t tracking, /p landing) and
  // deliberately does not share the admin app's global prefix, CORS, or cookies.
  // No whitelisting ValidationPipe here: landing-page form submissions carry
  // arbitrary captured fields that must pass through untouched.
  const phishApp = await NestFactory.create(PhishServerModule);
  const phishPort = configService.get<number>('PHISH_PORT', 3002);
  const phishHost = configService.get<string>('PHISH_HOST', '0.0.0.0');
  await phishApp.listen(phishPort, phishHost, () => {
    console.log(`🎣 Phish-server (public tracking + landing) on http://${phishHost}:${phishPort}`);
  });
}

bootstrap().catch((error) => {
  console.error('❌ Failed to bootstrap application:', error);
  process.exit(1);
});
