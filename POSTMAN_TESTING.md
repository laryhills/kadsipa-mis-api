# KADSIPA MIS API Testing Guide

## Table of Contents

- [Phase 1: RBAC & Security](#phase-1-testing---rbac--security)
- [Phase 2: Financial Management](#phase-2-testing---financial-management)
- [Phase 3: Budget Lines](#phase-3-testing---budget-lines)
- [Phase 4: Fund Requests](#phase-4-testing---fund-requests)
- [Phase 5: Disbursements](#phase-5-testing---disbursements)

---

# Phase 1 Testing - RBAC & Security

## Quick Test Steps

### 1. Start Server

```bash
npm run start:dev
```

### 2. Get Access Token

Login to get your `accessToken` (save this in Postman environment variable)

### 3. Test Roles API

**Get All Roles** (4 seeded roles should appear):

```http
GET http://localhost:3000/api/roles
Authorization: Bearer {{accessToken}}
```

Expected: Super Admin, Intervention Manager, Finance Officer, M&E Officer

**Get Super Admin Role ID** (from response above, save for next step)

### 4. Assign Super Admin Role

```http
POST http://localhost:3000/api/users/{{userId}}/roles
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "roleId": "{{superAdminRoleId}}"
}
```

### 5. Security Tests

**❌ Test Self-Assignment Prevention:**

```http
POST http://localhost:3000/api/users/{{your-own-id}}/roles
Authorization: Bearer {{accessToken}}

{
  "roleId": "{{someRoleId}}"
}
```

Expected Error: "Users cannot assign roles to themselves"

**✅ Test Permission-Based Access:**

```http
POST http://localhost:3000/api/roles
Authorization: Bearer {{accessToken}}

{
  "name": "Custom Role",
  "description": "Test role",
  "permissions": {
    "userManagement": { "viewUsers": true, "manageRoles": false },
    "financialManagement": { "approveDisbursements": false, "viewBudget": true, "manageBudget": false },
    "interventions": { "createIntervention": true, "manageBeneficiaries": true, "viewInterventions": true, "editIntervention": true },
    "reports": { "viewReports": true, "generateReports": true, "deleteReports": false },
    "dataReview": { "reviewPendingData": true, "approveBeneficiaries": true, "rejectBeneficiaries": true },
    "auditLogs": { "viewAuditLogs": false }
  },
  "isActive": true
}
```

Should only work with Super Admin role (manageRoles permission)

**✅ Test Permission Modification:**

```http
PATCH http://localhost:3000/api/roles/{{roleId}}/permissions
Authorization: Bearer {{accessToken}}

{
  "permissions": {
    "userManagement": { "viewUsers": true, "manageRoles": false },
    "financialManagement": { "approveDisbursements": true, "viewBudget": true, "manageBudget": true },
    "interventions": { "createIntervention": true, "manageBeneficiaries": true, "viewInterventions": true, "editIntervention": true },
    "reports": { "viewReports": true, "generateReports": true, "deleteReports": false },
    "dataReview": { "reviewPendingData": true, "approveBeneficiaries": true, "rejectBeneficiaries": true },
    "auditLogs": { "viewAuditLogs": false }
  }
}
```

Only Super Admin can modify permissions

**❌ Test Non-Admin Access to User Management:**

Verify that Intervention Manager, Finance Officer, and M&E Officer **cannot** access user management:

```http
GET http://localhost:3000/api/users
Authorization: Bearer {{interventionManagerToken}}
```

**Expected Error (403):**

```json
{
  "success": false,
  "statusCode": 403,
  "message": "Forbidden: Required permission: userManagement.viewUsers"
}
```

Same error should occur for:

- `GET /users/:id` - View single user
- `POST /users` - Create user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `POST /users/invite` - Invite user (requires manageRoles)
- `POST /users/:id/roles` - Assign role (requires manageRoles)
- `GET /roles` - View roles (requires viewUsers)
- `POST /roles` - Create role (requires manageRoles)

### 6. Test Admin Invite User & First Login Flow

**Step 1: Invite New User (Super Admin only)**

```http
POST http://localhost:3000/api/users/invite
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "email": "newuser@kdsg.gov.ng",
  "full_name": "Jane Doe",
  "roleIds": ["{{interventionManagerRoleId}}"]
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "User invited successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "newuser@kdsg.gov.ng",
      "full_name": "Jane Doe",
      "status": "pending",
      "created_at": "2026-04-06T..."
    },
    "temporaryPassword": "Xy9kL2mN8pQ4rT"
  }
}
```

**Step 2: New User First Login (with temporary password)**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "newuser@kdsg.gov.ng",
  "password": "Xy9kL2mN8pQ4rT"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "OTP sent successfully to your email [123456]",
  "data": {
    "email": "newuser@kdsg.gov.ng",
    "expiresIn": "10 minutes",
    "attemptsRemaining": 4
  }
}
```

**Step 3: Verify OTP**

```http
POST http://localhost:3000/api/auth/verify-otp
Content-Type: application/json

{
  "email": "newuser@kdsg.gov.ng",
  "code": "123456"
}
```

**Expected Response (with requirePasswordChange flag, roles, and permissions):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "uuid",
    "email": "newuser@kdsg.gov.ng",
    "full_name": "Jane Doe",
    "status": "pending",
    "requirePasswordChange": true,
    "roles": [
      {
        "id": "role-uuid",
        "name": "Intervention Manager",
        "permissions": {
          "userManagement": { "viewUsers": false, "manageRoles": false },
          "financialManagement": {
            "approveDisbursements": false,
            "viewBudget": true,
            "manageBudget": false
          },
          "interventions": {
            "createIntervention": true,
            "manageBeneficiaries": true,
            "viewInterventions": true,
            "editIntervention": true
          },
          "reports": {
            "viewReports": true,
            "generateReports": true,
            "deleteReports": false
          },
          "dataReview": {
            "reviewPendingData": true,
            "approveBeneficiaries": true,
            "rejectBeneficiaries": true
          },
          "auditLogs": { "viewAuditLogs": false }
        }
      }
    ],
    "permissions": {
      "userManagement": { "viewUsers": false, "manageRoles": false },
      "financialManagement": {
        "approveDisbursements": false,
        "viewBudget": true,
        "manageBudget": false
      },
      "interventions": {
        "createIntervention": true,
        "manageBeneficiaries": true,
        "viewInterventions": true,
        "editIntervention": true
      },
      "reports": {
        "viewReports": true,
        "generateReports": true,
        "deleteReports": false
      },
      "dataReview": {
        "reviewPendingData": true,
        "approveBeneficiaries": true,
        "rejectBeneficiaries": true
      },
      "auditLogs": { "viewAuditLogs": false }
    },
    "accessToken": "jwt-token...",
    "refreshToken": "refresh-token..."
  }
}
```

**Step 4: Change Password (Required for PENDING users)**

```http
POST http://localhost:3000/api/auth/change-password
Authorization: Bearer {{newUserAccessToken}}
Content-Type: application/json

{
  "currentPassword": "Xy9kL2mN8pQ4rT",
  "newPassword": "NewSecure@Pass123"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Password changed successfully. You can now login with your new password.",
  "data": null
}
```

**Step 5: Login with New Password**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "newuser@kdsg.gov.ng",
  "password": "NewSecure@Pass123"
}
```

**Expected:** User status is now `active`, `requirePasswordChange: false`

**Step 6: Get Current User Profile**

```http
GET http://localhost:3000/api/auth/me
Authorization: Bearer {{accessToken}}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "User profile fetched successfully",
  "data": {
    "id": "uuid",
    "email": "newuser@kdsg.gov.ng",
    "full_name": "Jane Doe",
    "status": "active",
    "roles": [
      {
        "id": "role-uuid",
        "name": "Intervention Manager",
        "permissions": { ... }
      }
    ],
    "allPermissions": {
      "userManagement": { "viewUsers": false, "manageRoles": false },
      "financialManagement": { "approveDisbursements": false, "viewBudget": true, "manageBudget": false },
      "interventions": { "createIntervention": true, "manageBeneficiaries": true, "viewInterventions": true, "editIntervention": true },
      "reports": { "viewReports": true, "generateReports": true, "deleteReports": false },
      "dataReview": { "reviewPendingData": true, "approveBeneficiaries": true, "rejectBeneficiaries": true },
      "auditLogs": { "viewAuditLogs": false }
    }
  }
}
```

**Notes:**

- Only Super Admin can invite users
- User is created with status `pending`
- Temporary password is returned (admin shares with user)
- User can login with temporary password and will receive `requirePasswordChange: true`
- After password change, status automatically changes to `active`
- New password must:
  - Be at least 8 characters
  - Contain uppercase, lowercase, number, special character
  - Be different from temporary password
- Email domain must be `@kdsg.gov.ng`

### 7. Test Beneficiary New Fields

```http
POST http://localhost:3000/api/beneficiaries
Authorization: Bearer {{accessToken}}

{
  "nidhh": "123456789012",
  "legacy_id": "LEG-001",
  "beneficiary_type": "individual",
  "first_name": "Victoria",
  "last_name": "Kumatu",
  "gender": "Female",
  "hasDisability": true,
  "disabilityType": "Visual",
  "nin": "12345678901234567890",
  "phone_number": "08012345678",
  "account_number": "1234567890",
  "bank": "Access Bank",
  "community": "Test Community"
}
```

## Permission Matrix

| Role             | View Users | Manage Roles | Create Role | Modify Permissions | Assign Roles | Invite Users |
| ---------------- | ---------- | ------------ | ----------- | ------------------ | ------------ | ------------ |
| Super Admin      | ✅         | ✅           | ✅          | ✅                 | ✅           | ✅           |
| Intervention Mgr | ❌         | ❌           | ❌          | ❌                 | ❌           | ❌           |
| Finance Officer  | ❌         | ❌           | ❌          | ❌                 | ❌           | ❌           |
| M&E Officer      | ❌         | ❌           | ❌          | ❌                 | ❌           | ❌           |

**User Management Access:**

- Only **Super Admin** can view, create, update, delete users
- Only **Super Admin** can invite users
- Only **Super Admin** can assign/remove roles
- Only **Super Admin** can create/modify/delete roles
- Other roles will receive **403 Forbidden** when accessing `/users` endpoints

## Security Rules Implemented

✅ Users cannot assign roles to themselves
✅ Only Super Admin can create/update/delete roles
✅ Only Super Admin can modify role permissions
✅ Only Super Admin can invite new users
✅ Invited users start with "pending" status and must change password on first login
✅ PENDING users can login but receive `requirePasswordChange: true` flag
✅ Password change auto-activates PENDING users to ACTIVE status
✅ Strong password requirements enforced (8+ chars, uppercase, lowercase, number, special char)
✅ New password must be different from temporary password
✅ System roles cannot be deleted
✅ Roles with assigned users cannot be deleted
✅ All role/user management endpoints require authentication + permissions
✅ Email domain validation (@kdsg.gov.ng required)

## Complete User Invitation Flow

### Flow Diagram:

```
Admin Invites User (status: PENDING)
          ↓
Admin shares temporary password with user
          ↓
User logs in with temporary password
          ↓
User verifies OTP
          ↓
Response includes: requirePasswordChange: true
          ↓
User calls /auth/change-password
          ↓
Status automatically changes to ACTIVE
          ↓
User can now access platform normally
```

### Key Points:

- **Temporary passwords** are auto-generated (16 chars, secure random)
- **PENDING users** can login but are prompted to change password
- **Password change** is enforced via `requirePasswordChange` flag in login response
- **Auto-activation** happens when password is successfully changed
- **No admin intervention** needed after initial invite

---

# Phase 2 Testing - Financial Management

## Budget Lines Management

### 1. Create Budget Line (Finance Officer / Super Admin)

**Endpoint:** `POST {{base_url}}/budget-lines`

**Headers:**

```
Authorization: Bearer {{super_admin_token}}
Content-Type: application/json
```

**Body:**

```json
{
  "name": "Direct Cash Transfers FY2026",
  "category": "Direct Cash Transfers",
  "fiscalYear": "FY2026",
  "allocatedAmount": 20000000,
  "description": "Budget for direct cash transfer programs in FY2026"
}
```

**Expected Response (201):**

```json
{
  "success": true,
  "message": "Budget line created successfully",
  "data": {
    "id": "uuid",
    "name": "Direct Cash Transfers FY2026",
    "category": "Direct Cash Transfers",
    "fiscalYear": "FY2026",
    "allocatedAmount": "20000000.00",
    "committedAmount": "0.00",
    "spentAmount": "0.00",
    "remainingAmount": "20000000.00",
    "isActive": true
  }
}
```

### 2. Get All Budget Lines

**Endpoint:** `GET {{base_url}}`/budget-lines

**Expected Response (200):** List of all budget lines with balances

### 3. Get Budget Summary

**Endpoint:** `GET {{base_url}}/budget-lines/summary`

**Expected Response (200):**

```json
{
  "success": true,
  "data": {
    "budgetLines": [...],
    "totals": {
      "totalAllocated": 20000000,
      "totalCommitted": 0,
      "totalSpent": 0,
      "totalRemaining": 20000000
    }
  }
}
```

### 4. Get Budget Line Balance

**Endpoint:** `GET {{base_url}}/budget-lines/:id/balance`

**Expected Response (200):**

```json
{
  "success": true,
  "data": {
    "budgetLineId": "uuid",
    "name": "Direct Cash Transfers FY2026",
    "allocatedAmount": 20000000,
    "committedAmount": 0,
    "spentAmount": 0,
    "remainingAmount": 20000000,
    "availableForNewInterventions": 20000000
  }
}
```

## Disbursements Management

### 1. Create Single Disbursement (Finance Officer / Super Admin)

**Endpoint:** `POST {{base_url}}/disbursements`

**Headers:**

```
Authorization: Bearer {{finance_officer_token}}
Content-Type: application/json
```

**Body:**

```json
{
  "interventionId": "{{intervention_id}}",
  "beneficiaryId": "{{beneficiary_id}}",
  "budgetLineId": "{{budget_line_id}}",
  "amount": 50000,
  "referenceNumber": "REF-2026-001",
  "notes": "First quarter disbursement"
}
```

**Expected Response (201):**

```json
{
  "success": true,
  "message": "Disbursement created successfully",
  "data": {
    "id": "uuid",
    "batchNumber": "BATCH-2026-001",
    "intervention": {...},
    "beneficiary": {...},
    "budgetLine": {...},
    "amount": "50000.00",
    "status": "Paid",
    "paymentDate": "2026-04-06T...",
    "bankName": "...",
    "accountNumber": "...",
    "referenceNumber": "REF-2026-001"
  }
}
```

### 2. Create Batch Disbursement (Multiple Beneficiaries)

**Endpoint:** `POST {{base_url}}/disbursements/batch`

**Body:**

```json
{
  "interventionId": "{{intervention_id}}",
  "budgetLineId": "{{budget_line_id}}",
  "referenceNumber": "BATCH-REF-2026-Q1",
  "disbursements": [
    {
      "beneficiaryId": "{{beneficiary_1_id}}",
      "amount": 50000,
      "notes": "Beneficiary 1"
    },
    {
      "beneficiaryId": "{{beneficiary_2_id}}",
      "amount": 75000,
      "notes": "Beneficiary 2"
    },
    {
      "beneficiaryId": "{{beneficiary_3_id}}",
      "amount": 100000,
      "notes": "Beneficiary 3"
    }
  ]
}
```

**Expected Response (201):**

```json
{
  "success": true,
  "message": "Batch of 3 disbursements created successfully",
  "data": {
    "batchNumber": "BATCH-2026-002",
    "count": 3,
    "disbursements": [...]
  }
}
```

### 3. Get All Disbursements (with filters)

**Endpoint:** `GET {{base_url}}/disbursements?status=Paid&interventionId={{intervention_id}}`

**Query Parameters:**

- `status`: Pending | Processing | Paid | Failed
- `interventionId`: Filter by intervention
- `budgetLineId`: Filter by budget line category
- `startDate`: Filter by date range (ISO format)
- `endDate`: Filter by date range (ISO format)

### 4. Get Recent Disbursements (Dashboard)

**Endpoint:** `GET {{base_url}}/disbursements/recent?limit=10`

### 5. Get Disbursements by Category (Analytics)

**Endpoint:** `GET {{base_url}}/disbursements/by-category`

**Expected Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "category": "Direct Cash Transfers",
      "categoryName": "Direct Cash Transfers FY2026",
      "totalAmount": 225000,
      "count": 3
    }
  ]
}
```

## Financial Flow Testing Scenario

**Complete workflow to test budget tracking:**

1. **Create Budget Line** (₦20M for Direct Cash Transfers)

- Endpoint: `POST /budget-lines`
- Verify: `remainingAmount = ₦20,000,000`

2. **Create First Disbursement** (₦50,000)

- Endpoint: `POST /disbursements`
- Verify: Budget line `spentAmount = ₦50,000`
- Verify: Budget line `remainingAmount = ₦19,950,000`

3. **Create Batch Disbursement** (3 beneficiaries, total ₦225,000)

- Endpoint: `POST /disbursements/batch`
- Verify: Budget line `spentAmount = ₦275,000`
- Verify: Budget line `remainingAmount = ₦19,725,000`

4. **Test Insufficient Funds** - Try to disburse ₦25M

- Expected: 400 Bad Request - "Insufficient budget remaining"

5. **Get Budget Summary**

- Endpoint: `GET /budget-lines/summary`
- Verify: Totals match disbursements

6. **Get Disbursements by Category**

- Endpoint: `GET /disbursements/by-category`
- Verify: Aggregated amounts are correct

## Financial Management Security Tests

### Test 1: Intervention Manager Cannot Create Budget Lines

**Request:**

- **Endpoint:** `POST {{base_url}}/budget-lines`
- **Token:** `{{intervention_manager_token}}`

**Expected Response (403):**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### Test 2: M&E Officer Cannot Create Disbursements

**Request:**

- **Endpoint:** `POST {{base_url}}/disbursements`
- **Token:** `{{me_officer_token}}`

**Expected Response (403):**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### Test 3: Finance Officer CAN View and Manage Budget

**Request:**

- **Endpoints:** All `/budget-lines` and `/disbursements` endpoints
- **Token:** `{{finance_officer_token}}`

**Expected:** 200/201 Success for all operations

## Phase 2 Permissions Required

### Budget Lines:

- **View:** `financialManagement.viewBudget`
- **Manage:** `financialManagement.manageBudget`

### Disbursements:

- **View:** `financialManagement.viewBudget`
- **Create/Update:** `financialManagement.manageBudget`

### Roles with Access:

- **Super Admin:** Full access (all permissions)
- **Finance Officer:** Full access (`viewBudget` + `manageBudget`)
- **Intervention Manager:** NO access (only intervention permissions)
- **M&E Officer:** NO access (only M&E permissions)

---

# Phase 2 Testing - Financial Management

## 1. Fiscal Years

### Create Fiscal Year

```http
POST http://localhost:3000/api/fiscal-years
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "FY 2024",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "isActive": true
}
```

### Get All Fiscal Years

```http
GET http://localhost:3000/api/fiscal-years
Authorization: Bearer {{accessToken}}
```

### Get Active Fiscal Years

```http
GET http://localhost:3000/api/fiscal-years/active
Authorization: Bearer {{accessToken}}
```

### Get Fiscal Year by ID

```http
GET http://localhost:3000/api/fiscal-years/{{fiscalYearId}}
Authorization: Bearer {{accessToken}}
```

### Update Fiscal Year

```http
PATCH http://localhost:3000/api/fiscal-years/{{fiscalYearId}}
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "isActive": false
}
```

---

## 2. Departments

### Get All Departments

```http
GET http://localhost:3000/api/departments
Authorization: Bearer {{accessToken}}
```

**Expected Response** (seeded departments):

- Operations (OPS)
- Monitoring and Evaluation (M&E)
- Logistics (LOG)
- Office Supplies (OFF)

### Get Active Departments

```http
GET http://localhost:3000/api/departments/active
Authorization: Bearer {{accessToken}}
```

### Create New Department

```http
POST http://localhost:3000/api/departments
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "Human Resources",
  "shortCode": "HR",
  "description": "Human resources and staff management",
  "isActive": true
}
```

### Update Department

```http
PATCH http://localhost:3000/api/departments/{{departmentId}}
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "description": "Updated description"
}
```

---

# Phase 3 Testing - Budget Lines

## Create Budget Line (Updated Structure)

```http
POST http://localhost:3000/api/budget-lines
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "Direct Cash Transfers",
  "budgetType": "Capital",
  "category": "Direct Cash Transfers",
  "accountCode": "100-2400",
  "fiscalYearId": "{{fiscalYearId}}",
  "departmentId": "{{operationsDeptId}}",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "allocatedAmount": 1200000000,
  "justification": "Funds for direct cash transfers to verified beneficiaries under the Renewed Hope program"
}
```

**Budget Types**:

- `Capital`
- `Recurrent`

**Budget Categories**:

- `Direct Cash Transfers`
- `Skills Training Programs`
- `Agricultural Support`
- `Administrative Costs`
- `Healthcare Services`
- `Infrastructure Development`
- `Emergency Relief`
- `Education Programs`
- `Logistics & Operations`
- `Monitoring & Evaluation`
- `Office Supplies`
- `Other`

## Get All Budget Lines

```http
GET http://localhost:3000/api/budget-lines
Authorization: Bearer {{accessToken}}
```

## Get Budget Line Details

```http
GET http://localhost:3000/api/budget-lines/{{budgetLineId}}
Authorization: Bearer {{accessToken}}
```

**Response includes**:

- Fiscal year details
- Department details
- Fund requests linked to this budget line
- Budget allocation and utilization

## Get Budget Line Balance

```http
GET http://localhost:3000/api/budget-lines/{{budgetLineId}}/balance
Authorization: Bearer {{accessToken}}
```

## Get Budget Summary

```http
GET http://localhost:3000/api/budget-lines/summary
Authorization: Bearer {{accessToken}}
```

---

# Phase 4 Testing - Fund Requests

## 1. Create Fund Request (Linked to Intervention)

```http
POST http://localhost:3000/api/fund-requests
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "title": "Field Trip to Zaria LGA",
  "budgetLineId": "{{budgetLineId}}",
  "interventionId": "{{interventionId}}",
  "requestedAmount": 5000000,
  "justification": "Field trip to assess beneficiary needs and verify enrollment data in Zaria LGA. This will help ensure accurate targeting of cash transfer beneficiaries.",
  "supportingDocuments": ["trip-proposal.pdf", "budget-breakdown.xlsx"]
}
```

## 2. Create Fund Request (Operational - No Intervention)

```http
POST http://localhost:3000/api/fund-requests
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "title": "Q4 Stationery Procurement",
  "budgetLineId": "{{officeSuppliesBudgetLineId}}",
  "requestedAmount": 120000,
  "justification": "Purchase of office supplies including paper, pens, folders, and printer cartridges for Q4 operations",
  "supportingDocuments": ["vendor-quote.pdf"]
}
```

**Note**: `interventionId` is optional. Operational expenses like stationery, vehicle maintenance, etc. don't need an intervention.

## 3. Get All Fund Requests

```http
GET http://localhost:3000/api/fund-requests
Authorization: Bearer {{accessToken}}
```

## 4. Get Pending Fund Requests (For Approval Dashboard)

```http
GET http://localhost:3000/api/fund-requests/pending
Authorization: Bearer {{accessToken}}
```

**Use Case**: Powers the "Pending Approvals" dashboard component showing fund requests grouped by department.

## 5. Get Fund Requests by Budget Line

```http
GET http://localhost:3000/api/fund-requests/budget-line/{{budgetLineId}}
Authorization: Bearer {{accessToken}}
```

## 6. Get Fund Requests by Intervention

```http
GET http://localhost:3000/api/fund-requests/intervention/{{interventionId}}
Authorization: Bearer {{accessToken}}
```

## 7. Approve Fund Request

```http
PATCH http://localhost:3000/api/fund-requests/{{fundRequestId}}/approve
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "approvedAmount": 5000000,
  "notes": "Approved for Q4 field activities. Ensure proper documentation of all expenses."
}
```

**What Happens**:

1. Fund request status changes to "Approved"
2. Budget line's `committedAmount` increases by approved amount
3. If linked to intervention: intervention's `budgetReceived` increases
4. Approver and approval timestamp recorded

## 8. Reject Fund Request

```http
PATCH http://localhost:3000/api/fund-requests/{{fundRequestId}}/reject
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "notes": "Insufficient justification provided. Please provide detailed breakdown of expenses and expected outcomes."
}
```

## 9. Update Fund Request (Pending Only)

```http
PATCH http://localhost:3000/api/fund-requests/{{fundRequestId}}
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "requestedAmount": 4500000,
  "justification": "Updated justification with more details..."
}
```

**Note**: Only pending fund requests can be updated.

## 10. Delete Fund Request (Pending Only)

```http
DELETE http://localhost:3000/api/fund-requests/{{fundRequestId}}
Authorization: Bearer {{accessToken}}
```

---

# Phase 5 Testing - Disbursements

## Create Disbursement (Existing Endpoint - No Changes)

```http
POST http://localhost:3000/api/disbursements
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "interventionId": "{{interventionId}}",
  "beneficiaryId": "{{beneficiaryId}}",
  "budgetLineId": "{{budgetLineId}}",
  "amount": 50000,
  "paymentDate": "2024-03-15",
  "bankName": "Access Bank",
  "accountNumber": "1565154153",
  "referenceNumber": "TXN-2024-001",
  "notes": "March 2024 cash transfer"
}
```

**What Happens**:

1. Disbursement created with status "Paid"
2. Budget line's `spentAmount` increases
3. Intervention's `budgetSpent` increases
4. Budget line's `remainingAmount` recalculated

---

# Testing Workflow Example

## Complete Budget-to-Disbursement Flow

### Step 1: Setup Foundation

```bash
# 1. Create Fiscal Year
POST /fiscal-years
{
  "name": "FY 2024",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
# Save fiscalYearId

# 2. Get Departments (already seeded)
GET /departments/active
# Save operationsDeptId (Operations)
```

### Step 2: Create Budget Line

```bash
POST /budget-lines
{
  "name": "Direct Cash Transfers",
  "budgetType": "Capital",
  "category": "Direct Cash Transfers",
  "fiscalYearId": "{{fiscalYearId}}",
  "departmentId": "{{operationsDeptId}}",
  "allocatedAmount": 1200000000,
  ...
}
# Save budgetLineId
```

### Step 3: Create Intervention (if not exists)

```bash
POST /interventions
{
  "name": "Renewed Hope Cash Transfer",
  "budgetLineId": "{{budgetLineId}}",
  "budget_allocated": 800000000,
  ...
}
# Save interventionId
```

### Step 4: Request Funds

```bash
POST /fund-requests
{
  "title": "Q1 Cash Transfer Operations",
  "budgetLineId": "{{budgetLineId}}",
  "interventionId": "{{interventionId}}",
  "requestedAmount": 50000000,
  "justification": "Q1 disbursements to 1000 beneficiaries"
}
# Save fundRequestId
```

### Step 5: Approve Fund Request

```bash
PATCH /fund-requests/{{fundRequestId}}/approve
{
  "approvedAmount": 50000000,
  "notes": "Approved"
}
```

### Step 6: Verify Budget Updates

```bash
# Check budget line
GET /budget-lines/{{budgetLineId}}
# committedAmount should be 50,000,000

# Check intervention
GET /interventions/{{interventionId}}
# budgetReceived should be 50,000,000
```

### Step 7: Disburse to Beneficiaries

```bash
POST /disbursements
{
  "interventionId": "{{interventionId}}",
  "beneficiaryId": "{{beneficiaryId}}",
  "budgetLineId": "{{budgetLineId}}",
  "amount": 50000
}
```

### Step 8: Verify Final State

```bash
# Check budget line
GET /budget-lines/{{budgetLineId}}
# spentAmount increases
# remainingAmount decreases

# Check intervention
GET /interventions/{{interventionId}}
# budgetSpent increases
```

---

# Dashboard Testing

## 1. Pending Approvals Component

```http
GET http://localhost:3000/api/fund-requests/pending
Authorization: Bearer {{accessToken}}
```

**Expected**: List of pending fund requests grouped by department showing:

- Department name
- Request title and amount
- Requested by user
- Time created

## 2. Budget Breakdown Component

```http
GET http://localhost:3000/api/budget-lines/summary
Authorization: Bearer {{accessToken}}
```

**Expected**: All budget lines with:

- Name and category
- Allocated, committed, spent, remaining amounts
- Utilization percentage

## 3. Budget by Intervention Component

```http
GET http://localhost:3000/api/interventions
Authorization: Bearer {{accessToken}}
```

**Expected**: All interventions with:

- Name
- Allocated, received, spent amounts
- Utilization percentage

---

# Error Cases to Test

## 1. Fund Request Exceeds Available Budget

```http
POST /fund-requests
{
  "budgetLineId": "{{budgetLineId}}",
  "requestedAmount": 9999999999999,
  ...
}
```

**Expected**: 400 Bad Request - "Requested amount exceeds available budget"

## 2. Update Non-Pending Fund Request

```http
PATCH /fund-requests/{{approvedFundRequestId}}
{
  "requestedAmount": 1000
}
```

**Expected**: 400 Bad Request - "Only pending fund requests can be updated"

## 3. Delete Budget Line with Commitments

```http
DELETE /budget-lines/{{budgetLineIdWithCommitments}}
```

**Expected**: 400 Bad Request - "Cannot delete budget line with committed interventions"

---

# Migration Commands

```bash
# Run migrations
npm run migration:run

# Check migration status
npm run migration:show

# Revert last migration
npm run migration:revert
```

**Migrations Applied**:

1. `AddFinancialManagement` - Creates fiscal_years, departments, fund_requests tables and restructures budget_lines
2. `SeedDefaultDepartments` - Seeds Operations, M&E, Logistics, Office Supplies departments

---

# Summary of Changes

## New Endpoints

- Fiscal Years: 6 endpoints
- Departments: 6 endpoints
- Fund Requests: 10 endpoints

## Updated Endpoints

- Budget Lines: Updated DTO structure (now requires fiscalYearId, departmentId, budgetType)

## Key Features

✅ Fiscal year management with start/end dates
✅ Dynamic department management (users can add new departments)
✅ Fund request workflow with approval/rejection
✅ Support for both intervention-linked and operational fund requests
✅ Automatic budget tracking (allocated → committed → spent)
✅ Budget breakdown by category and intervention
✅ Pending approvals dashboard support

---

# Phase 3: Enhanced Interventions & Data Review Testing

This phase introduces:

- **Enhanced Intervention Fields**: Funding source (enum), intervention type, report frequency, form schema
- **Custom Enrollment Data**: Store intervention-specific beneficiary data
- **Upload Notifications**: Track CSV upload events and review actions
- **Data Review Queue**: CSV upload, duplicate detection, pending beneficiary approval

## Prerequisites

- Phase 1 (RBAC) and Phase 2 (Financial Management) completed
- Super Admin access token
- Sample CSV file for testing uploads

---

## Part 1: Enhanced Interventions

### 1.1 Create Intervention with New Fields

```http
POST /interventions
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "name": "Youth Skills Training Program 2026",
  "description": "Vocational training for unemployed youth",
  "program_type": "Training",
  "funding_source": "Federal",
  "intervention_type": "Skills Training",
  "report_frequency": "Monthly",
  "budget_allocated": 5000000,
  "start_date": "2026-04-01",
  "end_date": "2026-12-31",
  "lga_ids": [1, 2, 3]
}
```

**Note**: Field names use snake_case (`funding_source`, `intervention_type`, `report_frequency`) to maintain API consistency.

**Expected Response** (201 Created):

```json
{
  "statusCode": 201,
  "message": "Intervention created successfully",
  "data": {
    "id": "{{interventionId}}",
    "program_code": "KAD-INT-26-001",
    "name": "Youth Skills Training Program 2026",
    "fundingSource": "Federal",
    "interventionType": "Skills Training",
    "reportFrequency": "Monthly",
    "status": "draft",
    "formSchema": null
  }
}
```

**Save** `{{interventionId}}` for subsequent tests.

### 1.2 Get Intervention Details

```http
GET /interventions/{{interventionId}}
Authorization: Bearer {{superAdminToken}}
```

**Expected**: Intervention with all new fields including `fundingSource`, `interventionType`, `reportFrequency`, `formSchema`

### 1.3 Get Intervention Form Schema

```http
GET /interventions/{{interventionId}}/form-schema
Authorization: Bearer {{superAdminToken}}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "message": "Form schema fetched successfully",
  "data": {}
}
```

Initially empty until a CSV is uploaded.

---

## Part 2: CSV Upload & Form Schema Generation

### 2.1 Prepare Sample CSV

Create `beneficiaries_sample.csv`:

```csv
NIN,firstName,lastName,phone,bankName,accountNumber,accountName,householdSize,monthlyIncome,vulnerabilityScore
12345678901,Amina,Bello,08012345678,Access Bank,1234567890,Amina Bello,5,25000,High
23456789012,Ibrahim,Musa,08098765432,UBA,2345678901,Ibrahim Musa,3,40000,Medium
34567890123,Fatima,Yusuf,07012345678,GTBank,3456789012,Fatima Yusuf,7,15000,High
45678901234,Ahmed,Sani,08123456789,First Bank,4567890123,Ahmed Sani,4,30000,Low
```

### 2.2 Upload CSV to Intervention

```http
POST /data-review/upload
Authorization: Bearer {{superAdminToken}}
Content-Type: multipart/form-data

interventionId: {{interventionId}}
file: @beneficiaries_sample.csv
```

**Expected Response** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "total": 4,
    "valid": 4,
    "invalid": 0,
    "duplicates": 0,
    "pendingIds": [
      "{{pendingId1}}",
      "{{pendingId2}}",
      "{{pendingId3}}",
      "{{pendingId4}}"
    ]
  }
}
```

**Save** `{{pendingId1}}` for subsequent tests.

### 2.3 Verify Form Schema Was Generated

```http
GET /interventions/{{interventionId}}/form-schema
Authorization: Bearer {{superAdminToken}}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "message": "Form schema fetched successfully",
  "data": {
    "coreFields": [
      "nin",
      "firstname",
      "lastname",
      "phone",
      "bankname",
      "accountnumber"
    ],
    "customFields": [
      {
        "name": "householdSize",
        "type": "number",
        "label": "Household Size",
        "required": true
      },
      {
        "name": "monthlyIncome",
        "type": "number",
        "label": "Monthly Income",
        "required": true
      },
      {
        "name": "vulnerabilityScore",
        "type": "text",
        "label": "Vulnerability Score",
        "required": true
      }
    ]
  }
}
```

---

## Part 3: Upload Notifications

### 3.1 Get All Notifications

```http
GET /notifications
Authorization: Bearer {{superAdminToken}}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "{{notificationId}}",
      "type": "UploadCompleted",
      "title": "Upload Completed",
      "message": "4 records processed: 4 valid, 0 duplicates, 0 errors",
      "metadata": {
        "fileName": "beneficiaries_sample.csv",
        "totalRecords": 4,
        "validCount": 4,
        "duplicateCount": 0,
        "errorCount": 0,
        "pendingReviewCount": 4
      },
      "sourceFile": "beneficiaries_sample.csv",
      "status": "Unread",
      "createdAt": "2026-04-06T..."
    }
  ]
}
```

### 3.2 Get Notifications for Specific Intervention

```http
GET /interventions/{{interventionId}}/notifications
Authorization: Bearer {{superAdminToken}}
```

**Expected**: Notifications filtered to only this intervention

### 3.3 Count Unread Notifications

```http
GET /notifications/unread
Authorization: Bearer {{superAdminToken}}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "count": 1
  }
}
```

### 3.4 Mark Notification as Read

```http
PATCH /notifications/{{notificationId}}/read
Authorization: Bearer {{superAdminToken}}
```

**Expected**: Notification status updated to "Read"

### 3.5 Mark All as Read

```http
PATCH /notifications/mark-all-read
Authorization: Bearer {{superAdminToken}}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "success": true,
    "message": "All notifications marked as read"
  }
}
```

---

## Part 4: Data Review Queue

### 4.1 Get All Pending Beneficiaries

```http
GET /data-review/pending
Authorization: Bearer {{superAdminToken}}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "{{pendingId1}}",
      "sourceType": "BulkUpload",
      "sourceReference": "beneficiaries_sample.csv",
      "coreData": {
        "nin": "12345678901",
        "firstname": "Amina",
        "lastname": "Bello",
        "phone": "08012345678",
        "bankname": "Access Bank",
        "accountnumber": "1234567890"
      },
      "customData": {
        "householdSize": "5",
        "monthlyIncome": "25000",
        "vulnerabilityScore": "High"
      },
      "validationErrors": [],
      "status": "PendingReview",
      "interventionId": "{{interventionId}}"
    }
  ]
}
```

### 4.2 Filter Pending by Status

```http
GET /data-review/pending?status=PendingReview
Authorization: Bearer {{superAdminToken}}
```

**Expected**: Only records with `status=PendingReview`

### 4.3 Filter by Intervention

```http
GET /data-review/pending?interventionId={{interventionId}}
Authorization: Bearer {{superAdminToken}}
```

**Expected**: Only records for this intervention

### 4.4 Get Single Pending Beneficiary

```http
GET /data-review/pending/{{pendingId1}}
Authorization: Bearer {{superAdminToken}}
```

**Expected** (200 OK): Full pending beneficiary record with relations

### 4.5 Get Data Review Statistics

```http
GET /data-review/statistics
Authorization: Bearer {{superAdminToken}}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "total": 4,
    "pendingReview": 4,
    "approved": 0,
    "rejected": 0,
    "duplicate": 0
  }
}
```

---

## Part 5: Approve/Reject Pending Records

### 5.1 Approve Pending Beneficiary

```http
PATCH /data-review/pending/{{pendingId1}}/approve
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "notes": "Verified and approved"
}
```

**Expected Response** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "id": "{{pendingId1}}",
    "status": "Approved",
    "approvedBeneficiaryId": "{{newBeneficiaryId}}",
    "approvedEnrollmentId": "{{newEnrollmentId}}",
    "reviewedAt": "2026-04-06T...",
    "reviewNotes": "Verified and approved"
  }
}
```

