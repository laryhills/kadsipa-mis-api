import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportsModule1775659256658 implements MigrationInterface {
  name = 'AddReportsModule1775659256658';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "disbursements" DROP CONSTRAINT "FK_disbursements_fund_request"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_reporttype_enum" AS ENUM('ExecutiveSummary', 'FinancialDisbursement', 'BeneficiaryList', 'BudgetLineReport', 'ImpactAssessment', 'InterventionSummary', 'Custom')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_status_enum" AS ENUM('Draft', 'Processing', 'Finalised', 'Failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_fileformat_enum" AS ENUM('PDF', 'Excel', 'Both')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "referenceNumber" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "intervention_id" uuid, "reportType" "public"."reports_reporttype_enum" NOT NULL DEFAULT 'Custom', "status" "public"."reports_status_enum" NOT NULL DEFAULT 'Draft', "config" jsonb, "startDate" date, "endDate" date, "fileFormat" "public"."reports_fileformat_enum" NOT NULL DEFAULT 'PDF', "pdfUrl" text, "excelUrl" text, "generated_by" uuid NOT NULL, "generatedAt" TIMESTAMP, "errorMessage" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_131e8d9c46c23afc92c3f6aec27" UNIQUE ("referenceNumber"), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "intervention_type" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "intervention_type" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_9d40dc2c3e5ffd22b86c1443839" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_9042e8a886f7f83b1de94fee280" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disbursements" ADD CONSTRAINT "FK_049bb9c44bd7f0949afff680df7" FOREIGN KEY ("fund_request_id") REFERENCES "fund_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "disbursements" DROP CONSTRAINT "FK_049bb9c44bd7f0949afff680df7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_9042e8a886f7f83b1de94fee280"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_9d40dc2c3e5ffd22b86c1443839"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "intervention_type" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "interventions" ALTER COLUMN "intervention_type" DROP NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "public"."reports_fileformat_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_reporttype_enum"`);
    await queryRunner.query(
      `ALTER TABLE "disbursements" ADD CONSTRAINT "FK_disbursements_fund_request" FOREIGN KEY ("fund_request_id") REFERENCES "fund_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
