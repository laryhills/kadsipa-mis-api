import { MigrationInterface, QueryRunner } from 'typeorm';

export class DashboardQueryIndexes1775700000000 implements MigrationInterface {
  name = 'DashboardQueryIndexes1775700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disbursements_intervention_status"
       ON "disbursements" ("intervention_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disbursements_intervention_paid"
       ON "disbursements" ("intervention_id")
       WHERE "status" = 'Paid'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disbursements_payment_or_created"
       ON "disbursements" ((COALESCE("payment_date", "created_at")) DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_enrollments_created_at"
       ON "intervention_enrollments" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_enrollments_beneficiary_created"
       ON "intervention_enrollments" ("beneficiary_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pending_beneficiaries_status"
       ON "pending_beneficiaries" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_beneficiaries_lga_active"
       ON "beneficiaries" ("lga")
       WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_interventions_deleted_at"
       ON "interventions" ("deleted_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_interventions_deleted_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_beneficiaries_lga_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_pending_beneficiaries_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_enrollments_beneficiary_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_enrollments_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_disbursements_payment_or_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_disbursements_intervention_paid"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_disbursements_intervention_status"`,
    );
  }
}