**What happens**:

1. New `BeneficiaryEntity` created with core data
2. New `EnrollmentEntity` created linking beneficiary to intervention with `customData`
3. Notification created: "Records Approved"

**Save** `{{newBeneficiaryId}}` and `{{newEnrollmentId}}` for testing.

### 5.2 Verify Beneficiary Was Created

```http
GET /beneficiaries/{{newBeneficiaryId}}
Authorization: Bearer {{superAdminToken}}
```

**Expected**: Beneficiary with `firstName: "Amina"`, `lastName: "Bello"`, `nidhh: "12345678901"`

### 5.3 Verify Enrollment with Custom Data

```http
GET /enrollments/{{newEnrollmentId}}
Authorization: Bearer {{superAdminToken}}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "id": "{{newEnrollmentId}}",
    "beneficiary": { "first_name": "Amina", "last_name": "Bello" },
    "intervention": { "name": "Youth Skills Training Program 2026" },
    "customData": {
      "householdSize": "5",
      "monthlyIncome": "25000",
      "vulnerabilityScore": "High"
    },
    "enrollment_date": "2026-04-06",
    "status": "pending"
  }
}
```

### 5.4 Reject Pending Beneficiary

```http
PATCH /data-review/pending/{{pendingId2}}/reject
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "reason": "Invalid phone number"
}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "id": "{{pendingId2}}",
    "status": "Rejected",
    "reviewedAt": "2026-04-06T...",
    "reviewNotes": "Invalid phone number"
  }
}
```

