import { ApiResponse } from './interfaces/api-response.interface';

export function createResponse<T>(
  status: number,
  message: string | string[],
  data: T,
  token?: string,
): ApiResponse<T> {
  return {
    status,
    message,
    data,
    token: token ?? null,
  };
}

export function successResponse<T>(
  message: string | string[],
  data: T,
  token?: string,
): ApiResponse<T> {
  return createResponse(200, message, data, token);
}

export function createdResponse<T>(
  message: string | string[],
  data: T,
  token?: string,
): ApiResponse<T> {
  return createResponse(201, message, data, token);
}
