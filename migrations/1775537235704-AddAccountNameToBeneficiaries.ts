import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountNameToBeneficiaries1775537235704 implements MigrationInterface {
  name = 'AddAccountNameToBeneficiaries1775537235704';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "beneficiaries" ADD "account_name" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "beneficiaries" DROP COLUMN "account_name"`,
    );
  }
}
