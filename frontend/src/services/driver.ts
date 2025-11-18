import api from './http';
import type {
  DriverProfileResponse,
  DriverTripsResponse,
  DriverTripFilters,
  DriverTripDetailResponse,
  DriverStatusUpdatePayload
} from '../types/driver';

export const driverAPI = {
  getProfile: async () => {
    const response = await api.get<DriverProfileResponse>('/driver/profile');
    return response.data;
  },

  getTrips: async (params: DriverTripFilters = {}) => {
    const response = await api.get<DriverTripsResponse>('/driver/trips', { params });
    return response.data;
  },

  getTripDetail: async (id: number | string) => {
    const response = await api.get<DriverTripDetailResponse>(`/driver/trips/${id}`);
    return response.data;
  },

  updateTripStatus: async (id: number | string, payload: DriverStatusUpdatePayload) => {
    const response = await api.patch<{ success: boolean; message?: string; trip?: unknown }>(
      `/driver/trips/${id}/status`,
      payload
    );
    return response.data;
  },

  reportTrip: async (id: number | string, note: string) => {
    const response = await api.post<{ success: boolean; message?: string }>(
      `/driver/trips/${id}/report`,
      { note }
    );
    return response.data;
  }
};

export default driverAPI;
