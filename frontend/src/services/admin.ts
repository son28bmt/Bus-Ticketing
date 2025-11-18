import api from './http';
import type { Trip } from '../types/trip';
import type { UserBooking } from '../types/payment';
import type { Voucher } from '../types/voucher';

export interface Paginated<T> {
  success: boolean;
  data: {
    [key: string]: unknown;
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  } & T;
}

export interface BookingStatsSummary {
  totalBookings: number;
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
}

export interface BookingStatsResponse {
  success: boolean;
  data: BookingStatsSummary;
  message?: string;
}

export interface DriverSummary {
  id: number;
  companyId: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  licenseNumber?: string | null;
  phone?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface AdminVoucherListResponse {
  success: boolean;
  data: Voucher[];
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface VoucherPayload {
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
  companyId?: number | null;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface BusCompany {
  id: number;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  logo?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const adminAPI = {
  // Trips
  getTrips: async (params?: Record<string, unknown>) => {
    const res = await api.get('/admin/trips', { params });
    return res.data as Paginated<{ trips: Trip[] }>;
  },
  createTrip: async (payload: Record<string, unknown>) => {
    const res = await api.post('/admin/trips', payload);
    return res.data;
  },
  updateTrip: async (id: number, payload: Partial<Record<string, unknown>>) => {
    const res = await api.put(`/admin/trips/${id}`, payload);
    return res.data;
  },
  deleteTrip: async (id: number) => {
    const res = await api.delete(`/admin/trips/${id}`);
    return res.data;
  },
  getTripDetails: async (id: number) => {
    const res = await api.get(`/admin/trips/${id}/details`);
    return res.data;
  },
  getDrivers: async (params?: Record<string, unknown>) => {
    const res = await api.get('/admin/drivers', { params });
    return res.data as Paginated<{ drivers: DriverSummary[] }>;
  },

  // Buses
  getBuses: async (params?: Record<string, unknown>) => {
    const res = await api.get('/admin/buses', { params });
    return res.data as Paginated<{ buses: Array<{ id: number; busNumber: string; busType: string; totalSeats: number; isActive: boolean; company?: { id: number; name: string; code: string } }> }>;
  },
  createBus: async (payload: { companyId?: number; busNumber: string; busType: string; totalSeats: number; facilities?: string[]; isActive?: boolean }) => {
    const res = await api.post('/admin/buses', payload);
    return res.data;
  },
  updateBus: async (id: number, payload: { busNumber?: string; busType?: string; totalSeats?: number; facilities?: string[]; isActive?: boolean; companyId?: number }) => {
    const res = await api.put(`/admin/buses/${id}`, payload);
    return res.data;
  },
  deleteBus: async (id: number) => {
    const res = await api.delete(`/admin/buses/${id}`);
    return res.data;
  },

  // Locations
  getLocations: async () => {
    const res = await api.get('/trips/locations');
    return res.data as { success: boolean; locations: { departure: Array<{ id: number; name: string }>; arrival: Array<{ id: number; name: string }> } };
  },

  // Bookings
  getBookings: async (params?: Record<string, unknown>) => {
    const res = await api.get('/admin/bookings', { params });
    return res.data as Paginated<{ bookings: UserBooking[] }>;
  },

  getBookingStats: async () => {
    const res = await api.get<BookingStatsResponse>('/admin/bookings/stats');
    return res.data;
  },

  // Companies
  getCompanies: async (params?: Record<string, unknown>) => {
    const res = await api.get('/admin/companies', { params });
    return res.data as {
      success: boolean;
      data: BusCompany[];
      pagination?: {
        total: number;
        page: number;
        pages: number;
        limit: number;
      };
    };
  },
  createCompany: async (payload: {
    name: string;
    code: string;
    email?: string;
    phone?: string;
    address?: string;
    description?: string;
    isActive?: boolean;
  }) => {
    const res = await api.post('/admin/companies', payload);
    return res.data as { success: boolean; data?: BusCompany; message?: string };
  },

  // Vouchers
  getVouchers: async (params?: Record<string, unknown>) => {
    const res = await api.get<AdminVoucherListResponse>('/admin/vouchers', { params });
    return res.data;
  },
  getVoucher: async (id: number) => {
    const res = await api.get<{ success: boolean; data: Voucher }>(`/admin/vouchers/${id}`);
    return res.data;
  },
  createVoucher: async (payload: VoucherPayload) => {
    const res = await api.post<{ success: boolean; data: Voucher; message?: string }>('/admin/vouchers', payload);
    return res.data;
  },
  updateVoucher: async (id: number, payload: Partial<VoucherPayload>) => {
    const res = await api.put<{ success: boolean; data: Voucher; message?: string }>(`/admin/vouchers/${id}`, payload);
    return res.data;
  },
  toggleVoucher: async (id: number, isActive: boolean) => {
    const res = await api.patch<{ success: boolean; data: Voucher; message?: string }>(`/admin/vouchers/${id}/status`, { isActive });
    return res.data;
  },
  archiveVoucher: async (id: number) => {
    const res = await api.delete<{ success: boolean; message?: string }>(`/admin/vouchers/${id}`);
    return res.data;
  }
};
