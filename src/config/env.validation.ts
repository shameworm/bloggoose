import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  validateSync,
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
