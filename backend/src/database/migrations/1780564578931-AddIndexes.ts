import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1780564578931 implements MigrationInterface {
  name = 'AddIndexes1780564578931';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_438e3c81c9f4209c1348366115" ON "tasks" ("group_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5770b28d72ca90c43b1381bf78" ON "tasks" ("assigned_to") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6086c8dafbae729a930c04d865" ON "tasks" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c16dbc1f4693fc90f1a7f87a9" ON "task_activities" ("task_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON "notifications" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8ba28344602d583583b9ea1a50" ON "notifications" ("isRead") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ba28344602d583583b9ea1a50"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_692a909ee0fa9383e7859f9b40"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6c16dbc1f4693fc90f1a7f87a9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6086c8dafbae729a930c04d865"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5770b28d72ca90c43b1381bf78"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_438e3c81c9f4209c1348366115"`,
    );
  }
}
