import { UserResponseData, AdminResponseData } from './User';

export interface TokenResponseData {
  success: boolean;
  token: string;
  data?: UserResponseData | AdminResponseData;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data?: T;
} 