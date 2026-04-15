import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceInterventionsAndDataReview1775530360981 implements MigrationInterface {
  name = 'EnhanceInterventionsAndDataReview1775530360981';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."upload_notifications_type_enum" AS ENUM('UploadStarted', 'UploadCompleted', 'UploadFailed', 'RecordsApproved', 'RecordsRejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."upload_notifications_status_enum" AS ENUM('Unread', 'Read')`,
    );
    await queryRunner.query(
      `CREATE TABLE "upload_notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "intervention_id" uuid NOT NULL, "type" "public"."upload_notifications_type_enum" NOT NULL, "title" character varying(200) NOT NULL, "message" text NOT NULL, "metadata" jsonb, "source_file" character varying(500), "status" "public"."upload_notifications_status_enum" NOT NULL DEFAULT 'Unread', "created_by" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f550f510ecd14b752a48dc3e835" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pending_beneficiaries_source_type_enum" AS ENUM('BulkUpload', 'MobileSync', 'ManualEntry')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pending_beneficiaries_status_enum" AS ENUM('PendingReview', 'Approved', 'Rejected', 'Duplicate')`,
    );
    await queryRunner.query(
      `CREATE TABLE "pending_beneficiaries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source_type" "public"."pending_beneficiaries_source_type_enum" NOT NULL, "source_reference" character varying(500) NOT NULL, "core_data" jsonb NOT NULL, "custom_data" jsonb, "validation_errors" jsonb NOT NULL DEFAULT '[]', "status" "public"."pending_beneficiaries_status_enum" NOT NULL DEFAULT 'PendingReview', "reviewed_by" uuid, "reviewed_at" TIMESTAMP, "review_notes" text, "approved_beneficiary_id" character varying, "approved_enrollment_id" character varying, "duplicate_of_beneficiary_id" character varying, "intervention_id" uuid NOT NULL, "uploaded_by" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_82f975bf7af45752c9b01e97d3e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_enrollments" ADD "custom_data" jsonb`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interventions_intervention_type_enum" AS ENUM('Cash Transfer', 'Food Aid', 'Skills Training', 'Healthcare Support', 'Education Support', 'Agricultural', 'Infrastructure', 'Other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ADD "intervention_type" "public"."interventions_intervention_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interventions_report_frequency_enum" AS ENUM('Weekly', 'Monthly', 'Quarterly', 'Annually')`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ADD "report_frequency" "public"."interventions_report_frequency_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ADD "form_schema" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" DROP COLUMN "funding_source"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interventions_funding_source_enum" AS ENUM('Federal', 'State Government', 'NGO', 'International Donor', 'Private Sector')`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ADD "funding_source" "public"."interventions_funding_source_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."interventions_status_enum" RENAME TO "interventions_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interventions_status_enum" AS ENUM('draft', 'active', 'completed', 'suspended')`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" TYPE "public"."interventions_status_enum" USING "status"::"text"::"public"."interventions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."interventions_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."interventions_status_enum" RENAME TO "interventions_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interventions_status_enum" AS ENUM('draft', 'active', 'completed', 'suspended')`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" TYPE "public"."interventions_status_enum" USING "status"::"text"::"public"."interventions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."interventions_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "upload_notifications" ADD CONSTRAINT "FK_ebfc721649352c36546e4e95c5a" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "upload_notifications" ADD CONSTRAINT "FK_167697cfd3fd16f23a8da73d888" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pending_beneficiaries" ADD CONSTRAINT "FK_df017f8297956041a192476d8bb" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pending_beneficiaries" ADD CONSTRAINT "FK_d5af38b89cf067df288cf884b62" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pending_beneficiaries" ADD CONSTRAINT "FK_d1fd99a1513309f1eebcf8495d0" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pending_beneficiaries" DROP CONSTRAINT "FK_d1fd99a1513309f1eebcf8495d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pending_beneficiaries" DROP CONSTRAINT "FK_d5af38b89cf067df288cf884b62"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pending_beneficiaries" DROP CONSTRAINT "FK_df017f8297956041a192476d8bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "upload_notifications" DROP CONSTRAINT "FK_167697cfd3fd16f23a8da73d888"`,
    );
    await queryRunner.query(
      `ALTER TABLE "upload_notifications" DROP CONSTRAINT "FK_ebfc721649352c36546e4e95c5a"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interventions_status_enum_old" AS ENUM('pending', 'in_progress', 'completed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" TYPE "public"."interventions_status_enum_old" USING "status"::"text"::"public"."interventions_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."interventions_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."interventions_status_enum_old" RENAME TO "interventions_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interventions_status_enum_old" AS ENUM('pending', 'in_progress', 'completed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" TYPE "public"."interventions_status_enum_old" USING "status"::"text"::"public"."interventions_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."interventions_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."interventions_status_enum_old" RENAME TO "interventions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" DROP COLUMN "funding_source"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."interventions_funding_source_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ADD "funding_source" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" DROP COLUMN "form_schema"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" DROP COLUMN "report_frequency"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."interventions_report_frequency_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" DROP COLUMN "intervention_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."interventions_intervention_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "intervention_enrollments" DROP COLUMN "custom_data"`,
    );
    await queryRunner.query(`DROP TABLE "pending_beneficiaries"`);
    await queryRunner.query(
      `DROP TYPE "public"."pending_beneficiaries_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."pending_beneficiaries_source_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "upload_notifications"`);
    await queryRunner.query(
      `DROP TYPE "public"."upload_notifications_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."upload_notifications_type_enum"`,
    );
  }
}
