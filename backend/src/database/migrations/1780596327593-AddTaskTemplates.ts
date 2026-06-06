import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskTemplates1780596327593 implements MigrationInterface {
  name = 'AddTaskTemplates1780596327593';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."task_templates_priority_enum" AS ENUM('low', 'medium', 'high')`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "group_id" uuid NOT NULL, "created_by" uuid, "name" character varying NOT NULL, "title" character varying, "description" text, "priority" "public"."task_templates_priority_enum" DEFAULT 'medium', "effort" integer, "project_tag" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a1347b5446b9e3158e2b72f58b2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ccc3fa0b624e868581313501bb" ON "task_templates" ("group_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_710886091b003788de4a03be38" ON "task_templates" ("created_by") `,
    );
    await queryRunner.query(
      `ALTER TABLE "task_templates" ADD CONSTRAINT "FK_ccc3fa0b624e868581313501bba" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_templates" ADD CONSTRAINT "FK_710886091b003788de4a03be383" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_templates" DROP CONSTRAINT "FK_710886091b003788de4a03be383"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_templates" DROP CONSTRAINT "FK_ccc3fa0b624e868581313501bba"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_710886091b003788de4a03be38"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ccc3fa0b624e868581313501bb"`,
    );
    await queryRunner.query(`DROP TABLE "task_templates"`);
    await queryRunner.query(
      `DROP TYPE "public"."task_templates_priority_enum"`,
    );
  }
}
