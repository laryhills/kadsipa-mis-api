import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocalGovernmentFundingSourceEnum1775710000000 implements MigrationInterface {
  name = 'AddLocalGovernmentFundingSourceEnum1775710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."interventions_funding_source_enum" ADD VALUE IF NOT EXISTS 'Local Government'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL cannot drop enum labels safely; avoid if rows use this value.
  }
}
