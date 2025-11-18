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
  companyId?: number;
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

export type CompanyDriver = {
  id: number;
  companyId: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  phone?: string | null;
  licenseNumber?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
};

export type CompanyStaff = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'company' | 'driver';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  driverProfile?: {
    id: number;
    licenseNumber?: string | null;
    phone?: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  } | null;
};

export type TripReportItem = {
  id: number;
  note: string;
  createdAt: string;
  trip: {
    id: number;
    departureTime?: string;
    arrivalTime?: string;
    routeLabel?: string | null;
    busNumber?: string | null;
  } | null;
  driver: {
    id: number | null;
    name: string;
    phone?: string | null;
  } | null;
};

export type TripReportSummary = {
  totalReports: number;
  topDrivers: Array<{ driverId: number | null; name: string; count: number }>;
  topRoutes: Array<{ route: string; count: number }>;
  lastReportAt?: string | null;
};

type StaffPayloadBase = {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'company' | 'driver';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  licenseNumber?: string | null;
};

type CreateStaffPayload = StaffPayloadBase & {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: 'company' | 'driver';
};

type UpdateStaffPayload = StaffPayloadBase & {
  password?: string;
};

export interface CompanyProfile {
  id: number;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string | null;
  description?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankCode?: string | null;
}

export const companyAPI = {
  getProfile: async () => {
    const response = await api.get<ApiResponse<CompanyProfile>>('/company/profile');
    return response.data;
  },

  updateProfile: async (payload: Partial<CompanyProfile>) => {
    const response = await api.put<ApiResponse<CompanyProfile>>('/company/profile', payload);
    return response.data;
  },
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

  updateBus: async (
    id: number,
    data: Partial<{
      busNumber: string;
      busType: string;
      totalSeats: number;
      capacity: number;
      facilities: string[];
      isActive: boolean;
    }>
  ) => {
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

  cancelTrip: async (id: number, payload: { reason?: string; note?: string }) => {
    const response = await api.post<ApiResponse<{ trip: Trip; affectedBookings: number }>>(
      `/company/trips/${id}/cancel`,
      payload
    );
    return response.data;
  },

  getDrivers: async () => {
    const response = await api.get<ApiResponse<CompanyDriver[]>>('/company/drivers');
    return response.data;
  },

  getStaff: async () => {
    const response = await api.get<ApiResponse<CompanyStaff[]>>('/company/staff');
    return response.data;
  },

  createStaff: async (payload: CreateStaffPayload) => {
    const response = await api.post<ApiResponse<CompanyStaff>>('/company/staff', payload);
    return response.data;
  },

  updateStaff: async (id: number, payload: UpdateStaffPayload) => {
    const response = await api.put<ApiResponse<CompanyStaff>>(`/company/staff/${id}`, payload);
    return response.data;
  },

  updateStaffStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    const response = await api.patch<ApiResponse<CompanyStaff>>(`/company/staff/${id}/status`, { status });
    return response.data;
  },

  deleteStaff: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/company/staff/${id}`);
    return response.data;
  },

  getBookings: async () => {
    const response = await api.get<ApiResponse<UserBooking[]>>('/company/bookings');
    return response.data;
  },
  approveCancellation: async (bookingId: number, payload: { note?: string; shouldRefund?: boolean }) => {
    const response = await api.post<ApiResponse<UserBooking>>(`/company/bookings/${bookingId}/cancel`, payload);
    return response.data;
  },

  reportUser: async (payload: { userId: number; bookingId: number; reason: string }) => {
    const response = await api.post<ApiResponse<{ id: number }>>('/company/reports', payload);
    return response.data;
  },

  getReports: async () => {
    const response = await api.get<ApiResponse<
      Array<{
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
      }>
    >>('/company/reports');
    return response.data;
  },

  getTripReports: async (params?: { from?: string; to?: string; driverId?: number; limit?: number }) => {
    const response = await api.get<
      ApiResponse<{
        items: TripReportItem[];
        summary: TripReportSummary;
      }>
    >('/company/trip-reports', { params });
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
