import { ApiResponse } from './interfaces/api-response.interface';

export function createResponse<T>(
  status: number,
  message: string | string[],
  data: T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  token?: string,
): ApiResponse<T> {
  return {
    status,
    message,
    data,
    // token: token ?? null,
  };
}

export function successResponse<T>(
  message: string | string[],
  data: T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  token?: string,
): ApiResponse<T> {
  return createResponse(200, message, data);
}

export function createdResponse<T>(
  message: string | string[],
  data: T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  token?: string,
): ApiResponse<T> {
  return createResponse(201, message, data);
}
