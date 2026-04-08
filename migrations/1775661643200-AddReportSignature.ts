import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportSignature1775661643200 implements MigrationInterface {
  name = 'AddReportSignature1775661643200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reports" ADD "signature" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "signature"`);
  }
}
