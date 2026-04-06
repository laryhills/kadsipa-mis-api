import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1775465460792 implements MigrationInterface {
  name = 'InitialSchema1775465460792';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "states" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe52f02449eaf27be2b2cb7acda" UNIQUE ("name"), CONSTRAINT "PK_09ab30ca0975c02656483265f4f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "full_name" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "mfa_secret" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "last_login_at" TIMESTAMP, "deleted_at" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."beneficiaries_beneficiary_type_enum" AS ENUM('individual', 'household')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."beneficiaries_status_enum" AS ENUM('pending', 'active', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "beneficiaries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nidhh" character varying(12) NOT NULL, "legacy_id" character varying(255) NOT NULL, "beneficiary_type" "public"."beneficiaries_beneficiary_type_enum" NOT NULL, "first_name" character varying(255) NOT NULL, "last_name" character varying(255) NOT NULL, "date_of_birth" date, "gender" character varying(50), "nin" character varying(20) NOT NULL, "bvn" character varying(20), "email" character varying(255), "phone_number" character varying(20), "disability_status" character varying(100), "address" text, "lga" character varying(100), "ward" character varying(100), "community" character varying(255) NOT NULL, "status" "public"."beneficiaries_status_enum" NOT NULL DEFAULT 'pending', "account_number" character varying(10) NOT NULL, "bank" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "deleted_at" TIMESTAMP, CONSTRAINT "UQ_44574cd6e9528706f38cb2a62b2" UNIQUE ("nidhh"), CONSTRAINT "PK_c9356d282dec80f7f12a9eef10a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."intervention_enrollments_status_enum" AS ENUM('pending', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "intervention_enrollments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "intervention_id" uuid NOT NULL, "beneficiary_id" uuid NOT NULL, "enrollment_date" date NOT NULL, "reason_code" character varying(100), "reason_text" text, "status" "public"."intervention_enrollments_status_enum" NOT NULL DEFAULT 'pending', "allocation_amount" numeric(15,2), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, CONSTRAINT "UQ_7583d840fb9e5faf4da4a8ee9d5" UNIQUE ("intervention_id", "beneficiary_id"), CONSTRAINT "PK_ddabda73af8d69c19e7d3ca1ad1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interventions_status_enum" AS ENUM('pending', 'in_progress', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "interventions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "program_code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "program_type" character varying, "budget_allocated" numeric(13,2) NOT NULL, "funding_source" character varying NOT NULL, "status" "public"."interventions_status_enum" NOT NULL DEFAULT 'pending', "start_date" TIMESTAMP NOT NULL, "end_date" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_c5010c47dfdd2f3e1eb15bda01f" UNIQUE ("program_code"), CONSTRAINT "PK_39babe074cbaa90750582bfc38d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lgas" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "state_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e20fcdd997f7da9347e007b5430" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wards" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "lga_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f67afa72e02ac056570c0dde279" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."otps_type_enum" AS ENUM('login', 'password_reset', 'email_verification')`,
    );
    await queryRunner.query(
      `CREATE TABLE "otps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "code" character varying(6) NOT NULL, "type" "public"."otps_type_enum" NOT NULL DEFAULT 'login', "expires_at" TIMESTAMP NOT NULL, "is_used" boolean NOT NULL DEFAULT false, "used_at" TIMESTAMP, "attempts" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_91fef5ed60605b854a2115d2410" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying NOT NULL, "token_family" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "is_revoked" boolean NOT NULL DEFAULT false, "revoked_at" TIMESTAMP, "device_info" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a7838d2ba25be1342091b6695f" ON "refresh_tokens" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_15f92d7eaa218846d89b9edb43" ON "refresh_tokens" ("token_family") `,
    );
    await queryRunner.query(
      `CREATE TABLE "intervention_lgas" ("intervention_id" uuid NOT NULL, "lga_id" integer NOT NULL, CONSTRAINT "PK_4a0d565ceb21ecfdd8ef8df6fe3" PRIMARY KEY ("intervention_id", "lga_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c285eec134b6acd65ea432d467" ON "intervention_lgas" ("intervention_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2bbb871d6c94ed73aea6d481cb" ON "intervention_lgas" ("lga_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "beneficiaries" ADD CONSTRAINT "FK_ef8d9d98813c6c249799ec82bb8" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_enrollments" ADD CONSTRAINT "FK_db2e905b9da894f56e3d9fae208" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_enrollments" ADD CONSTRAINT "FK_d404ab38e842c17b2457baf0351" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_enrollments" ADD CONSTRAINT "FK_633880f421bd945f57b9d2fd667" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lgas" ADD CONSTRAINT "FK_8a6847d87207d9616b9ef6d2089" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wards" ADD CONSTRAINT "FK_a699a9faa0eb04abf06c1923015" FOREIGN KEY ("lga_id") REFERENCES "lgas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "otps" ADD CONSTRAINT "FK_3938bb24b38ad395af30230bded" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_lgas" ADD CONSTRAINT "FK_c285eec134b6acd65ea432d467d" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_lgas" ADD CONSTRAINT "FK_2bbb871d6c94ed73aea6d481cb4" FOREIGN KEY ("lga_id") REFERENCES "lgas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "intervention_lgas" DROP CONSTRAINT "FK_2bbb871d6c94ed73aea6d481cb4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_lgas" DROP CONSTRAINT "FK_c285eec134b6acd65ea432d467d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otps" DROP CONSTRAINT "FK_3938bb24b38ad395af30230bded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wards" DROP CONSTRAINT "FK_a699a9faa0eb04abf06c1923015"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lgas" DROP CONSTRAINT "FK_8a6847d87207d9616b9ef6d2089"`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_enrollments" DROP CONSTRAINT "FK_633880f421bd945f57b9d2fd667"`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_enrollments" DROP CONSTRAINT "FK_d404ab38e842c17b2457baf0351"`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_enrollments" DROP CONSTRAINT "FK_db2e905b9da894f56e3d9fae208"`,
    );
    await queryRunner.query(
      `ALTER TABLE "beneficiaries" DROP CONSTRAINT "FK_ef8d9d98813c6c249799ec82bb8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2bbb871d6c94ed73aea6d481cb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c285eec134b6acd65ea432d467"`,
    );
    await queryRunner.query(`DROP TABLE "intervention_lgas"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_15f92d7eaa218846d89b9edb43"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a7838d2ba25be1342091b6695f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "otps"`);
    await queryRunner.query(`DROP TYPE "public"."otps_type_enum"`);
    await queryRunner.query(`DROP TABLE "wards"`);
    await queryRunner.query(`DROP TABLE "lgas"`);
    await queryRunner.query(`DROP TABLE "interventions"`);
    await queryRunner.query(`DROP TYPE "public"."interventions_status_enum"`);
    await queryRunner.query(`DROP TABLE "intervention_enrollments"`);
    await queryRunner.query(
      `DROP TYPE "public"."intervention_enrollments_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "beneficiaries"`);
    await queryRunner.query(`DROP TYPE "public"."beneficiaries_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."beneficiaries_beneficiary_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "states"`);
  }
}
