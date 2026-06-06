import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskDependenciesAndTimeLogs1780578923030 implements MigrationInterface {
  name = 'AddTaskDependenciesAndTimeLogs1780578923030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "time_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "task_id" uuid NOT NULL, "user_id" uuid NOT NULL, "started_at" TIMESTAMP NOT NULL, "ended_at" TIMESTAMP, "duration" integer, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8657e6aaa7035da9fc7309f385a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_dependencies" ("blocked_task_id" uuid NOT NULL, "blocking_task_id" uuid NOT NULL, CONSTRAINT "PK_ac12bac17a6fd5b1bce58410dd2" PRIMARY KEY ("blocked_task_id", "blocking_task_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b1c55e5b13dc735f218d9a8a4" ON "task_dependencies" ("blocked_task_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24beb61f88d557523d0e95cb2c" ON "task_dependencies" ("blocking_task_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" ADD CONSTRAINT "FK_5863acae12451e29b1414a3795c" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" ADD CONSTRAINT "FK_b5e06aedfbf8f061e3e68ad154e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_dependencies" ADD CONSTRAINT "FK_1b1c55e5b13dc735f218d9a8a44" FOREIGN KEY ("blocked_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_dependencies" ADD CONSTRAINT "FK_24beb61f88d557523d0e95cb2c1" FOREIGN KEY ("blocking_task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_dependencies" DROP CONSTRAINT "FK_24beb61f88d557523d0e95cb2c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_dependencies" DROP CONSTRAINT "FK_1b1c55e5b13dc735f218d9a8a44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP CONSTRAINT "FK_b5e06aedfbf8f061e3e68ad154e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_logs" DROP CONSTRAINT "FK_5863acae12451e29b1414a3795c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24beb61f88d557523d0e95cb2c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1b1c55e5b13dc735f218d9a8a4"`,
    );
    await queryRunner.query(`DROP TABLE "task_dependencies"`);
    await queryRunner.query(`DROP TABLE "time_logs"`);
  }
}
