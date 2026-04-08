# Complete Workflow Test Plan - Budget & Disbursement Flow

This document outlines the complete end-to-end workflow test for the KADSIPA MIS API, covering intervention creation, beneficiary management, budget allocation, fund requests, and disbursements.

---

## Test Workflow Overview

```
Login → Create Intervention → Upload Beneficiaries → Approve Beneficiaries 
  → ❌ Try Disburse (Should Fail - No Budget) 
  → Create Budget Line → Fund Request → Approve Fund Request 
  → ✅ Disburse (Should Succeed) 
  → Verify All Calculations
```

---

## Prerequisites

- Database is seeded with default roles and a super admin user
- All migrations have been run successfully

---

## Step 1: Login

```http
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "super.admin@kadsipa.ng",
  "password": "SuperAdmin@2024"
}
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "access_token": "{{token}}",
    "refresh_token": "{{refreshToken}}",
    "user": {
      "id": "{{userId}}",
      "email": "super.admin@kadsipa.ng",
      "full_name": "Super Admin"
    }
  }
}
```

**Action**: Save `{{token}}` for subsequent requests.

---

## Step 2: Create Intervention

```http
POST {{baseUrl}}/interventions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Budget Flow Test - Cash Transfer 2026",
  "description": "Testing complete budget and disbursement flow",
  "funding_source": "FEDERAL",
  "intervention_type": "CASH_TRANSFER",
  "report_frequency": "MONTHLY",
  "program_type": "Social Protection",
  "budget_allocated": 10000000.00,
  "start_date": "2026-04-01",
  "end_date": "2026-12-31",
  "lga_ids": [1, 2, 3]
}
```

**Expected Response**:
```json
{
  "statusCode": 201,
  "message": "Intervention created successfully",
  "data": {
    "id": "{{interventionId}}",
    "name": "Budget Flow Test - Cash Transfer 2026",
    "budgetAllocated": 10000000,
    "budgetReceived": 0,
    "budgetSpent": 0,
    "status": "Draft"
  }
}
```

**Verify**:
- ✅ `budgetAllocated` = 10,000,000
- ✅ `budgetReceived` = 0 (no funds received yet)
- ✅ `budgetSpent` = 0 (no disbursements yet)

**Action**: Save `{{interventionId}}`.

---

## Step 3: Upload Beneficiaries CSV

Create `test_beneficiaries.csv`:

```csv
NIN,firstName,lastName,phone,bankName,accountNumber,accountName,householdSize,monthlyIncome
11111111111,Aisha,Abdullahi,08011111111,Access Bank,1111111111,Aisha Abdullahi,4,30000
22222222222,Musa,Ibrahim,08022222222,UBA,2222222222,Musa Ibrahim,6,45000
33333333333,Halima,Usman,08033333333,GTBank,3333333333,Halima Usman,3,28000
```

```http
POST {{baseUrl}}/data-review/upload
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

interventionId: {{interventionId}}
file: @test_beneficiaries.csv
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "message": "Beneficiaries uploaded successfully",
  "data": {
    "total": 3,
    "valid": 3,
    "invalid": 0,
    "duplicates": 0,
    "pendingIds": ["{{pending1}}", "{{pending2}}", "{{pending3}}"]
  }
}
```

**Action**: Save pending IDs.

---

## Step 4: Approve Beneficiaries

### Approve All Three Beneficiaries

```http
POST {{baseUrl}}/data-review/pending/bulk-approve
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "pendingIds": ["{{pending1}}", "{{pending2}}", "{{pending3}}"],
  "notes": "Verified and approved for workflow test"
}
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "message": "Bulk approval completed: 3 succeeded, 0 failed",
  "data": {
    "successful": [
      {
        "pendingId": "{{pending1}}",
        "beneficiaryId": "{{beneficiary1}}",
        "enrollmentId": "{{enrollment1}}"
      },
      {
        "pendingId": "{{pending2}}",
        "beneficiaryId": "{{beneficiary2}}",
        "enrollmentId": "{{enrollment2}}"
      },
      {
        "pendingId": "{{pending3}}",
        "beneficiaryId": "{{beneficiary3}}",
        "enrollmentId": "{{enrollment3}}"
      }
    ],
    "failed": []
  }
}
```

