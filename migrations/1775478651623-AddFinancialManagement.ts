import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinancialManagement1775478651623 implements MigrationInterface {
    name = 'AddFinancialManagement1775478651623'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."budget_lines_category_enum" AS ENUM('Direct Cash Transfers', 'Skills Training Programs', 'Agricultural Support', 'Administrative Costs', 'Healthcare Services', 'Infrastructure Development', 'Emergency Relief', 'Education Programs', 'Other')`);
        await queryRunner.query(`CREATE TABLE "budget_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "category" "public"."budget_lines_category_enum" NOT NULL, "fiscal_year" character varying(20) NOT NULL, "allocated_amount" numeric(15,2) NOT NULL DEFAULT '0', "committed_amount" numeric(15,2) NOT NULL DEFAULT '0', "spent_amount" numeric(15,2) NOT NULL DEFAULT '0', "remaining_amount" numeric(15,2) NOT NULL DEFAULT '0', "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid NOT NULL, CONSTRAINT "PK_4eabf9c9d7c8edc9ad302270c94" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."disbursements_status_enum" AS ENUM('Pending', 'Processing', 'Paid', 'Failed')`);
        await queryRunner.query(`CREATE TABLE "disbursements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "batch_number" character varying(50) NOT NULL, "amount" numeric(15,2) NOT NULL, "status" "public"."disbursements_status_enum" NOT NULL DEFAULT 'Paid', "payment_date" TIMESTAMP, "bank_name" character varying(100), "account_number" character varying(50), "reference_number" character varying(100), "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "intervention_id" uuid NOT NULL, "beneficiary_id" uuid NOT NULL, "budget_line_id" uuid NOT NULL, "approved_by" uuid, "created_by" uuid NOT NULL, CONSTRAINT "PK_2f9ea0e5b8382113aaa3e51cdfa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD CONSTRAINT "FK_211332b2e06301392224b1c75bd" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disbursements" ADD CONSTRAINT "FK_533a3050be5ff27c2b3b724d830" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disbursements" ADD CONSTRAINT "FK_604509cc5e48101569453e298f5" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disbursements" ADD CONSTRAINT "FK_c1151f0f3d3f5f85548eab7d126" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disbursements" ADD CONSTRAINT "FK_81b9d0e19d3d19edca1b19b36b2" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disbursements" ADD CONSTRAINT "FK_11b3d8e0457a5535e274d4d6d03" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disbursements" DROP CONSTRAINT "FK_11b3d8e0457a5535e274d4d6d03"`);
        await queryRunner.query(`ALTER TABLE "disbursements" DROP CONSTRAINT "FK_81b9d0e19d3d19edca1b19b36b2"`);
        await queryRunner.query(`ALTER TABLE "disbursements" DROP CONSTRAINT "FK_c1151f0f3d3f5f85548eab7d126"`);
        await queryRunner.query(`ALTER TABLE "disbursements" DROP CONSTRAINT "FK_604509cc5e48101569453e298f5"`);
        await queryRunner.query(`ALTER TABLE "disbursements" DROP CONSTRAINT "FK_533a3050be5ff27c2b3b724d830"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP CONSTRAINT "FK_211332b2e06301392224b1c75bd"`);
        await queryRunner.query(`DROP TABLE "disbursements"`);
        await queryRunner.query(`DROP TYPE "public"."disbursements_status_enum"`);
        await queryRunner.query(`DROP TABLE "budget_lines"`);
        await queryRunner.query(`DROP TYPE "public"."budget_lines_category_enum"`);
    }

}
