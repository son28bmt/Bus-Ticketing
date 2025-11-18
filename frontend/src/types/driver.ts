import type { Trip } from './trip';

export interface DriverProfile {
  id: number;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  company?: {
    id: number;
    name: string;
    code: string;
  };
  licenseNumber?: string | null;
  phone?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface DriverStats {
  upcomingTrips: number;
  completedTrips: number;
}

export interface DriverProfileResponse {
  success: boolean;
  data: {
    driver: DriverProfile;
    stats: DriverStats;
  };
  message?: string;
}

export interface DriverBookingInfo {
  id: number;
  bookingCode: string;
  seatNumbers: number[];
  totalPrice: number;
  passengerName: string;
  passengerPhone: string;
  bookingStatus: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    phone?: string;
  };
}

export interface DriverTripStatusLog {
  id: number;
  previousStatus: string | null;
  newStatus: string;
  note?: string | null;
  createdAt: string;
  driver?: {
    id: number;
    user?: {
      id: number;
      name: string;
      phone?: string;
    };
  };
}

export interface DriverTripReport {
  id: number;
  note: string;
  createdAt: string;
  company?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface DriverTripSeatInfo {
  totalSeats: number;
  bookedSeats: number[];
  availableSeats: number;
}

export interface DriverTripDetailPayload {
  trip: Trip;
  bookings: DriverBookingInfo[];
  seatInfo: DriverTripSeatInfo;
  statusLogs: DriverTripStatusLog[];
  reports: DriverTripReport[];
}

export interface DriverTripsResponse {
  success: boolean;
  data: {
    trips: Trip[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
  message?: string;
}

export interface DriverTripDetailResponse {
  success: boolean;
  data: DriverTripDetailPayload;
  message?: string;
}

export interface DriverTripFilters {
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface DriverStatusUpdatePayload {
  status: string;
  note?: string;
}

