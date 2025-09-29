import type { Trip } from './trip';

// Định nghĩa kiểu đặt chỗ
export interface Booking {
  id: string;
  userId: string;
  tripId: string;
  seatNumber: number;
  bookingDate: string; // ISO date string
  status: "confirmed" | "cancelled";
}

// API Booking type (khác với Booking hiện tại)
export interface ApiBooking {
  id: string;
  tripId: string;
  userId: number;
  passengerName: string;
  passengerPhone: string;
  seatNumber: number;
  status: 'CONFIRMED' | 'CANCELLED' | 'PENDING';
  createdAt: string;
  trip: Trip;
}

export interface CreateBookingRequest {
  tripId: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: number;
}