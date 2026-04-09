# KADSIPA MIS API

Backend API for the **KADSIPA intervention management information system**: programs, beneficiaries, budgets, and disbursements, aligned with the product design for RBAC, finance workflows, data quality, and reporting.

Built with **NestJS** and **TypeORM** on **PostgreSQL**, with **MongoDB** for audit logs and **BullMQ** for email and async report generation.

**What it covers today**

- **Access:** OTP email login, JWT + refresh tokens, password change and first-login activation; **RBAC** with permission-scoped routes and user invite / role assignment.
- **Programs & people:** Interventions and enrollments (including **intervention-specific `customData`** validated against an optional **form schema** derived from CSV headers); beneficiaries with demographics/disability filters; LGA/ward reference data; departments and fiscal years as supporting structure.
- **Finance:** Organizational **budget lines**, **fund requests**, and **disbursements** (including batch flows and tracking against budget lines).
- **Data intake:** **CSV-driven uploads** with a **pending-beneficiary queue**, duplicate NIN handling, approve/reject/link flows; **upload notifications** for history and status.
- **Reporting:** Report jobs (**PDF / Excel**) queued and stored for download.
- **Operations:** Health checks, migrations via TypeORM, structured audit trail.

Roadmap items from the implementation plan still in flight include consolidated **dashboard aggregation** endpoints, broader **CSV exports**, migration hardening, expanded tests, and optional **Neon** deployment paths.

For local development: configure `.env.development`, run migrations (`npm run migration:run`), then `npm run start:dev`.
