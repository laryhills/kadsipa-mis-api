import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeLegacyIdNullable1775536540939 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make legacy_id nullable for beneficiaries created from CSV uploads
    await queryRunner.query(`
            ALTER TABLE "beneficiaries" 
            ALTER COLUMN "legacy_id" DROP NOT NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: Make legacy_id NOT NULL again
    await queryRunner.query(`
            ALTER TABLE "beneficiaries" 
            ALTER COLUMN "legacy_id" SET NOT NULL;
        `);
  }
}
