import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultRoles1775466934175 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const roles = [
      {
        name: 'Super Admin',
        description: 'System Owner - Full system access',
        isSystem: true,
        isActive: true,
        permissions: {
          userManagement: {
            viewUsers: true,
            manageRoles: true,
          },
          financialManagement: {
            approveDisbursements: true,
            viewBudget: true,
            manageBudget: true,
          },
          interventions: {
            createIntervention: true,
            manageBeneficiaries: true,
            viewInterventions: true,
            editIntervention: true,
          },
          reports: {
            viewReports: true,
            generateReports: true,
            deleteReports: true,
          },
          dataReview: {
            reviewPendingData: true,
            approveBeneficiaries: true,
            rejectBeneficiaries: true,
          },
          auditLogs: {
            viewAuditLogs: true,
          },
        },
      },
      {
        name: 'Intervention Manager',
        description: 'Programs - Manage interventions and beneficiaries',
        isSystem: true,
        isActive: true,
        permissions: {
          userManagement: {
            viewUsers: false,
            manageRoles: false,
          },
          financialManagement: {
            approveDisbursements: false,
            viewBudget: false,
            manageBudget: false,
          },
          interventions: {
            createIntervention: true,
            manageBeneficiaries: true,
            viewInterventions: true,
            editIntervention: true,
          },
          reports: {
            viewReports: true,
            generateReports: true,
            deleteReports: false,
          },
          dataReview: {
            reviewPendingData: true,
            approveBeneficiaries: true,
            rejectBeneficiaries: true,
          },
          auditLogs: {
            viewAuditLogs: false,
          },
        },
      },
      {
        name: 'Finance Officer',
        description: 'Accounting - Manage budgets and approve disbursements',
        isSystem: true,
        isActive: true,
        permissions: {
          userManagement: {
            viewUsers: false,
            manageRoles: false,
          },
          financialManagement: {
            approveDisbursements: true,
            viewBudget: true,
            manageBudget: true,
          },
          interventions: {
            createIntervention: false,
            manageBeneficiaries: false,
            viewInterventions: true,
            editIntervention: false,
          },
          reports: {
            viewReports: true,
            generateReports: true,
            deleteReports: false,
          },
          dataReview: {
            reviewPendingData: false,
            approveBeneficiaries: false,
            rejectBeneficiaries: false,
          },
          auditLogs: {
            viewAuditLogs: false,
          },
        },
      },
      {
        name: 'M&E Officer',
        description: 'Analytics - Monitor and evaluate program effectiveness',
        isSystem: true,
        isActive: true,
        permissions: {
          userManagement: {
            viewUsers: false,
            manageRoles: false,
          },
          financialManagement: {
            approveDisbursements: false,
            viewBudget: false,
            manageBudget: false,
          },
          interventions: {
            createIntervention: false,
            manageBeneficiaries: true,
            viewInterventions: true,
            editIntervention: false,
          },
          reports: {
            viewReports: true,
            generateReports: true,
            deleteReports: false,
          },
          dataReview: {
            reviewPendingData: true,
            approveBeneficiaries: false,
            rejectBeneficiaries: false,
          },
          auditLogs: {
            viewAuditLogs: false,
          },
        },
      },
    ];

    for (const role of roles) {
      await queryRunner.query(
        `
        INSERT INTO roles (name, description, permissions, is_active, is_system, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `,
        [
          role.name,
          role.description,
          JSON.stringify(role.permissions),
          role.isActive,
          role.isSystem,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM roles WHERE name IN ('Super Admin', 'Intervention Manager', 'Finance Officer', 'M&E Officer')`,
    );
  }
}
