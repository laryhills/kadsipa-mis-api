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

---

# Phase 5: Reports Module Testing

After completing the budget and disbursement workflow above, test the new Reports Module.

---

## Step 10A: Get Available Metrics (Optional)

Before creating a report, you can fetch the list of available metrics to include.

```http
GET {{baseUrl}}/reports/metrics
Authorization: Bearer {{token}}
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "message": "All available metrics fetched successfully",
  "data": [
    {
      "key": "totalFundsDisbursed",
      "label": "Total Funds Disbursed",
      "description": "Aggregated financial values per LGA",
      "applicableReportTypes": ["ExecutiveSummary", "FinancialDisbursement", "InterventionSummary", "BudgetLineReport"]
    },
    {
      "key": "beneficiaryCount",
      "label": "Beneficiary Count",
      "description": "Total number of beneficiaries reached",
      "applicableReportTypes": ["ExecutiveSummary", "BeneficiaryList", "InterventionSummary"]
    },
    {
      "key": "auditTrailLogs",
      "label": "Audit Trail Logs",
      "description": "Include timestamps of user actions and system changes",
      "applicableReportTypes": ["ExecutiveSummary", "FinancialDisbursement", "InterventionSummary"]
    }
  ]
}
```

**12 Total Metrics Available:**
1. `totalFundsDisbursed` - Aggregated financial values per LGA
2. `beneficiaryCount` - Total beneficiaries reached
3. `auditTrailLogs` - User action timestamps
4. `budgetUtilization` - Budget vs spending analysis
5. `topLgasByDisbursal` - LGA rankings by disbursement
6. `pendingVerification` - Pending approvals count
7. `recentDisbursements` - Latest 10 transactions
8. `genderBreakdown` - Beneficiary gender distribution
9. `disabilityStats` - Beneficiaries with disabilities
10. `enrollmentTrends` - Enrollment over time
11. `fundingSourceAnalysis` - Breakdown by funding source
12. `disbursementStatusSummary` - Status counts (paid/pending/failed)

### Filter Metrics by Report Type

```http
GET {{baseUrl}}/reports/metrics?reportType=ExecutiveSummary
Authorization: Bearer {{token}}
```

**Expected**: Only metrics applicable to Executive Summary reports

---

## Step 11: Generate Executive Summary Report (Save as Draft)

```http
POST {{baseUrl}}/reports
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Q2 2026 Executive Summary",
  "interventionId": "{{interventionId}}",
  "reportType": "ExecutiveSummary",
  "startDate": "2026-04-01",
  "endDate": "2026-06-30",
  "fileFormat": "Both",
  "includedMetrics": [
    "totalFundsDisbursed",
    "beneficiaryCount",
    "auditTrailLogs"
  ],
  "shouldFinalize": false
}
```

**Expected Response**:
```json
{
  "statusCode": 201,
  "message": "Report created successfully. Use the finalise endpoint to generate the report.",
  "data": {
    "id": "{{reportId1}}",
    "referenceNumber": "RPT-2026-001",
    "name": "Q2 2026 Executive Summary",
    "reportType": "ExecutiveSummary",
    "status": "Draft",
    "fileFormat": "Both",
    "config": {
      "includedMetrics": [
        "totalFundsDisbursed",
        "beneficiaryCount",
        "auditTrailLogs"
      ]
    }
  }
}
```

**Action**: Save `{{reportId1}}`.

**Note**: `includedMetrics` can include:
- `totalFundsDisbursed` - Aggregated financial values per LGA
- `beneficiaryCount` - Aggregated financial values per LGA  
- `auditTrailLogs` - Include timestamps of user actions
- Or any custom metrics based on report type

---

## Step 11B: Generate Report and Finalise Immediately

