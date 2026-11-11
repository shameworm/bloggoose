import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

import { RefreshToken } from '../auth/entities/refresh-token.entity.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { Post } from '../posts/entities/post.entity.js';
import { User } from '../users/entities/user.entity.js';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

const ext = import.meta.url.endsWith('.ts') ? 'ts' : 'js';

type DbEnv = Pick<
  EnvironmentVariables,
  'DB_HOST' | 'DB_PORT' | 'DB_USERNAME' | 'DB_PASSWORD' | 'DB_NAME'
>;

export function buildTypeOrmOptions(env: DbEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: [User, Post, RefreshToken],
    migrations: [join(import.meta.dirname, 'migrations', `*.${ext}`)],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
  };
}
