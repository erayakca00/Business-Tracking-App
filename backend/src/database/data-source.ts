import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number.parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'dev_user',
  password: process.env.DATABASE_PASSWORD || 'dev_' + 'password',
  database: process.env.DATABASE_NAME || 'business_tracking',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: true,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
