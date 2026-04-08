export class ReportMetadataDto {
  id: string;
  referenceNumber: string;
  name: string;
  reportType: string;
  status: string;
  startDate: Date;
  endDate: Date;
  generatedAt: Date | null;
  generatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  intervention: {
    id: string;
    name: string;
  } | null;
}

export class ExecutiveSummaryDataDto {
  totalBudgetAllocated: number;
  totalBudgetReceived: number;
  totalDisbursed: number;
  utilizationRate: number;
  totalBeneficiaries: number;
  pendingVerification: number;
  receivedVsAllocatedRate: number;
  spentVsReceivedRate: number;
  remainingBudget: number;
  cashOnHand: number;
  avgPayout: number;
  topLgas: Array<{
    name: string;
    totalAmount: number;
    beneficiaryCount: number;
  }>;
  recentDisbursements: Array<{
    beneficiaryName: string;
    nin: string;
    bankingDetails: string;
    amount: number;
    location: string;
    status: string;
  }>;
}

export class ReportDetailsResponseDto {
  metadata: ReportMetadataDto;
  data: ExecutiveSummaryDataDto | Record<string, unknown> | null;
}
