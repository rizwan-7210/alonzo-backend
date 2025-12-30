import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'server';

  let httpsOptions: HttpsOptions | undefined = undefined;

  if (isProduction) {
    // SSL Certificate paths - using your existing certificates for production
    const sslBase = '/home/customdevnewonli/public_html/ssl';
    try {
      httpsOptions = {
        key: readFileSync(`${sslBase}/customdevnewonli.key`),
        cert: readFileSync(`${sslBase}/customdevnewonli.crt`),
        ca: readFileSync(`${sslBase}/customdevnewonli.ca`),
      };
      console.log('🔒 HTTPS enabled for production environment');
    } catch (error) {
      console.warn('⚠️ SSL certificates not found, falling back to HTTP');
    }
  }

  const app = await NestFactory.create(AppModule, {
    httpsOptions,
    logger: isProduction ? ['error', 'warn', 'log'] : ['debug', 'error', 'warn', 'log']
  });

  // Configure body parser for form data (application/x-www-form-urlencoded)
  // NestJS uses Express which has body parser built-in
  const expressInstance = app.getHttpAdapter().getInstance();
  if (expressInstance && typeof expressInstance.use === 'function') {
    // Express 4.16+ has body parser built-in - configure it before other middleware
    const express = require('express');
    // Apply urlencoded parser with extended option to handle nested objects
    // This MUST be before JSON parser to handle form data correctly
    expressInstance.use(express.urlencoded({ extended: true, limit: '10mb' }));
    // Also ensure JSON parser is configured
    expressInstance.use(express.json({ limit: '10mb' }));
  }

  const reflector = app.get(Reflector);

  // Trust proxy for production - using Express instance directly
  if (isProduction) {
    const expressInstance = app.getHttpAdapter().getInstance();
    if (expressInstance.set) { // Check if set method exists (Express)
      expressInstance.set('trust proxy', 1);
    }
  }

  // app.enableCors({
  //   origin: isProduction
  //     ? [
  //       'https://custom-dev.onlinetestingserver.com',
  //       'http://custom-dev.onlinetestingserver.com'
  //     ]
  //     : '*',
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  //   allowedHeaders: 'Content-Type, Authorization',
  //   credentials: isProduction,
  // });
  app.enableCors({
    origin: isProduction
      ? [
        'https://custom-dev.onlinetestingserver.com',
        'http://custom-dev.onlinetestingserver.com'
      ]
      : [
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,   // ALWAYS true in dev
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global serialization interceptor
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // Global transform interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Note: JWT guard is now registered as APP_GUARD in CommonModule
  // This ensures it runs before RolesGuard and has access to DI container

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('File Management API')
    .setDescription('File management system with user authentication')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Swagger available at api-docs
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 8858;
  await app.listen(port);

  // Environment-specific log messages
  const protocol = isProduction && httpsOptions ? 'https' : 'http';
  const domain = isProduction ? 'custom-dev.onlinetestingserver.com' : 'localhost';

  console.log(`🚀 Application is running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📍 Server: ${protocol}://${domain}:${port}/api/v1`);
  console.log(`📚 Swagger: ${protocol}://${domain}:${port}/api-docs`);

  if (isProduction && httpsOptions) {
    console.log('🔒 SSL/TLS Encryption: Enabled');
  }
}

bootstrap();