**What happens**:

1. Pending record marked as `Rejected`
2. Notification created: "Records Rejected"
3. No beneficiary or enrollment created

---

## Part 6: Duplicate Detection & Linking

### 6.1 Upload CSV with Duplicate NIN

Create `duplicates.csv`:

```csv
NIN,firstName,lastName,phone,bankName,accountNumber,accountName,householdSize,monthlyIncome,vulnerabilityScore
12345678901,Amina,Bello,08099999999,Zenith Bank,9999999999,Amina Bello,6,28000,Medium
```

```http
POST /data-review/upload
Authorization: Bearer {{superAdminToken}}
Content-Type: multipart/form-data

interventionId: {{interventionId}}
file: @duplicates.csv
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "total": 1,
    "valid": 0,
    "invalid": 0,
    "duplicates": 1,
    "pendingIds": ["{{duplicatePendingId}}"]
  }
}
```

### 6.2 Check Pending Record is Marked as Duplicate

```http
GET /data-review/pending/{{duplicatePendingId}}
Authorization: Bearer {{superAdminToken}}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "id": "{{duplicatePendingId}}",
    "status": "Duplicate",
    "duplicateOfBeneficiaryId": "{{newBeneficiaryId}}",
    "coreData": {
      "nin": "12345678901",
      "firstname": "Amina",
      "lastname": "Bello"
    }
  }
}
```

