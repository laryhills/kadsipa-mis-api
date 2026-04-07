import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinancialManagement1775526374709 implements MigrationInterface {
    name = 'AddFinancialManagement1775526374709'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "fiscal_years" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(20) NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f6405bc8981c394b4c37ab660f3" UNIQUE ("name"), CONSTRAINT "PK_0470d6bc5c757d488b7b04e1899" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "departments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "short_code" character varying(20) NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8681da666ad9699d568b3e91064" UNIQUE ("name"), CONSTRAINT "UQ_858050cf41c47473f0e072a2cf8" UNIQUE ("short_code"), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."fund_requests_status_enum" AS ENUM('Pending', 'Approved', 'Rejected', 'Released')`);
        await queryRunner.query(`CREATE TABLE "fund_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "requested_amount" numeric(15,2) NOT NULL, "approved_amount" numeric(15,2), "status" "public"."fund_requests_status_enum" NOT NULL DEFAULT 'Pending', "justification" text NOT NULL, "supporting_documents" jsonb, "approved_at" TIMESTAMP, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "budget_line_id" uuid NOT NULL, "intervention_id" uuid, "requested_by" uuid NOT NULL, "approved_by" uuid, CONSTRAINT "PK_7c8940af87200d337b0ba202bc8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP COLUMN "fiscal_year"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP COLUMN "description"`);
        await queryRunner.query(`CREATE TYPE "public"."budget_lines_budgettype_enum" AS ENUM('Capital', 'Recurrent')`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD "budgetType" "public"."budget_lines_budgettype_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD "account_code" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD "start_date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD "end_date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD "justification" text`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD "fiscal_year_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD "department_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD "budget_received" numeric(15,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD "budget_spent" numeric(15,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD "budget_line_id" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."budget_lines_category_enum" RENAME TO "budget_lines_category_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."budget_lines_category_enum" AS ENUM('Direct Cash Transfers', 'Skills Training Programs', 'Agricultural Support', 'Administrative Costs', 'Healthcare Services', 'Infrastructure Development', 'Emergency Relief', 'Education Programs', 'Logistics & Operations', 'Monitoring & Evaluation', 'Office Supplies', 'Other')`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ALTER COLUMN "category" TYPE "public"."budget_lines_category_enum" USING "category"::"text"::"public"."budget_lines_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."budget_lines_category_enum_old"`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "budget_allocated" TYPE numeric(15,2)`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "budget_allocated" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TYPE "public"."budget_lines_category_enum" RENAME TO "budget_lines_category_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."budget_lines_category_enum" AS ENUM('Direct Cash Transfers', 'Skills Training Programs', 'Agricultural Support', 'Administrative Costs', 'Healthcare Services', 'Infrastructure Development', 'Emergency Relief', 'Education Programs', 'Logistics & Operations', 'Monitoring & Evaluation', 'Office Supplies', 'Other')`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ALTER COLUMN "category" TYPE "public"."budget_lines_category_enum" USING "category"::"text"::"public"."budget_lines_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."budget_lines_category_enum_old"`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "budget_allocated" TYPE numeric(15,2)`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "budget_allocated" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "fund_requests" ADD CONSTRAINT "FK_fc4dc763fbc750125cd5c5059fe" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fund_requests" ADD CONSTRAINT "FK_4bbe2b63ff7b73b563e1551ba6f" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fund_requests" ADD CONSTRAINT "FK_a331039f2549c262eb8bea8afc1" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fund_requests" ADD CONSTRAINT "FK_e52400cfb78d6f2ea9ea0cc11a8" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD CONSTRAINT "FK_0450226fefb15de682e5fbfa8d9" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD CONSTRAINT "FK_641e8bc624e01195960f9c664a8" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_d9a057b2b51b3c88a2941d765bc" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_d9a057b2b51b3c88a2941d765bc"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP CONSTRAINT "FK_641e8bc624e01195960f9c664a8"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP CONSTRAINT "FK_0450226fefb15de682e5fbfa8d9"`);
        await queryRunner.query(`ALTER TABLE "fund_requests" DROP CONSTRAINT "FK_e52400cfb78d6f2ea9ea0cc11a8"`);
        await queryRunner.query(`ALTER TABLE "fund_requests" DROP CONSTRAINT "FK_a331039f2549c262eb8bea8afc1"`);
        await queryRunner.query(`ALTER TABLE "fund_requests" DROP CONSTRAINT "FK_4bbe2b63ff7b73b563e1551ba6f"`);
        await queryRunner.query(`ALTER TABLE "fund_requests" DROP CONSTRAINT "FK_fc4dc763fbc750125cd5c5059fe"`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "budget_allocated" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "budget_allocated" TYPE numeric(13,2)`);
        await queryRunner.query(`CREATE TYPE "public"."budget_lines_category_enum_old" AS ENUM('Direct Cash Transfers', 'Skills Training Programs', 'Agricultural Support', 'Administrative Costs', 'Healthcare Services', 'Infrastructure Development', 'Emergency Relief', 'Education Programs', 'Other')`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ALTER COLUMN "category" TYPE "public"."budget_lines_category_enum_old" USING "category"::"text"::"public"."budget_lines_category_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."budget_lines_category_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."budget_lines_category_enum_old" RENAME TO "budget_lines_category_enum"`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "budget_allocated" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "budget_allocated" TYPE numeric(13,2)`);
        await queryRunner.query(`CREATE TYPE "public"."budget_lines_category_enum_old" AS ENUM('Direct Cash Transfers', 'Skills Training Programs', 'Agricultural Support', 'Administrative Costs', 'Healthcare Services', 'Infrastructure Development', 'Emergency Relief', 'Education Programs', 'Other')`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ALTER COLUMN "category" TYPE "public"."budget_lines_category_enum_old" USING "category"::"text"::"public"."budget_lines_category_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."budget_lines_category_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."budget_lines_category_enum_old" RENAME TO "budget_lines_category_enum"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP COLUMN "budget_line_id"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP COLUMN "budget_spent"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP COLUMN "budget_received"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP COLUMN "department_id"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP COLUMN "fiscal_year_id"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP COLUMN "justification"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP COLUMN "end_date"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP COLUMN "start_date"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP COLUMN "account_code"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP COLUMN "budgetType"`);
        await queryRunner.query(`DROP TYPE "public"."budget_lines_budgettype_enum"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD "fiscal_year" character varying(20) NOT NULL`);
        await queryRunner.query(`DROP TABLE "fund_requests"`);
        await queryRunner.query(`DROP TYPE "public"."fund_requests_status_enum"`);
        await queryRunner.query(`DROP TABLE "departments"`);
        await queryRunner.query(`DROP TABLE "fiscal_years"`);
    }

}