**Action**: Save beneficiary IDs.

---

## Step 5: ❌ Try Disburse (Should Fail - No Budget Received)

```http
POST {{baseUrl}}/disbursements
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "interventionId": "{{interventionId}}",
  "beneficiaryId": "{{beneficiary1}}",
  "budgetLineId": "any-budget-line-id",
  "amount": 50000.00,
  "notes": "Attempting disbursement before budget allocation"
}
```

**Expected Response** (400 Bad Request):
```json
{
  "statusCode": 400,
  "message": "Insufficient intervention budget. Available: ₦0, Requested: ₦50000",
  "error": "Bad Request"
}
```

**Verify**:
- ✅ Disbursement is **rejected**
- ✅ Error message shows "Available: ₦0"
- ✅ Reason: `budgetReceived (0) - budgetSpent (0) = 0 < 50,000`

**Result**: ❌ **Test Passed - Disbursement correctly rejected due to insufficient funds**

---

## Step 6: Create Budget Line (Fiscal Year Budget)

First, verify fiscal year exists or create one:

```http
GET {{baseUrl}}/budget-lines
Authorization: Bearer {{token}}
```

If no fiscal year, create one via database seed or admin interface.

### Create Budget Line for Social Protection

```http
POST {{baseUrl}}/budget-lines
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Social Protection - Direct Cash Transfers",
  "category": "DIRECT_CASH_TRANSFERS",
  "budgetType": "CAPITAL",
  "allocatedAmount": 50000000.00,
  "fiscalYearId": "{{fiscalYearId}}",
  "departmentId": "{{departmentId}}",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "justification": "Budget for cash transfer interventions"
}
```

**Expected Response**:
```json
{
  "statusCode": 201,
  "message": "Budget line created successfully",
  "data": {
    "id": "{{budgetLineId}}",
    "name": "Social Protection - Direct Cash Transfers",
    "category": "DIRECT_CASH_TRANSFERS",
    "allocatedAmount": 50000000,
    "committedAmount": 0,
    "spentAmount": 0,
    "remainingAmount": 50000000
  }
}
```

**Verify**:
- ✅ `allocatedAmount` = 50,000,000
- ✅ `committedAmount` = 0 (no commitments yet)
- ✅ `spentAmount` = 0 (no spending yet)
- ✅ `remainingAmount` = 50,000,000

**Action**: Save `{{budgetLineId}}`.

---

## Step 7: Create Fund Request for Intervention

```http
POST {{baseUrl}}/fund-requests
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Fund Request: Budget Flow Test Intervention",
  "budgetLineId": "{{budgetLineId}}",
  "interventionId": "{{interventionId}}",
  "requestedAmount": 5000000.00,
  "justification": "Requesting funds for cash transfer disbursements to 3 approved beneficiaries. Total expected disbursement: 5M",
  "supportingDocuments": ["approval_memo.pdf", "beneficiary_list.xlsx"],
  "notes": "Urgent - beneficiaries waiting"
}
```

**Expected Response**:
```json
{
  "statusCode": 201,
  "message": "Fund request created successfully",
  "data": {
    "id": "{{fundRequestId}}",
    "title": "Fund Request: Budget Flow Test Intervention",
    "requestedAmount": 5000000,
    "status": "PENDING",
    "budgetLine": {
      "id": "{{budgetLineId}}",
      "name": "Social Protection - Direct Cash Transfers"
    },
    "intervention": {
      "id": "{{interventionId}}",
      "name": "Budget Flow Test - Cash Transfer 2026"
    }
  }
}
```

**Action**: Save `{{fundRequestId}}`.

---

## Step 8: Approve Fund Request