### 6.3 Find Duplicates by NIN

```http
GET /data-review/duplicates/12345678901
Authorization: Bearer {{superAdminToken}}
```

**Expected**: Array of pending records with matching NIN

### 6.4 Link Duplicate to Existing Beneficiary

```http
POST /data-review/pending/{{duplicatePendingId}}/link
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "beneficiaryId": "{{newBeneficiaryId}}",
  "notes": "Same person, updated custom data"
}
```

**Expected** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "id": "{{duplicatePendingId}}",
    "status": "Approved",
    "approvedBeneficiaryId": "{{newBeneficiaryId}}",
    "approvedEnrollmentId": "{{linkedEnrollmentId}}",
    "reviewNotes": "Same person, updated custom data"
  }
}
```

**What happens**:

1. **No new beneficiary created** (uses existing)
2. New enrollment created linking existing beneficiary to intervention
3. New enrollment uses the custom data from the duplicate pending record

---

## Part 7: Error Handling

### 7.1 Upload Invalid File Format

```http
POST /data-review/upload
Authorization: Bearer {{superAdminToken}}
Content-Type: multipart/form-data

interventionId: {{interventionId}}
file: @invalid.txt
```

**Expected**: 400 Bad Request - "Unsupported file format"

### 7.2 Approve Already Approved Record

```http
PATCH /data-review/pending/{{pendingId1}}/approve
Authorization: Bearer {{superAdminToken}}
```

**Expected**: 400 Bad Request - "Cannot approve pending beneficiary with status Approved"

### 7.3 Link Non-Duplicate Record

```http
POST /data-review/pending/{{pendingId3}}/link
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "beneficiaryId": "{{newBeneficiaryId}}"
}
```

**Expected**: 400 Bad Request - "Can only link pending beneficiaries with Duplicate status"

### 7.4 Link to Non-Existent Beneficiary

```http
POST /data-review/pending/{{duplicatePendingId}}/link
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "beneficiaryId": "00000000-0000-0000-0000-000000000000"
}
```

**Expected**: 404 Not Found - "Beneficiary not found"

---

## Part 8: Phase 3 Security Testing

### 8.1 Intervention Manager Can Upload CSV

```http
POST /data-review/upload
Authorization: Bearer {{interventionManagerToken}}
Content-Type: multipart/form-data

