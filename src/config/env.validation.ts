import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  MinLength,
  validateSync,
  Min,
} from 'class-validator';

export class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';

  @IsString()
  @IsNotEmpty()
  OBSERVE_APP_KEY: string;

  @IsString()
  @IsNotEmpty()
  OBSERVE_APP_SECRET: string;

  @IsString()
  @IsNotEmpty()
  OBSERVE_APP_SERVICE_ID: string;

  @IsInt()
  @IsNotEmpty()
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsInt()
  @IsNotEmpty()
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  JWT_ACCESS_TTL: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  JWT_REFRESH_TTL_DAYS: number;
}

export function validate(config: Record<string, unknown>) {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(env);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return env;
}
