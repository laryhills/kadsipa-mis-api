import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceBeneficiaries1775467183019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Gender enum type
    await queryRunner.query(`
      CREATE TYPE "beneficiaries_gender_enum" AS ENUM('Male', 'Female', 'Other')
    `);

    // Update gender column to use enum
    await queryRunner.query(`
      ALTER TABLE "beneficiaries" 
      ALTER COLUMN "gender" TYPE "beneficiaries_gender_enum" 
      USING gender::"beneficiaries_gender_enum"
    `);

    // Drop old disability_status column
    await queryRunner.query(`
      ALTER TABLE "beneficiaries" DROP COLUMN "disability_status"
    `);

    // Add new disability columns
    await queryRunner.query(`
      ALTER TABLE "beneficiaries" ADD COLUMN "has_disability" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "beneficiaries" ADD COLUMN "disability_type" character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove disability columns
    await queryRunner.query(`
      ALTER TABLE "beneficiaries" DROP COLUMN "disability_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "beneficiaries" DROP COLUMN "has_disability"
    `);

    // Restore disability_status
    await queryRunner.query(`
      ALTER TABLE "beneficiaries" ADD COLUMN "disability_status" character varying(100)
    `);

    // Revert gender to varchar
    await queryRunner.query(`
      ALTER TABLE "beneficiaries" 
      ALTER COLUMN "gender" TYPE character varying(50)
    `);

    // Drop gender enum
    await queryRunner.query(`
      DROP TYPE "beneficiaries_gender_enum"
    `);
  }
}
