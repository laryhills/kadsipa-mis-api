import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFundRequestTrackingToDisbursements1775541000000 implements MigrationInterface {
  name = 'AddFundRequestTrackingToDisbursements1775541000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add spent_amount column to fund_requests table (tracks disbursements from this fund request)
    await queryRunner.query(
      `ALTER TABLE "fund_requests" ADD "spent_amount" numeric(15,2) NOT NULL DEFAULT 0`,
    );

    // Add fund_request_id column to disbursements table (links disbursement to fund request)
    await queryRunner.query(
      `ALTER TABLE "disbursements" ADD "fund_request_id" uuid`,
    );

    // Add foreign key constraint from disbursements to fund_requests
    await queryRunner.query(
      `ALTER TABLE "disbursements" ADD CONSTRAINT "FK_disbursements_fund_request" 
       FOREIGN KEY ("fund_request_id") REFERENCES "fund_requests"("id") 
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "disbursements" DROP CONSTRAINT IF EXISTS "FK_disbursements_fund_request"`,
    );

    // Drop fund_request_id column from disbursements
    await queryRunner.query(
      `ALTER TABLE "disbursements" DROP COLUMN IF EXISTS "fund_request_id"`,
    );

    // Drop spent_amount column from fund_requests
    await queryRunner.query(
      `ALTER TABLE "fund_requests" DROP COLUMN IF EXISTS "spent_amount"`,
    );
  }
}
