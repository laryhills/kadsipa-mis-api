import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultDepartments1775526400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO departments (id, name, short_code, description, is_active, created_at, updated_at)
      VALUES
        (uuid_generate_v4(), 'Operations', 'OPS', 'Operations and field activities', true, NOW(), NOW()),
        (uuid_generate_v4(), 'Monitoring and Evaluation', 'M&E', 'Monitoring, evaluation, and impact assessment', true, NOW(), NOW()),
        (uuid_generate_v4(), 'Logistics', 'LOG', 'Logistics and supply chain management', true, NOW(), NOW()),
        (uuid_generate_v4(), 'Office Supplies', 'OFF', 'Office supplies and administrative support', true, NOW(), NOW())
      ON CONFLICT (short_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM departments
      WHERE short_code IN ('OPS', 'M&E', 'LOG', 'OFF');
    `);
  }
}
