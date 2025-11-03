import axios from 'axios';
import api from './http';
import type {
  Voucher,
  VoucherValidationRequest,
  VoucherValidationResponse,
  UserVoucher
} from '../types/voucher';

type VoucherListResponse<T = Voucher[]> = Promise<{ success: boolean; data: T }>;

export const voucherAPI = {
  validate: async (payload: VoucherValidationRequest): Promise<VoucherValidationResponse> => {
    try {
      const response = await api.post<VoucherValidationResponse>('/vouchers/validate', payload);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ||
          error.message ||
          'Khong the ap dung voucher.';
        throw new Error(message);
      }
      throw error;
    }
  },

  listPublic: async (companyId?: number): VoucherListResponse => {
    const response = await api.get<{ success: boolean; data: Voucher[] }>('/vouchers', {
      params: companyId ? { companyId } : undefined
    });
    return response.data;
  },

  listAvailable: async (params?: {
    companyId?: number;
    tripId?: number;
    totalAmount?: number;
    includeGlobal?: boolean;
  }): VoucherListResponse => {
    const response = await api.get<{ success: boolean; data: Voucher[] }>('/vouchers/available', {
      params
    });
    return response.data;
  },

  getByCode: async (code: string): Promise<{ success: boolean; data: Voucher }> => {
    const response = await api.get<{ success: boolean; data: Voucher }>(`/vouchers/${code}`);
    return response.data;
  },

  listWallet: async (): VoucherListResponse<UserVoucher[]> => {
    const response = await api.get<{ success: boolean; data: UserVoucher[] }>('/user/vouchers');
    return response.data;
  },

  saveToWallet: async (voucherId: number): Promise<{ success: boolean; message?: string; data?: UserVoucher }> => {
    const response = await api.post<{ success: boolean; message?: string; data?: UserVoucher }>(
      `/user/vouchers/${voucherId}/save`
    );
    return response.data;
  },

  removeFromWallet: async (walletId: number): Promise<{ success: boolean; message?: string }> => {
    const response = await api.delete<{ success: boolean; message?: string }>(`/user/vouchers/${walletId}`);
    return response.data;
  }
};

export default voucherAPI;
