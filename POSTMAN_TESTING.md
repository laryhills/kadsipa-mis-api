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
    "interventionsAndProjects": { "createIntervention": true, "manageBeneficiaries": true, "viewInterventions": true, "editIntervention": true },
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
    "interventionsAndProjects": { "createIntervention": true, "manageBeneficiaries": true, "viewInterventions": true, "editIntervention": true },
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
          "financialManagement": { "approveDisbursements": false, "viewBudget": true, "manageBudget": false },
          "interventionsAndProjects": { "createIntervention": true, "manageBeneficiaries": true, "viewInterventions": true, "editIntervention": true },
          "reports": { "viewReports": true, "generateReports": true, "deleteReports": false },
          "dataReview": { "reviewPendingData": true, "approveBeneficiaries": true, "rejectBeneficiaries": true },
          "auditLogs": { "viewAuditLogs": false }
        }
      }
    ],
    "permissions": {
      "userManagement": { "viewUsers": false, "manageRoles": false },
      "financialManagement": { "approveDisbursements": false, "viewBudget": true, "manageBudget": false },
      "interventionsAndProjects": { "createIntervention": true, "manageBeneficiaries": true, "viewInterventions": true, "editIntervention": true },
      "reports": { "viewReports": true, "generateReports": true, "deleteReports": false },
      "dataReview": { "reviewPendingData": true, "approveBeneficiaries": true, "rejectBeneficiaries": true },
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
      "interventionsAndProjects": { "createIntervention": true, "manageBeneficiaries": true, "viewInterventions": true, "editIntervention": true },
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
| Super Admin      | ✅          | ✅            | ✅           | ✅                  | ✅            | ✅            |
| Intervention Mgr | ❌          | ❌            | ❌           | ❌                  | ❌            | ❌            |
| Finance Officer  | ❌          | ❌            | ❌           | ❌                  | ❌            | ❌            |
| M&E Officer      | ❌          | ❌            | ❌           | ❌                  | ❌            | ❌            |


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

