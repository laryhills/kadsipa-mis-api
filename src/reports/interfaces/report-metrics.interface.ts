export interface ReportMetric {
  key: string;
  label: string;
  description: string;
  applicableReportTypes: string[];
}

export const AVAILABLE_METRICS: ReportMetric[] = [
  {
    key: 'totalFundsDisbursed',
    label: 'Total Funds Disbursed',
    description: 'Aggregated financial values per LGA',
    applicableReportTypes: [
      'ExecutiveSummary',
      'FinancialDisbursement',
      'InterventionSummary',
      'BudgetLineReport',
    ],
  },
  {
    key: 'beneficiaryCount',
    label: 'Beneficiary Count',
    description: 'Total number of beneficiaries reached',
    applicableReportTypes: [
      'ExecutiveSummary',
      'BeneficiaryList',
      'InterventionSummary',
    ],
  },
  {
    key: 'auditTrailLogs',
    label: 'Audit Trail Logs',
    description: 'Include timestamps of user actions and system changes',
    applicableReportTypes: [
      'ExecutiveSummary',
      'FinancialDisbursement',
      'InterventionSummary',
    ],
  },
  {
    key: 'budgetUtilization',
    label: 'Budget Utilization',
    description: 'Budget allocation vs spending analysis',
    applicableReportTypes: [
      'ExecutiveSummary',
      'BudgetLineReport',
      'InterventionSummary',
    ],
  },
  {
    key: 'topLgasByDisbursal',
    label: 'Top LGAs by Disbursal',
    description: 'Ranking of LGAs by total disbursement amount',
    applicableReportTypes: ['ExecutiveSummary', 'FinancialDisbursement'],
  },
  {
    key: 'pendingVerification',
    label: 'Pending Verification',
    description: 'Number of beneficiaries pending approval',
    applicableReportTypes: ['ExecutiveSummary', 'BeneficiaryList'],
  },
  {
    key: 'recentDisbursements',
    label: 'Recent Disbursements',
    description: 'Latest disbursement transactions (last 10)',
    applicableReportTypes: ['ExecutiveSummary', 'FinancialDisbursement'],
  },
  {
    key: 'genderBreakdown',
    label: 'Gender Breakdown',
    description: 'Beneficiary distribution by gender',
    applicableReportTypes: ['BeneficiaryList', 'InterventionSummary'],
  },
  {
    key: 'disabilityStats',
    label: 'Disability Statistics',
    description: 'Number of beneficiaries with disabilities',
    applicableReportTypes: ['BeneficiaryList', 'InterventionSummary'],
  },
  {
    key: 'enrollmentTrends',
    label: 'Enrollment Trends',
    description: 'Beneficiary enrollment over time',
    applicableReportTypes: ['ExecutiveSummary', 'InterventionSummary'],
  },
  {
    key: 'fundingSourceAnalysis',
    label: 'Funding Source Analysis',
    description: 'Breakdown by funding source (Federal, NGO, etc.)',
    applicableReportTypes: ['ExecutiveSummary', 'BudgetLineReport'],
  },
  {
    key: 'disbursementStatusSummary',
    label: 'Disbursement Status Summary',
    description: 'Count of paid, pending, and failed disbursements',
    applicableReportTypes: ['FinancialDisbursement', 'InterventionSummary'],
  },
];
