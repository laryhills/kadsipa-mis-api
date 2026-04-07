import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveBudgetLineFromIntervention1775531400000 implements MigrationInterface {
  name = 'RemoveBudgetLineFromIntervention1775531400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove budget_line_id foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "interventions" DROP CONSTRAINT IF EXISTS "FK_d9a057b2b51b3c88a2941d765bc"`,
    );

    // Remove budget_line_id column
    await queryRunner.query(
      `ALTER TABLE "interventions" DROP COLUMN IF EXISTS "budget_line_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add budget_line_id column
    await queryRunner.query(
      `ALTER TABLE "interventions" ADD "budget_line_id" uuid`,
    );

    // Re-add foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "interventions" ADD CONSTRAINT "FK_d9a057b2b51b3c88a2941d765bc" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
