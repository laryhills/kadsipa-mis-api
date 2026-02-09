export interface ApiResponse<T = unknown> {
  status: number;
  message: string | string[];
  data: T;
  // token: string | null;
}
