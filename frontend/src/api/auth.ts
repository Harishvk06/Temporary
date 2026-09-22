import { apiClient } from './client';
import { AuthResponse, User } from '../types';

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },
  register: async (userData: { email: string; password: string; full_name?: string }): Promise<User> => {
    const res = await apiClient.post<User>('/auth/register', userData);
    return res.data;
  },
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<User>('/users/profile');
    return res.data;
  },
  sendOtp: async (data: { phone_number?: string; email?: string; password?: string }): Promise<{ status: string; message: string; expires_in_seconds?: number; dev_otp?: string }> => {
    const res = await apiClient.post<{ status: string; message: string; expires_in_seconds?: number; dev_otp?: string }>('/auth/send-otp', data);
    return res.data;
  },
  verifyOtp: async (data: { phone_number?: string; email?: string; otp_code: string }): Promise<AuthResponse & { message?: string }> => {
    const res = await apiClient.post<AuthResponse & { message?: string }>('/auth/verify-otp', data);
    return res.data;
  },
};