interventionId: {{interventionId}}
file: @beneficiaries_sample.csv
```

**Expected**: 200 OK (has `interventions.manageInterventions` permission)

### 8.2 Intervention Manager Can Approve

```http
PATCH /data-review/pending/{{pendingId3}}/approve
Authorization: Bearer {{interventionManagerToken}}
```

**Expected**: 200 OK

### 8.3 M&E Officer Can View Pending

```http
GET /data-review/pending
Authorization: Bearer {{meOfficerToken}}
```

**Expected**: 200 OK (has `interventions.viewInterventions` permission)

### 8.4 M&E Officer Cannot Approve

```http
PATCH /data-review/pending/{{pendingId4}}/approve
Authorization: Bearer {{meOfficerToken}}
```

**Expected**: 403 Forbidden (lacks `interventions.manageInterventions` permission)

---

## Phase 3 Complete Workflow Test

### Step-by-Step Integration Test

1. **Create Intervention** with new fields (`fundingSource`, `interventionType`, `reportFrequency`)
2. **Upload CSV** → System auto-generates `formSchema`, creates pending records
3. **Check Notifications** → Upload completion notification appears
4. **View Pending Queue** → All records in `PendingReview` status
5. **Approve First Record** → Creates beneficiary + enrollment with `customData`
6. **Reject Second Record** → Marked as rejected, no entities created
7. **Upload Duplicate CSV** → System detects existing NIN, marks as `Duplicate`
8. **Link Duplicate** → Creates enrollment for existing beneficiary
9. **Verify Custom Data** → Check enrollment has intervention-specific fields
10. **Check Statistics** → Verify counts: approved, rejected, duplicate, pending

---

## Phase 3 Permissions Required

| Endpoint                               | Required Permission                 |
| -------------------------------------- | ----------------------------------- |
| POST /data-review/upload               | `interventions.manageInterventions` |
| GET /data-review/pending               | `interventions.viewInterventions`   |
| PATCH /data-review/pending/:id/approve | `interventions.manageInterventions` |
| PATCH /data-review/pending/:id/reject  | `interventions.manageInterventions` |
| POST /data-review/pending/:id/link     | `interventions.manageInterventions` |
| GET /notifications                     | `interventions.viewInterventions`   |
| GET /interventions/:id/form-schema     | `interventions.viewInterventions`   |

### Roles with Access

- **Super Admin**: Full access (all permissions)
- **Intervention Manager**: Can upload, approve, reject, link
- **M&E Officer**: Read-only access to pending queue and notifications
- **Finance Officer**: No access to data review features

---

## Summary of Phase 3 Features

✅ Enhanced intervention creation with funding source (enum), type, report frequency  
✅ CSV/Excel upload with auto form schema generation  
✅ Custom beneficiary data per intervention (stored in enrollment.customData)  
✅ Upload notification system for tracking CSV events  
✅ Pending beneficiary review queue  
✅ Duplicate NIN detection  
✅ Approve/reject/link workflows  
✅ Data review statistics dashboard  
✅ RBAC protection on all endpoints

**New Endpoints Added**: 18 endpoints across data-review and notifications modules

---

## Part 9: Duplicate Detection Within CSV

### 9.1 Intra-CSV Duplicate Detection

The system detects **two types of duplicates**:

1. **Database Duplicates**: NIN already exists in the beneficiaries table
2. **CSV Duplicates**: Same NIN appears multiple times in the uploaded CSV

### 9.2 Test CSV with Internal Duplicates

Create `duplicates_in_csv.csv`:

```csv
NIN,firstName,lastName,phone,bankName,accountNumber,accountName,householdSize,monthlyIncome
12345678901,Amina,Bello,08012345678,Access Bank,1234567890,Amina Bello,5,25000
23456789012,Ibrahim,Musa,08098765432,UBA,2345678901,Ibrahim Musa,3,40000
12345678901,Amina,Ahmed,08099999999,GTBank,9999999999,Amina Ahmed,6,30000
34567890123,Fatima,Yusuf,07012345678,First Bank,3456789012,Fatima Yusuf,4,35000
23456789012,Ibrahim,Sani,08011111111,Zenith,1111111111,Ibrahim Sani,2,20000
```

**Notice**: 
- Row 1 and Row 3 have the same NIN `12345678901`
- Row 2 and Row 5 have the same NIN `23456789012`

### 9.3 Upload CSV with Internal Duplicates

```http
POST /data-review/upload
Authorization: Bearer {{superAdminToken}}
Content-Type: multipart/form-data

