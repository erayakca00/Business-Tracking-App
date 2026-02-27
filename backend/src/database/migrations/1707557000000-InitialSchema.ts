import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1707557000000 implements MigrationInterface {
    name = 'InitialSchema1707557000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create users table
        await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "name" character varying NOT NULL,
        "skills" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

        // Create groups table
        await queryRunner.query(`
      CREATE TABLE "groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "owner_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_groups_id" PRIMARY KEY ("id")
      )
    `);

        // Create user_groups table
        await queryRunner.query(`
      CREATE TYPE "user_groups_role_enum" AS ENUM('admin', 'member', 'viewer')
    `);

        await queryRunner.query(`
      CREATE TABLE "user_groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        "role" "user_groups_role_enum" NOT NULL DEFAULT 'member',
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_groups_id" PRIMARY KEY ("id")
      )
    `);

        // Create tasks table
        await queryRunner.query(`
      CREATE TYPE "tasks_status_enum" AS ENUM('todo', 'in_progress', 'review', 'done', 'blocked')
    `);

        await queryRunner.query(`
      CREATE TYPE "tasks_priority_enum" AS ENUM('low', 'medium', 'high')
    `);

        await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "group_id" uuid NOT NULL,
        "assigned_to" uuid,
        "created_by" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "status" "tasks_status_enum" NOT NULL DEFAULT 'todo',
        "priority" "tasks_priority_enum" NOT NULL DEFAULT 'medium',
        "deadline" TIMESTAMP,
        "estimated_hours" integer,
        "required_skills" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id")
      )
    `);

        // Add foreign keys
        await queryRunner.query(`
      ALTER TABLE "groups" 
      ADD CONSTRAINT "FK_groups_owner_id" 
      FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "user_groups" 
      ADD CONSTRAINT "FK_user_groups_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "user_groups" 
      ADD CONSTRAINT "FK_user_groups_group_id" 
      FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD CONSTRAINT "FK_tasks_group_id" 
      FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD CONSTRAINT "FK_tasks_assigned_to" 
      FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD CONSTRAINT "FK_tasks_created_by" 
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_groups_owner_id" ON "groups" ("owner_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_groups_user_id" ON "user_groups" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_groups_group_id" ON "user_groups" ("group_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_group_id" ON "tasks" ("group_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_assigned_to" ON "tasks" ("assigned_to")`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_created_by" ON "tasks" ("created_by")`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_status" ON "tasks" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_priority" ON "tasks" ("priority")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_tasks_priority"`);
        await queryRunner.query(`DROP INDEX "IDX_tasks_status"`);
        await queryRunner.query(`DROP INDEX "IDX_tasks_created_by"`);
        await queryRunner.query(`DROP INDEX "IDX_tasks_assigned_to"`);
        await queryRunner.query(`DROP INDEX "IDX_tasks_group_id"`);
        await queryRunner.query(`DROP INDEX "IDX_user_groups_group_id"`);
        await queryRunner.query(`DROP INDEX "IDX_user_groups_user_id"`);
        await queryRunner.query(`DROP INDEX "IDX_groups_owner_id"`);
        await queryRunner.query(`DROP INDEX "IDX_users_email"`);

        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_created_by"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_assigned_to"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_group_id"`);
        await queryRunner.query(`ALTER TABLE "user_groups" DROP CONSTRAINT "FK_user_groups_group_id"`);
        await queryRunner.query(`ALTER TABLE "user_groups" DROP CONSTRAINT "FK_user_groups_user_id"`);
        await queryRunner.query(`ALTER TABLE "groups" DROP CONSTRAINT "FK_groups_owner_id"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "tasks_priority_enum"`);
        await queryRunner.query(`DROP TYPE "tasks_status_enum"`);
        await queryRunner.query(`DROP TABLE "user_groups"`);
        await queryRunner.query(`DROP TYPE "user_groups_role_enum"`);
        await queryRunner.query(`DROP TABLE "groups"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
