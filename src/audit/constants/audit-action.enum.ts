export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',
  RESTORE = 'RESTORE',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export enum ActivityType {
  AUTH = 'auth',
  DATA_CHANGE = 'data_change',
  EXPORT = 'export',
  IMPORT = 'import',
  API_CALL = 'api_call',
  SYSTEM = 'system',
  BENEFICIARY = 'beneficiary',
  INTERVENTION = 'intervention',
  BUDGET = 'budget',
  DISBURSEMENT = 'disbursement',
  DATA_REVIEW = 'data_review',
  ENROLLMENT = 'enrollment',
  FUND_REQUEST = 'fund_request',
  DEPARTMENT = 'department',
  FISCAL_YEAR = 'fiscal_year',
  USER = 'user',
}
