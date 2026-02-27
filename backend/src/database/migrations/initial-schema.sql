-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "email" character varying NOT NULL,
  "password" character varying NOT NULL,
  "name" character varying NOT NULL,
  "skills" jsonb,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_users_email" UNIQUE ("email"),
  CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
);

-- Create groups table
CREATE TABLE IF NOT EXISTS "groups" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" text,
  "owner_id" uuid NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_groups_id" PRIMARY KEY ("id")
);

-- Create enums
DO $$ BEGIN
  CREATE TYPE "user_groups_role_enum" AS ENUM('admin', 'member', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "tasks_status_enum" AS ENUM('todo', 'in_progress', 'review', 'done', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "tasks_priority_enum" AS ENUM('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_groups table
CREATE TABLE IF NOT EXISTS "user_groups" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "role" "user_groups_role_enum" NOT NULL DEFAULT 'member',
  "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_user_groups_id" PRIMARY KEY ("id")
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS "tasks" (
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
);

-- Add foreign keys
ALTER TABLE "groups" 
DROP CONSTRAINT IF EXISTS "FK_groups_owner_id";

ALTER TABLE "groups" 
ADD CONSTRAINT "FK_groups_owner_id" 
FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "user_groups" 
DROP CONSTRAINT IF EXISTS "FK_user_groups_user_id";

ALTER TABLE "user_groups" 
ADD CONSTRAINT "FK_user_groups_user_id" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "user_groups" 
DROP CONSTRAINT IF EXISTS "FK_user_groups_group_id";

ALTER TABLE "user_groups" 
ADD CONSTRAINT "FK_user_groups_group_id" 
FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;

ALTER TABLE "tasks" 
DROP CONSTRAINT IF EXISTS "FK_tasks_group_id";

ALTER TABLE "tasks" 
ADD CONSTRAINT "FK_tasks_group_id" 
FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;

ALTER TABLE "tasks" 
DROP CONSTRAINT IF EXISTS "FK_tasks_assigned_to";

ALTER TABLE "tasks" 
ADD CONSTRAINT "FK_tasks_assigned_to" 
FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "tasks" 
DROP CONSTRAINT IF EXISTS "FK_tasks_created_by";

ALTER TABLE "tasks" 
ADD CONSTRAINT "FK_tasks_created_by" 
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "IDX_groups_owner_id" ON "groups" ("owner_id");
CREATE INDEX IF NOT EXISTS "IDX_user_groups_user_id" ON "user_groups" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_user_groups_group_id" ON "user_groups" ("group_id");
CREATE INDEX IF NOT EXISTS "IDX_tasks_group_id" ON "tasks" ("group_id");
CREATE INDEX IF NOT EXISTS "IDX_tasks_assigned_to" ON "tasks" ("assigned_to");
CREATE INDEX IF NOT EXISTS "IDX_tasks_created_by" ON "tasks" ("created_by");
CREATE INDEX IF NOT EXISTS "IDX_tasks_status" ON "tasks" ("status");
CREATE INDEX IF NOT EXISTS "IDX_tasks_priority" ON "tasks" ("priority");