```http
POST {{baseUrl}}/fund-requests/{{fundRequestId}}/approve
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "approvedAmount": 5000000.00,
  "notes": "Approved for workflow test. Funds released to intervention."
}
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "message": "Fund request approved successfully",
  "data": {
    "id": "{{fundRequestId}}",
    "requestedAmount": 5000000,
    "approvedAmount": 5000000,
    "status": "APPROVED",
    "approvedBy": {
      "id": "{{userId}}",
      "email": "super.admin@kadsipa.ng"
    },
    "approvedAt": "2026-04-07T..."
  }
}
```

**Verify Budget Line Updates**:

```http
GET {{baseUrl}}/budget-lines/{{budgetLineId}}
Authorization: Bearer {{token}}
```

**Expected**:
```json
{
  "statusCode": 200,
  "data": {
    "id": "{{budgetLineId}}",
    "allocatedAmount": 50000000,
    "committedAmount": 5000000,  // ← Increased by approved amount
    "spentAmount": 0,            // ← Still 0 (not yet disbursed)
    "remainingAmount": 45000000  // ← allocatedAmount - committedAmount
  }
}
```

**Verify Intervention Updates**:

```http
GET {{baseUrl}}/interventions/{{interventionId}}
Authorization: Bearer {{token}}
```

**Expected**:
```json
{
  "statusCode": 200,
  "data": {
    "id": "{{interventionId}}",
    "budgetAllocated": 10000000,
    "budgetReceived": 5000000,   // ← Increased by approved fund request
    "budgetSpent": 0             // ← Still 0 (not yet disbursed)
  }
}
```

**Verify**:
- ✅ Budget Line: `committedAmount` increased by 5M
- ✅ Intervention: `budgetReceived` increased by 5M
- ✅ Available for disbursement: `budgetReceived (5M) - budgetSpent (0) = 5M`

---

## Step 9: ✅ Disburse to Beneficiaries (Should Succeed)

### Disbursement 1: Aisha Abdullahi

```http
POST {{baseUrl}}/disbursements
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "interventionId": "{{interventionId}}",
  "beneficiaryId": "{{beneficiary1}}",
  "budgetLineId": "{{budgetLineId}}",
  "amount": 50000.00,
  "referenceNumber": "TXN-2026-001",
  "notes": "Monthly cash transfer - April 2026"
}
```

**Expected Response**:
```json
{
  "statusCode": 201,
  "message": "Disbursement created successfully",
  "data": {
    "id": "{{disbursement1}}",
    "batchNumber": "BATCH-2026-0001",
    "amount": 50000,
    "status": "PAID",
    "paymentDate": "2026-04-07T...",
    "beneficiary": {
      "id": "{{beneficiary1}}",
      "first_name": "Aisha",
      "last_name": "Abdullahi",
      "account_number": "1111111111",
      "bank": "Access Bank"
    },
    "intervention": {
      "id": "{{interventionId}}",
      "name": "Budget Flow Test - Cash Transfer 2026"
    }
  }
}
```

### Disbursement 2: Musa Ibrahim

```http
POST {{baseUrl}}/disbursements
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "interventionId": "{{interventionId}}",
  "beneficiaryId": "{{beneficiary2}}",
  "budgetLineId": "{{budgetLineId}}",
  "amount": 50000.00,
  "referenceNumber": "TXN-2026-002",
  "notes": "Monthly cash transfer - April 2026"
}
```

### Disbursement 3: Halima Usman

```http
POST {{baseUrl}}/disbursements
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "interventionId": "{{interventionId}}",
  "beneficiaryId": "{{beneficiary3}}",
  "budgetLineId": "{{budgetLineId}}",
  "amount": 50000.00,
  "referenceNumber": "TXN-2026-003",
  "notes": "Monthly cash transfer - April 2026"
}
```

**Result**: ✅ **All three disbursements succeed**

---

## Step 10: Verify All Calculations

### 10.1 Verify Intervention Budget Tracking

```http
GET {{baseUrl}}/interventions/{{interventionId}}
Authorization: Bearer {{token}}
```

**Expected**:
```json
{
  "statusCode": 200,
  "data": {
    "id": "{{interventionId}}",
    "name": "Budget Flow Test - Cash Transfer 2026",
    "budgetAllocated": 10000000,
    "budgetReceived": 5000000,   // From approved fund request
    "budgetSpent": 150000,       // 50K × 3 disbursements = 150K
    "status": "Active"
  }
}
```