interventionId: {{interventionId}}
file: @duplicates_in_csv.csv
```

**Expected Response** (200 OK):

```json
{
  "statusCode": 200,
  "data": {
    "total": 5,
    "valid": 2,
    "invalid": 0,
    "duplicates": 3,
    "pendingIds": [
      "{{pending1}}",  // Row 1: Amina Bello (FIRST occurrence - valid)
      "{{pending2}}",  // Row 2: Ibrahim Musa (FIRST occurrence - valid)
      "{{pending3}}",  // Row 3: Amina Ahmed (CSV DUPLICATE)
      "{{pending4}}",  // Row 4: Fatima Yusuf (valid)
      "{{pending5}}"   // Row 5: Ibrahim Sani (CSV DUPLICATE)
    ]
  }
}
```

### 9.4 Check Notification Message

```http
GET /interventions/{{interventionId}}/notifications
Authorization: Bearer {{superAdminToken}}
```

**Expected**:

```json
{
  "statusCode": 200,
  "data": [
    {
      "type": "UploadCompleted",
      "title": "Upload Completed",
      "message": "5 records processed: 2 valid, 3 duplicates (2 within CSV), 0 errors",
      "metadata": {
        "totalRecords": 5,
        "validCount": 2,
        "duplicateCount": 3,
        "csvDuplicateCount": 2,
        "errorCount": 0
      }
    }
  ]
}
```

**Note**: The message shows `(2 within CSV)` to indicate intra-CSV duplicates.

### 9.5 Verify Duplicate Records

```http
GET /data-review/pending/{{pending3}}
Authorization: Bearer {{superAdminToken}}
```

**Expected** (Row 3 - CSV Duplicate):

```json
{
  "statusCode": 200,
  "data": {
    "id": "{{pending3}}",
    "status": "Duplicate",
    "coreData": {
      "nin": "12345678901",
      "firstname": "Amina",
      "lastname": "Ahmed"
    },
    "validationErrors": [
      {
        "field": "nin",
        "message": "Duplicate NIN in this CSV file (first occurrence will be processed)"
      }
    ],
    "duplicateOfBeneficiaryId": "{{pending1}}"  // Points to FIRST occurrence (Row 1)
  }
}
```

### 9.6 Behavior Summary

| Scenario | First Occurrence | Second Occurrence | Status |
|----------|------------------|-------------------|--------|
| NIN not in DB, not in CSV | Created as "PendingReview" | N/A | Can be approved |
| NIN not in DB, but appears 2x in CSV | Created as "PendingReview" | Marked as "Duplicate" (references first) | Only first can be approved |
| NIN already in DB | Marked as "Duplicate" (references DB record) | Marked as "Duplicate" (references DB record) | Can be linked to existing |

### 9.7 Prevention of Duplicate Approvals

**Scenario**: Reviewer accidentally tries to approve both Row 1 and Row 3 (same NIN)

**First Approval** (Row 1):
```http
PATCH /data-review/pending/{{pending1}}/approve
Authorization: Bearer {{superAdminToken}}
```

**Expected**: ✅ Success - Creates beneficiary with NIN `12345678901`

**Second Approval** (Row 3):
```http
PATCH /data-review/pending/{{pending3}}/approve
Authorization: Bearer {{superAdminToken}}
```

**Expected**: ❌ 400 Bad Request - "Beneficiary with this NIN already exists"

The system prevents duplicate beneficiaries even if the reviewer tries to approve both CSV duplicates.

---

## Duplicate Detection Features

✅ **Database duplicate detection** - Checks against existing beneficiaries  
✅ **Intra-CSV duplicate detection** - Prevents duplicates within the same upload  
✅ **First occurrence tracking** - References the first occurrence for CSV duplicates  
✅ **Clear validation messages** - Indicates which duplicates are within CSV  
✅ **Detailed notifications** - Shows breakdown of CSV vs DB duplicates  
✅ **Approval protection** - Prevents approving multiple records with same NIN  

---

## Part 9A: CSV Validation for Required Fields

### 9A.1 Required Fields Validation

The system validates that all required fields are present in each CSV row:

**Required Core Fields**:
- `NIN` - National Identification Number
- `firstName` - Beneficiary's first name
- `lastName` - Beneficiary's last name
- `phone` - Phone number (10-11 digits)
- `accountNumber` - Bank account number (10 digits)
- `accountName` - Account holder name
- `bank` - Bank name

### 9A.2 Test CSV with Missing Required Fields

Create `invalid_beneficiaries.csv`:

```csv
NIN,firstName,lastName,phone,accountNumber
12345678901,Amina,Bello,08012345678,1234567890
23456789012,Ibrahim,,08098765432,2345678901
34567890123,Fatima,Yusuf,0701234,3456789012
45678901234,,,08123456789,4567890123
```

**Issues in this CSV**:
- Row 1: Missing `accountName` and `bank`
- Row 2: Missing `lastName`, `accountName`, and `bank`
- Row 3: Invalid `phone` (too short), missing `accountName` and `bank`
- Row 4: Missing `firstName`, `lastName`, `accountName`, and `bank`

### 9A.3 Upload Invalid CSV

```http
POST /data-review/upload
Authorization: Bearer {{superAdminToken}}
Content-Type: multipart/form-data

