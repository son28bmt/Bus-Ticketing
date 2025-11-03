import api from './http';
import type { Trip } from '../types/trip';
import type { UserBooking } from '../types/payment';
import type { Voucher } from '../types/voucher';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

type CompanyVoucherPayload = {
  code: string;
  name: string;
  description?: string;
  discountType: 'PERCENT' | 'AMOUNT';
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usagePerUser?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
};

type BusLite = {
  id: number;
  busNumber: string;
  busType: string;
  totalSeats: number;
  isActive?: boolean;
  facilities?: string[] | null;
};

type CompanyVoucherStatsItem = {
  voucherId: number;
  code?: string;
  name?: string;
  totalDiscount: number;
  usageCount: number;
};

export const companyAPI = {
  getBuses: async () => {
    const response = await api.get<ApiResponse<BusLite[]>>('/company/buses');
    return response.data;
  },

  createBus: async (data: {
    busNumber: string;
    busType: string;
    totalSeats: number;
    capacity?: number;
    facilities?: string[];
    isActive?: boolean;
  }) => {
    const response = await api.post<ApiResponse<BusLite>>('/company/buses', data);
    return response.data;
  },

  updateBus: async (id: number, data: Partial<{
    busNumber: string;
    busType: string;
    totalSeats: number;
    capacity: number;
    facilities: string[];
    isActive: boolean;
  }>) => {
    const response = await api.put<ApiResponse<BusLite>>(`/company/buses/${id}`, data);
    return response.data;
  },

  deleteBus: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/company/buses/${id}`);
    return response.data;
  },

  getTrips: async () => {
    const response = await api.get<ApiResponse<Trip[]>>('/company/trips');
    return response.data;
  },

  createTrip: async (data: Record<string, unknown>) => {
    const response = await api.post<ApiResponse<Trip>>('/company/trips', data);
    return response.data;
  },

  updateTrip: async (id: number, data: Partial<Record<string, unknown>>) => {
    const response = await api.put<ApiResponse<Trip>>(`/company/trips/${id}`, data);
    return response.data;
  },

  deleteTrip: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/company/trips/${id}`);
    return response.data;
  },

  getBookings: async () => {
    const response = await api.get<ApiResponse<UserBooking[]>>('/company/bookings');
    return response.data;
  },

  reportUser: async (payload: { userId: number; bookingId: number; reason: string }) => {
    const response = await api.post<ApiResponse<{ id: number }>>('/company/reports', payload);
    return response.data;
  },

  getReports: async () => {
    const response = await api.get<ApiResponse<Array<{
      id: number;
      userId: number;
      bookingId: number;
      reason: string;
      createdAt: string;
      user?: {
        id: number;
        name: string;
        email: string;
        phone?: string;
      };
    }>>>('/company/reports');
    return response.data;
  },

  getVouchers: async () => {
    const response = await api.get<ApiResponse<Voucher[]>>('/company/vouchers');
    return response.data;
  },
  createVoucher: async (payload: CompanyVoucherPayload) => {
    const response = await api.post<ApiResponse<Voucher>>('/company/vouchers', payload);
    return response.data;
  },
  updateVoucher: async (id: number, payload: Partial<CompanyVoucherPayload>) => {
    const response = await api.put<ApiResponse<Voucher>>(`/company/vouchers/${id}`, payload);
    return response.data;
  },
  toggleVoucher: async (id: number, isActive: boolean) => {
    const response = await api.patch<ApiResponse<Voucher>>(`/company/vouchers/${id}/status`, { isActive });
    return response.data;
  },
  getVoucherUsage: async (params?: { from?: string; to?: string }) => {
    const response = await api.get<ApiResponse<CompanyVoucherStatsItem[]>>('/company/vouchers/stats/usage', {
      params
    });
    return response.data;
  }
};