**Verify**:
- ✅ `budgetReceived` = 5,000,000 (from fund request approval)
- ✅ `budgetSpent` = 150,000 (sum of all disbursements)
- ✅ **Available remaining**: 5,000,000 - 150,000 = **4,850,000**

**Calculation Check**:
```
Initial:     budgetReceived = 0, budgetSpent = 0
After FR:    budgetReceived = 5,000,000
After D1:    budgetSpent = 50,000
After D2:    budgetSpent = 100,000
After D3:    budgetSpent = 150,000
Available:   5,000,000 - 150,000 = 4,850,000 ✅
```

---

### 10.2 Verify Budget Line Tracking

```http
GET {{baseUrl}}/budget-lines/{{budgetLineId}}
Authorization: Bearer {{token}}
```

**Expected**:
```json
{
  "statusCode": 200,
  "data": {
    "id": "{{budgetLineId}}",
    "name": "Social Protection - Direct Cash Transfers",
    "category": "DIRECT_CASH_TRANSFERS",
    "fiscalYear": {
      "id": "{{fiscalYearId}}",
      "name": "FY 2026",
      "startDate": "2026-01-01",
      "endDate": "2026-12-31"
    },
    "allocatedAmount": 50000000,
    "committedAmount": 5000000,   // From approved fund request
    "spentAmount": 150000,        // From actual disbursements
    "remainingAmount": 44850000   // allocatedAmount - committedAmount - spentAmount
  }
}
```

**Verify**:
- ✅ `allocatedAmount` = 50,000,000 (initial budget)
- ✅ `committedAmount` = 5,000,000 (from approved fund request)
- ✅ `spentAmount` = 150,000 (from 3 disbursements)
- ✅ `remainingAmount` = 50,000,000 - 5,000,000 = **45,000,000**

**Note**: 
- `spentAmount` tracks actual disbursements (automatically updated when disbursements are made)
- `committedAmount` tracks approved fund requests
- Each disbursement is automatically linked to a fund request (FIFO - oldest approved fund request with available balance)

**Calculation Check**:
```
Initial:       allocated = 50M, committed = 0, spent = 0
After FR:      committed = 5M (fund request approved)
After 3 Disb:  spent = 150K (actual payments made - auto-updated via fund request tracking)
Remaining:     50M - 5M = 45M available for new fund requests ✅
```

---

### 10.3 Verify Fiscal Year Budget Totals

```http
GET {{baseUrl}}/budget-lines?fiscalYearId={{fiscalYearId}}
Authorization: Bearer {{token}}
```

**Expected**: List of all budget lines for FY 2026

**Manual Calculation**:
- Total Allocated across all budget lines for FY 2026
- Total Committed across all budget lines
- Total Spent across all budget lines

---

### 10.4 Verify Disbursement History

```http
GET {{baseUrl}}/disbursements?interventionId={{interventionId}}
Authorization: Bearer {{token}}
```

