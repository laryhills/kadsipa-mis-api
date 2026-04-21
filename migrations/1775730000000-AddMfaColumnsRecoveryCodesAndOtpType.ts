import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMfaColumnsRecoveryCodesAndOtpType1775730000000 implements MigrationInterface {
  name = 'AddMfaColumnsRecoveryCodesAndOtpType1775730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "mfa_totp_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "mfa_email_backup_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_mfa_recovery_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "code_hash" character varying NOT NULL,
        "used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_4f8b7c1e2a9d3mfa_recovery" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_mfa_recovery_codes_user_id" ON "user_mfa_recovery_codes" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_mfa_recovery_codes" ADD CONSTRAINT "FK_user_mfa_recovery_codes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."otps_type_enum" ADD VALUE IF NOT EXISTS 'mfa_login_email_backup'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_mfa_recovery_codes" DROP CONSTRAINT "FK_user_mfa_recovery_codes_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_mfa_recovery_codes_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "user_mfa_recovery_codes"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "mfa_email_backup_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "mfa_totp_enabled"`,
    );
    // PostgreSQL cannot drop enum labels safely; avoid if rows use mfa_login_email_backup.
  }
}