```http
POST {{baseUrl}}/reports
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Q2 2026 Executive Summary - Auto Finalized",
  "interventionId": "{{interventionId}}",
  "reportType": "ExecutiveSummary",
  "startDate": "2026-04-01",
  "endDate": "2026-06-30",
  "fileFormat": "Both",
  "includedMetrics": [
    "totalFundsDisbursed",
    "beneficiaryCount"
  ],
  "shouldFinalize": true
}
```

**Expected Response**:
```json
{
  "statusCode": 201,
  "message": "Report created successfully. Use the finalise endpoint to generate the report.",
  "data": {
    "id": "{{reportId1B}}",
    "referenceNumber": "RPT-2026-002",
    "name": "Q2 2026 Executive Summary - Auto Finalized",
    "reportType": "ExecutiveSummary",
    "status": "Processing",
    "fileFormat": "Both"
  }
}
```

**Note**: When `shouldFinalize: true`, the report immediately queues for generation. Check status after 5-10 seconds.

---

## Step 12: Finalise Report (Queue Generation) - For Draft Reports

```http
POST {{baseUrl}}/reports/{{reportId1}}/finalise
Authorization: Bearer {{token}}
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "message": "Report generation queued. Check status for completion.",
  "data": {
    "id": "{{reportId1}}",
    "referenceNumber": "RPT-2026-001",
    "status": "Processing"
  }
}
```

**Wait 5-10 seconds** for background job to complete.

---

## Step 13: Check Report Status

```http
GET {{baseUrl}}/reports/{{reportId1}}
Authorization: Bearer {{token}}
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "message": "Report fetched successfully",
  "data": {
    "id": "{{reportId1}}",
    "referenceNumber": "RPT-2026-001",
    "name": "Q2 2026 Executive Summary",
    "reportType": "ExecutiveSummary",
    "status": "Finalised",
    "pdfUrl": "RPT-2026-001.pdf",
    "excelUrl": "RPT-2026-001.xlsx",
    "generatedAt": "2026-04-07T...",
    "intervention": {
      "id": "{{interventionId}}",
      "name": "Budget Flow Test - Cash Transfer 2026"
    }
  }
}
```

**Verify**:
- ✅ Status changed to "Finalised"
- ✅ Both `pdfUrl` and `excelUrl` are populated
- ✅ `generatedAt` timestamp is present

---

## Step 14: Download PDF Report

```http
GET {{baseUrl}}/reports/{{reportId1}}/download/pdf
Authorization: Bearer {{token}}
```

**Expected**: File download starts (RPT-2026-001.pdf)

**Verify PDF Contains**:
- ✅ Key Metrics: Budget Allocated (₦10M), Disbursed (₦150K), Utilization Rate
- ✅ Beneficiaries Reached: 3
- ✅ Fund Utilization Analysis charts
- ✅ Recent Disbursement Log with 3 entries

---

## Step 15: Download Excel Report

```http
GET {{baseUrl}}/reports/{{reportId1}}/download/excel
Authorization: Bearer {{token}}
```

**Expected**: File download starts (RPT-2026-001.xlsx)

**Verify Excel Contains**:
- ✅ Sheet 1: Executive Summary (key metrics)
- ✅ Sheet 2: Top LGAs (if applicable)
- ✅ Sheet 3: Recent Disbursements (3 rows: Aisha, Musa, Halima)

---

## Step 16: Generate Financial Disbursement Report (Finalise Immediately)

```http
POST {{baseUrl}}/reports
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "April 2026 Disbursement Report",
  "interventionId": "{{interventionId}}",
  "reportType": "FinancialDisbursement",
  "startDate": "2026-04-01",
  "endDate": "2026-04-30",
  "fileFormat": "PDF",
  "includedMetrics": [
    "totalFundsDisbursed",
    "beneficiaryCount"
  ],
  "shouldFinalize": true
}
```

**Expected**: Report created with `reportType: "FinancialDisbursement"` and immediately queued for generation

**Action**: Save `{{reportId2}}`, wait 5-10 seconds, check status, then download PDF.

