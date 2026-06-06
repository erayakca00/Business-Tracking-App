import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskAiSummary1780605329943 implements MigrationInterface {
  name = 'AddTaskAiSummary1780605329943';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" ADD "ai_summary" text`);
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD "ai_summary_updated_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN "ai_summary_updated_at"`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "ai_summary"`);
  }
}
