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

| Role | View Users | Manage Roles | Create Role | Modify Permissions | Assign Roles | Invite Users |
|------|------------|--------------|-------------|-------------------|--------------|--------------|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Intervention Mgr | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Finance Officer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| M&E Officer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

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