**Verify PDF Contains**:
- ✅ Summary: Total Count (3), Total Amount (₦150K)
- ✅ Paid Count: 3, Paid Amount: ₦150K
- ✅ Detailed disbursement list with batch numbers

---

## Step 17: Generate Beneficiary List Report

```http
POST {{baseUrl}}/reports
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Approved Beneficiaries - Budget Flow Test",
  "interventionId": "{{interventionId}}",
  "reportType": "BeneficiaryList",
  "fileFormat": "Excel"
}
```

**Expected**: Report created with `reportType: "BeneficiaryList"`

**Action**: Finalise and download Excel.

**Verify Excel Contains**:
- ✅ All 3 beneficiaries (Aisha, Musa, Halima)
- ✅ Columns: First Name, Last Name, NIN, Phone, Gender, LGA, Status
- ✅ Correct account details for each

---

## Step 18: Generate Intervention Summary Report

```http
POST {{baseUrl}}/reports
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Budget Flow Test - Intervention Summary",
  "interventionId": "{{interventionId}}",
  "reportType": "InterventionSummary",
  "fileFormat": "Both"
}
```

**Expected**: Intervention-specific report

**Verify PDF/Excel Contains**:
- ✅ Intervention Name: "Budget Flow Test - Cash Transfer 2026"
- ✅ Budget Allocated: ₦10,000,000
- ✅ Budget Received: ₦5,000,000
- ✅ Budget Spent: ₦150,000
- ✅ Utilization Rate: 1.5% (150K / 10M)
- ✅ Total Enrollments: 3
- ✅ Total Disbursements: 3
- ✅ Total Disbursed Amount: ₦150,000

---

## Step 19: Generate Budget Line Report

```http
POST {{baseUrl}}/reports
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "FY 2026 - Budget Line Performance",
  "reportType": "BudgetLineReport",
  "fileFormat": "Excel",
  "config": {
    "fiscalYearId": "{{fiscalYearId}}"
  }
}
```

**Expected**: Report for all budget lines in fiscal year

**Verify Excel Contains**:
- ✅ Budget Line: "Social Protection - Direct Cash Transfers"
- ✅ Category: DIRECT_CASH_TRANSFERS
- ✅ Allocated: ₦50,000,000
- ✅ Committed: ₦5,000,000
- ✅ Spent: ₦150,000
- ✅ Remaining: ₦45,000,000
- ✅ Utilization %: 0.3% (150K / 50M)

---

## Step 20: List All Reports with Filters

### Get All Reports
```http
GET {{baseUrl}}/reports
Authorization: Bearer {{token}}
```

**Expected**: List of all created reports

### Filter by Intervention
```http
GET {{baseUrl}}/reports?interventionId={{interventionId}}
Authorization: Bearer {{token}}
```

**Expected**: Only reports for this intervention

### Filter by Report Type
```http
GET {{baseUrl}}/reports?reportType=ExecutiveSummary
Authorization: Bearer {{token}}
```

**Expected**: Only executive summary reports

### Filter by Status
```http
GET {{baseUrl}}/reports?status=Finalised
Authorization: Bearer {{token}}
```

**Expected**: Only finalised reports

### Search by Name
```http
GET {{baseUrl}}/reports?search=Budget Flow
Authorization: Bearer {{token}}
```

**Expected**: Reports matching search term

### Pagination
```http
GET {{baseUrl}}/reports?page=1&limit=5&sortBy=createdAt&sortOrder=DESC
Authorization: Bearer {{token}}
```

**Expected**: First 5 reports, sorted by creation date (newest first)

---

## Step 21: Regenerate a Report

```http
POST {{baseUrl}}/reports/{{reportId1}}/regenerate
Authorization: Bearer {{token}}
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "message": "Report regeneration queued. Check status for completion.",
  "data": {
    "id": "{{reportId1}}",
    "status": "Processing",
    "pdfUrl": null,
    "excelUrl": null
  }
}
```