interventionId: {{interventionId}}
file: @invalid_beneficiaries.csv
```

**Expected Response** (200 OK):

```json
{
  "statusCode": 200,
  "message": "Beneficiaries uploaded successfully",
  "data": {
    "total": 4,
    "valid": 0,
    "invalid": 4,
    "duplicates": 0,
    "pendingIds": [
      "{{pending1}}",
      "{{pending2}}",
      "{{pending3}}",
      "{{pending4}}"
    ]
  }
}
```

**Note**: All records are marked as invalid (0 valid), but they are still saved to the pending queue with validation errors for review.

### 9A.4 Check Upload Notification

```http
GET /interventions/{{interventionId}}/notifications
Authorization: Bearer {{superAdminToken}}
```

**Expected**:

```json
{
  "statusCode": 200,
  "data": [
    {
      "type": "UploadCompleted",
      "title": "Upload Completed",
      "message": "4 records processed: 0 valid, 0 duplicates, 4 errors",
      "metadata": {
        "totalRecords": 4,
        "validCount": 0,
        "duplicateCount": 0,
        "errorCount": 4
      }
    }
  ]
}
```

### 9A.5 Review Validation Errors

```http
GET /data-review/pending/{{pending1}}
Authorization: Bearer {{superAdminToken}}
```

**Expected** (Row 1 - Missing accountName and bank):

```json
{
  "statusCode": 200,
  "data": {
    "id": "{{pending1}}",
    "status": "PendingReview",
    "coreData": {
      "nin": "12345678901",
      "firstname": "Amina",
      "lastname": "Bello",
      "phone": "08012345678",
      "accountnumber": "1234567890"
    },
    "validationErrors": [
      {
        "field": "account_name",
        "message": "Account name is required and must be alphanumeric"
      },
      {
        "field": "bank",
        "message": "Bank name is required and must be alphanumeric"
      }
    ]
  }
}
```

**Expected** (Row 2 - Missing lastName, accountName, and bank):

```json
{
  "statusCode": 200,
  "data": {
    "id": "{{pending2}}",
    "status": "PendingReview",
    "validationErrors": [
      {
        "field": "lastname",
        "message": "Last name is required"
      },
      {
        "field": "account_name",
        "message": "Account name is required and must be alphanumeric"
      },
      {
        "field": "bank",
        "message": "Bank name is required and must be alphanumeric"
      }
    ]
  }
}
```

**Expected** (Row 3 - Invalid phone, missing accountName and bank):

```json
{
  "statusCode": 200,
  "data": {
    "id": "{{pending3}}",
    "status": "PendingReview",
    "validationErrors": [
      {
        "field": "phone_number",
        "message": "Phone number must be 10-11 digits"
      },
      {
        "field": "account_name",
        "message": "Account name is required and must be alphanumeric"
      },
      {
        "field": "bank",
        "message": "Bank name is required and must be alphanumeric"
      }
    ]
  }
}
```

### 9A.6 Attempt to Approve Invalid Record

```http
PATCH /data-review/pending/{{pending1}}/approve
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "notes": "Trying to approve invalid record"
}
```

**Expected**: ✅ Success (with warnings)

The system will attempt to create the beneficiary, but it may fail if required database fields are missing. Records with validation errors should be corrected before approval.

### 9A.7 Validation Rules Summary

| Field | Validation Rule | Error Message |
|-------|----------------|---------------|
| `NIN` | Required, any format | "NIN is required" |
| `firstName` | Required | "First name is required" |
| `lastName` | Required | "Last name is required" |
| `phone` | Required, 10-11 digits | "Phone number must be 10-11 digits" |
| `accountNumber` | Required, 10 digits | "Account number must be 10 digits" |
| `accountName` | Required, alphanumeric | "Account name is required and must be alphanumeric" |
| `bank` | Required, alphanumeric | "Bank name is required and must be alphanumeric" |

**Behavior**:
- Records with validation errors are saved as `PendingReview` with `validationErrors` array
- Upload notification shows count of invalid records
- Reviewers can see exactly which fields are invalid
- Invalid records should be corrected before approval

---

## Part 10: Additional Endpoints

### 10.1 Get Pending Beneficiaries by Intervention

**In Interventions Controller** - View pending beneficiaries for a specific intervention:

```http
GET /interventions/{{interventionId}}/pending-beneficiaries
Authorization: Bearer {{superAdminToken}}
```

**Expected Response** (200 OK):

```json
{
  "statusCode": 200,
  "message": "Pending beneficiaries fetched successfully",
  "data": [
    {
      "id": "{{pendingId1}}",
      "sourceType": "BulkUpload",
      "status": "PendingReview",
      "coreData": {
        "nin": "12345678901",
        "firstname": "Amina",
        "lastname": "Bello"
      },
      "customData": {
        "householdSize": "5",
        "monthlyIncome": "25000"
      },
      "createdAt": "2025-02-06T10:30:00.000Z"
    }
  ]
}
```

**Use Case**: View all pending records for a specific intervention from the intervention detail page.

**Permissions Required**: `interventions.viewInterventions`

---

### 10.2 Bulk Approve Pending Beneficiaries

Approve multiple pending records at once:

```http
POST /data-review/pending/bulk-approve
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "pendingIds": [
    "{{pendingId1}}",
    "{{pendingId2}}",
    "{{pendingId3}}"
  ],
  "notes": "Batch approval after verification"
}
```

**Expected Response** (200 OK):

```json
{
  "statusCode": 200,
  "message": "Bulk approval completed: 2 succeeded, 1 failed",
  "data": {
    "successful": [
      {
        "pendingId": "{{pendingId1}}",
        "beneficiaryId": "{{beneficiaryId1}}",
        "enrollmentId": "{{enrollmentId1}}"
      },
      {
        "pendingId": "{{pendingId2}}",
        "beneficiaryId": "{{beneficiaryId2}}",
        "enrollmentId": "{{enrollmentId2}}"
      }
    ],
    "failed": [
      {
        "pendingId": "{{pendingId3}}",
        "error": "Pending beneficiary with ID {{pendingId3}} not found"
      }
    ]
  }
}
```

**Notes**:
- Each record is processed individually
- Failed records don't stop the process
- Returns both successful and failed operations
- Creates beneficiaries and enrollments for each successful approval
- Validates `customData` against `intervention.formSchema`

**Permissions Required**: `interventions.manageBeneficiaries`

---

### 10.3 Bulk Reject Pending Beneficiaries

Reject multiple pending records at once:

```http
POST /data-review/pending/bulk-reject
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "pendingIds": [
    "{{pendingId4}}",
    "{{pendingId5}}"
  ],
  "reason": "Invalid documentation provided"
}
```

**Expected Response** (200 OK):

```json
{
  "statusCode": 200,
  "message": "Bulk rejection completed: 2 succeeded, 0 failed",
  "data": {
    "successful": [
      "{{pendingId4}}",
      "{{pendingId5}}"
    ],
    "failed": []
  }
}
```

**Notes**:
- Marks all records as rejected with the same reason
- Failed rejections are returned in the `failed` array
- Reason is required (cannot be empty)

**Permissions Required**: `interventions.manageBeneficiaries`

---

### 10.4 Test Bulk Operations Workflow

#### Step 1: Upload CSV with Multiple Records

```http
POST /data-review/upload
Authorization: Bearer {{superAdminToken}}
Content-Type: multipart/form-data

