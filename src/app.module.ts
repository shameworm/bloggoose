import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EnvironmentVariables, validate } from './config/env.validation.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { PostsModule } from './posts/posts.module.js';
import { AuthModule } from './auth/auth.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ObserveModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        appKey: config.get('OBSERVE_APP_KEY'),
        appSecret: config.get('OBSERVE_APP_SECRET'),
        serviceId: config.get('OBSERVE_APP_SERVICE_ID'),
      }),
    }),
    UsersModule,
    PostsModule,
    AuthModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        type: 'postgres',
        host: config.get('DB_HOST', { infer: true }),
        port: config.get('DB_PORT', { infer: true }),
        username: config.get('DB_USERNAME', { infer: true }),
        password: config.get('DB_PASSWORD', { infer: true }),
        database: config.get('DB_NAME', { infer: true }),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV', { infer: true }) !== 'production',
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
