import api from './http';
import type { BookingData, BookingResponse, PaymentProcessData, PaymentResponse, UserBooking } from '../types/payment';

export const bookingAPI = {
  createBooking: async (bookingData: BookingData): Promise<BookingResponse> => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  processPayment: async (paymentId: number, paymentData: PaymentProcessData): Promise<PaymentResponse> => {
    const response = await api.post(`/bookings/payment/${paymentId}/process`, paymentData);
    return response.data;
  },

  getUserBookings: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    success: boolean;
    data: {
      bookings: UserBooking[];
      pagination: {
        total: number;
        page: number;
        pages: number;
        limit: number;
      };
    };
  }> => {
    const response = await api.get('/bookings/my-bookings', { params });
    return response.data;
  },

  getBookingByCode: async (bookingCode: string): Promise<{
    success: boolean;
    data: { booking: UserBooking };
  }> => {
    const response = await api.get(`/bookings/code/${bookingCode}`);
    return response.data;
  },

  requestCancellation: async (
    bookingId: number,
    payload: { reason: string; note?: string }
  ): Promise<{
    success: boolean;
    message: string;
    booking?: UserBooking;
  }> => {
    const response = await api.post<{ success: boolean; message: string; booking: UserBooking }>(
      `/bookings/${bookingId}/cancel-request`,
      payload
    );
    return response.data;
  }
};

export default bookingAPI;
