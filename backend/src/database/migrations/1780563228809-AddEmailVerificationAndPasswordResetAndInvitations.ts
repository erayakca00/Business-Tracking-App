import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationAndPasswordResetAndInvitations1780563228809 implements MigrationInterface {
  name = 'AddEmailVerificationAndPasswordResetAndInvitations1780563228809';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."invitations_status_enum" AS ENUM('pending', 'accepted', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "group_id" uuid NOT NULL, "token" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "invited_by_id" uuid, "status" "public"."invitations_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e577dcf9bb6d084373ed3998509" UNIQUE ("token"), CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "verification_token" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_token" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_token_expiry" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_06b302ebb4ecf4725f6278cdf42" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_d4de0403dd012cf87b430af70ef" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_d4de0403dd012cf87b430af70ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_06b302ebb4ecf4725f6278cdf42"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "reset_token_expiry"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_token"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "verification_token"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_verified"`);
    await queryRunner.query(`DROP TABLE "invitations"`);
    await queryRunner.query(`DROP TYPE "public"."invitations_status_enum"`);
  }
}
