import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLgaIdToBeneficiaries1775720000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "beneficiaries"
      ADD COLUMN "lga_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "beneficiaries"
      ADD CONSTRAINT "FK_beneficiaries_lga_id"
      FOREIGN KEY ("lga_id") REFERENCES "lgas"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "beneficiaries" DROP CONSTRAINT "FK_beneficiaries_lga_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "beneficiaries" DROP COLUMN "lga_id"
    `);
  }
}
