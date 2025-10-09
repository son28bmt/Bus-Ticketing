import api from './api';
import type { Trip } from '../types/trip';
import type { UserBooking } from '../types/payment';

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

  // Buses
  getBuses: async (params?: Record<string, unknown>) => {
    const res = await api.get('/admin/buses', { params });
    return res.data as Paginated<{ buses: Array<{ id: number; busNumber: string; busType: string; totalSeats: number; isActive: boolean; company?: { id: number; name: string; code: string } }> }>;
  },
  createBus: async (payload: { companyId?: number; busNumber: string; busType: string; totalSeats: number; facilities?: string[]; isActive?: boolean }) => {
    const res = await api.post('/admin/buses', payload);
    return res.data;
  },
  updateBus: async (id: number, payload: { busNumber?: string; busType?: string; totalSeats?: number; facilities?: string[]; isActive?: boolean }) => {
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
  }
};