**Verify**:
- ✅ Old files are deleted
- ✅ Status changes to "Processing"
- ✅ After completion, new files are generated with same reference number

---

## Step 22: Delete a Report

```http
DELETE {{baseUrl}}/reports/{{reportId2}}
Authorization: Bearer {{token}}
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "message": "Report deleted successfully",
  "data": null
}
```

**Verify**:
- ✅ Report is removed from database
- ✅ Associated PDF/Excel files are deleted from storage
- ✅ GET request to deleted report returns 404

---

## Reports Module Verification Checklist

### ✅ Report Creation
- [ ] Draft reports are created successfully
- [ ] Reference numbers follow RPT-YYYY-NNN format
- [ ] All report types are supported
- [ ] Both PDF and Excel formats work

### ✅ Report Generation
- [ ] Finalise endpoint queues background job
- [ ] BullMQ processor generates files correctly
- [ ] Status changes: Draft → Processing → Finalised
- [ ] Failed generations show error message

### ✅ Report Content Accuracy
- [ ] Executive Summary shows correct budget/disbursement totals
- [ ] Financial Disbursement lists all disbursements
- [ ] Beneficiary List includes all enrolled beneficiaries
- [ ] Intervention Summary calculates utilization correctly
- [ ] Budget Line Report shows accurate spending

### ✅ File Downloads
- [ ] PDF files download successfully
- [ ] Excel files download successfully
- [ ] Files contain expected data
- [ ] File names match reference numbers

### ✅ Query & Filtering
- [ ] Search by report name works
- [ ] Filter by interventionId works
- [ ] Filter by reportType works
- [ ] Filter by status works
- [ ] Pagination works correctly
- [ ] Sorting works (createdAt, name, etc.)

### ✅ Report Management
- [ ] Regenerate creates new files
- [ ] Delete removes database record and files
- [ ] Only users with correct permissions can access
- [ ] Draft reports can be edited (PATCH endpoint)
- [ ] Finalized reports cannot be edited (returns 403 Forbidden)
- [ ] Finalized reports have cryptographic signature

### ✅ Metrics Endpoint
- [ ] GET /reports/metrics returns all 12 metrics
- [ ] Filter by reportType works correctly
- [ ] Each metric shows applicable report types

### ✅ Security
- [ ] User data in responses excludes passwords and secrets
- [ ] generatedBy only shows: id, email, full_name
- [ ] Cryptographic signature prevents tampering

### ✅ RBAC Permissions
- [ ] `reports.viewReports` - Super Admin, Intervention Manager, Finance Officer, M&E Officer
- [ ] `reports.generateReports` - Super Admin, Intervention Manager, Finance Officer, M&E Officer
- [ ] `reports.deleteReports` - Super Admin only

---

## Complete Workflow Summary

```
Phase 3 & 4: Budget & Disbursement Flow
  ✅ Create Intervention (₦10M allocated)
  ✅ Upload & Approve 3 Beneficiaries
  ❌ Try Disburse → Fails (no budget received)
  ✅ Create Budget Line (₦50M)
  ✅ Create & Approve Fund Request (₦5M → intervention)
  ✅ Disburse ₦150K to 3 beneficiaries
  ✅ Verify all financial calculations

Phase 5: Reports Module
  ✅ Generate Executive Summary (PDF + Excel)
  ✅ Generate Financial Disbursement Report
  ✅ Generate Beneficiary List
  ✅ Generate Intervention Summary
  ✅ Generate Budget Line Report
  ✅ Download, filter, search, regenerate, delete
```

---

## Final Approval

**Phase 5 Test Execution**

**Date**: _____________
**Tester**: _____________
**Result**: [ ] PASS  [ ] FAIL
**Reports Generated**: [ ] Executive Summary  [ ] Financial Disbursement  [ ] Beneficiary List  [ ] Intervention Summary  [ ] Budget Line

**Notes**: 
_______________________________________________________________________
_______________________________________________________________________

**Approval**: _________________ (Signature)