**Expected**:
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "{{disbursement1}}",
      "batchNumber": "BATCH-2026-0001",
      "amount": 50000,
      "status": "PAID",
      "beneficiary": { "first_name": "Aisha", "last_name": "Abdullahi" }
    },
    {
      "id": "{{disbursement2}}",
      "batchNumber": "BATCH-2026-0002",
      "amount": 50000,
      "status": "PAID",
      "beneficiary": { "first_name": "Musa", "last_name": "Ibrahim" }
    },
    {
      "id": "{{disbursement3}}",
      "batchNumber": "BATCH-2026-0003",
      "amount": 50000,
      "status": "PAID",
      "beneficiary": { "first_name": "Halima", "last_name": "Usman" }
    }
  ]
}
```

**Verify**:
- ✅ All 3 disbursements are recorded
- ✅ All have status "PAID"
- ✅ Total: 150,000

---

## Summary of Financial Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FISCAL YEAR 2026 BUDGET                      │
│  Budget Line: Social Protection - Direct Cash Transfers         │
│  Allocated: ₦50,000,000                                         │
│  Committed: ₦5,000,000  (fund request approved)                 │
│  Spent:     ₦150,000    (auto-updated from disbursements)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ├─> Fund Request (FIFO tracking)
                           │   Approved:     ₦5,000,000
                           │   Spent:        ₦150,000
                           │   Available:    ₦4,850,000
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│          INTERVENTION: Budget Flow Test - Cash Transfer 2026    │
│  Budget Allocated:  ₦10,000,000 (planned need)                  │
│  Budget Received:   ₦5,000,000  (from fund request)             │
│  Budget Spent:      ₦150,000    (disbursed to beneficiaries)    │
│  Available:         ₦4,850,000  (can still disburse)            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ├─> Disbursement 1: Aisha  - ₦50,000 [linked to Fund Request]
                           ├─> Disbursement 2: Musa   - ₦50,000 [linked to Fund Request]
                           └─> Disbursement 3: Halima - ₦50,000 [linked to Fund Request]
                                   Total: ₦150,000
                                   
Note: Each disbursement automatically:
  1. Finds available fund request (FIFO - oldest approved with balance)
  2. Updates Intervention.budgetSpent
  3. Updates FundRequest.spentAmount
  4. Updates BudgetLine.spentAmount
```

---

## Final Verification Checklist

### ✅ Budget Line Calculations
- [ ] Allocated Amount: ₦50,000,000
- [ ] Committed Amount: ₦5,000,000 (after fund request approval)
- [ ] Spent Amount: ₦150,000 (after disbursements)
- [ ] Remaining Amount: ₦45,000,000 (allocated - committed)

### ✅ Intervention Calculations
- [ ] Budget Allocated: ₦10,000,000 (initial plan)
- [ ] Budget Received: ₦5,000,000 (from approved fund request)
- [ ] Budget Spent: ₦150,000 (sum of disbursements)
- [ ] Available to Disburse: ₦4,850,000 (received - spent)

### ✅ Disbursement Validations
- [ ] ❌ Disbursement fails when `budgetReceived = 0`
- [ ] ✅ Disbursement succeeds when `budgetReceived > 0`
- [ ] ✅ Each disbursement updates intervention `budgetSpent`
- [ ] ✅ Each disbursement updates budget line `spentAmount`
- [ ] ✅ All amounts tracked accurately across fiscal year

### ✅ Workflow Completeness
- [ ] Login successful
- [ ] Intervention created
- [ ] Beneficiaries uploaded and approved
- [ ] First disbursement attempt fails (no budget)
- [ ] Budget line created
- [ ] Fund request created and approved
- [ ] Funds flow to intervention (`budgetReceived` updated)
- [ ] Second disbursement attempt succeeds
- [ ] All financial calculations are correct

---

## Expected Outcome

✅ **WORKFLOW TEST PASSED** if all the following are true:

1. ❌ Disbursement is **rejected** before fund request approval (no budget received)
2. ✅ Disbursement **succeeds** after fund request approval (budget received)
3. ✅ Budget Line tracks: `allocatedAmount`, `committedAmount`, `spentAmount`, `remainingAmount`
4. ✅ Intervention tracks: `budgetAllocated`, `budgetReceived`, `budgetSpent`
5. ✅ All calculations are accurate and consistent
6. ✅ Fiscal year budget totals are correct

---

## Next Steps After Approval

Once you've confirmed this workflow test passes:

✅ **Phase 4: Reports Module** - PDF/Excel generation for:
- Intervention reports (beneficiaries, disbursements, budgets)
- Budget line reports (allocations, commitments, spending)
- Fiscal year summary reports

✅ **Phase 5: Dashboard Endpoints** - Aggregation queries for:
- Total beneficiaries per intervention
- Total disbursements per fiscal year
- Budget utilization rates
- Top spending categories

---

## Test Execution

**Date**: _____________
**Tester**: _____________
**Result**: [ ] PASS  [ ] FAIL
**Notes**: 
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________

**Approval**: _________________ (Signature)