interventionId: {{interventionId}}
file: @bulk_test.csv
```

**bulk_test.csv**:
```csv
NIN,firstName,lastName,phone,bankName,accountNumber,accountName,householdSize,monthlyIncome
11111111111,Aisha,Abdullahi,08011111111,Access Bank,1111111111,Aisha Abdullahi,4,30000
22222222222,Musa,Ibrahim,08022222222,UBA,2222222222,Musa Ibrahim,6,45000
33333333333,Halima,Usman,08033333333,GTBank,3333333333,Halima Usman,3,28000
44444444444,Yusuf,Aliyu,08044444444,First Bank,4444444444,Yusuf Aliyu,5,32000
55555555555,Zainab,Bello,08055555555,Zenith,5555555555,Zainab Bello,2,22000
```

**Save the returned pending IDs**.

#### Step 2: Review Pending Records

```http
GET /interventions/{{interventionId}}/pending-beneficiaries
Authorization: Bearer {{superAdminToken}}
```

**Or via data-review endpoint**:

```http
GET /data-review/pending?interventionId={{interventionId}}&status=PendingReview
Authorization: Bearer {{superAdminToken}}
```

#### Step 3: Bulk Approve First 3 Records

```http
POST /data-review/pending/bulk-approve
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "pendingIds": [
    "{{pending1}}",
    "{{pending2}}",
    "{{pending3}}"
  ],
  "notes": "Verified and approved"
}
```

**Verify**: 
- Check `/beneficiaries` for 3 new beneficiaries
- Check `/interventions/{{interventionId}}/enrollments` for 3 new enrollments
- Each enrollment should have `customData` with `householdSize` and `monthlyIncome`

#### Step 4: Bulk Reject Remaining 2 Records

```http
POST /data-review/pending/bulk-reject
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "pendingIds": [
    "{{pending4}}",
    "{{pending5}}"
  ],
  "reason": "Incomplete verification documents"
}
```

**Verify**:

```http
GET /data-review/pending/{{pending4}}
Authorization: Bearer {{superAdminToken}}
```

**Expected**:
```json
{
  "statusCode": 200,
  "data": {
    "status": "Rejected",
    "reviewNotes": "Incomplete verification documents",
    "reviewedBy": {
      "id": "{{superAdminId}}",
      "email": "super.admin@kadsipa.ng",
      "full_name": "Super Admin"
    },
    "reviewedAt": "2025-02-06T11:00:00.000Z"
  }
}
```

---

### 10.5 Error Handling for Bulk Operations

**Test 1: Bulk Approve with Invalid IDs**

```http
POST /data-review/pending/bulk-approve
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "pendingIds": [
    "00000000-0000-0000-0000-000000000000",
    "{{validPendingId}}"
  ]
}
```

**Expected**: 
- First ID fails with "not found"
- Second ID succeeds
- Both results returned in response

**Test 2: Bulk Approve Already Approved Record**

```http
POST /data-review/pending/bulk-approve
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "pendingIds": ["{{alreadyApprovedId}}"]
}
```

**Expected**:
```json
{
  "statusCode": 200,
  "data": {
    "successful": [],
    "failed": [
      {
        "pendingId": "{{alreadyApprovedId}}",
        "error": "Record already approved"
      }
    ]
  }
}
```

**Test 3: Bulk Reject with Empty Reason**

```http
POST /data-review/pending/bulk-reject
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json

{
  "pendingIds": ["{{pendingId}}"],
  "reason": ""
}
```

**Expected**: 400 Bad Request - "reason should not be empty"

---

## Part 10 Summary

✅ **GET /interventions/:id/pending-beneficiaries** - View pending records by intervention  
✅ **POST /data-review/pending/bulk-approve** - Approve multiple records at once  
✅ **POST /data-review/pending/bulk-reject** - Reject multiple records at once  
✅ **Partial success handling** - Continues processing even if some records fail  
✅ **Detailed error reporting** - Returns both successful and failed operations  
✅ **Same validation** - Bulk operations use same validation as individual operations  

**Total New Endpoints**: 3

---

## Important Notes

### CSV Upload Required Fields

When uploading CSV files, the following fields are **required** in each row:

**Core Required Fields**:
- `NIN` - National Identification Number (12 digits)
- `firstName` - Beneficiary's first name
- `lastName` - Beneficiary's last name
- `phone` - Phone number
- `accountNumber` - Bank account number
- `bankName` or `bank` - Bank name

**Recommended Fields**:
- `accountName` - Account holder name (for payment verification)

**Optional Fields with Defaults**:
- `beneficiary_type` - Defaults to `individual` if not provided
- `community` - Defaults to `Not Specified` if not provided
- `legacy_id` - Only for legacy system migrations, nullable

**Other Optional Fields**:
- `dateOfBirth` - Date of birth
- `gender` - Male/Female/Other
- `hasDisability` - true/false
- `disabilityType` - Type of disability
- `email` - Email address
- `address` - Physical address
- `lga` - Local Government Area
- `ward` - Ward name
- `bvn` - Bank Verification Number

Any additional columns in your CSV will be captured as **custom data** and stored in the enrollment's `customData` field.

### Legacy ID Field

The `legacy_id` field in the beneficiaries table has been made **nullable** (Migration: `MakeLegacyIdNullable1775536540939`). This field is only required for beneficiaries migrated from a legacy system. New beneficiaries created from CSV uploads do not need a `legacy_id` value.

If you encounter database constraint errors, ensure you have run the latest migration:

```bash
npm run migration:run
```


