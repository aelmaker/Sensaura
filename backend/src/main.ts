import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: false,
  });
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
