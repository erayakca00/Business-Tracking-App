import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingUserColumns1780606000000 implements MigrationInterface {
  name = 'AddMissingUserColumns1780606000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing theme and push token columns to users table
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "webTheme" character varying NOT NULL DEFAULT 'light'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "mobileTheme" character varying NOT NULL DEFAULT 'light'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "push_token" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "push_token"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "mobileTheme"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "webTheme"`);
  }
}
