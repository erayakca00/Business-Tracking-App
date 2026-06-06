import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSprintSnapshots1780565225846 implements MigrationInterface {
  name = 'AddSprintSnapshots1780565225846';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sprint_snapshots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sprint_id" uuid NOT NULL, "date" date NOT NULL, "total_tasks" integer NOT NULL, "completed_tasks" integer NOT NULL, "total_effort" integer NOT NULL DEFAULT '0', "completed_effort" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b2827bca13827a4b7bb19e8006b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_dede3909dba7e1772dc4ba0ffb" ON "sprint_snapshots" ("sprint_id", "date") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sprint_snapshots" ADD CONSTRAINT "FK_437f672af75c555268cb5f11c78" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sprint_snapshots" DROP CONSTRAINT "FK_437f672af75c555268cb5f11c78"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dede3909dba7e1772dc4ba0ffb"`,
    );
    await queryRunner.query(`DROP TABLE "sprint_snapshots"`);
  }
}
