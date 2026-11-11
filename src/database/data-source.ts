import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { validate } from '../config/env.validation.js';
import { buildTypeOrmOptions } from './typeorm.options.js';

export default new DataSource(buildTypeOrmOptions(validate(process.env)));
