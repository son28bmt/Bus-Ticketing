import api from './api';
import type { BookingData, BookingResponse, PaymentProcessData, PaymentResponse, UserBooking } from '../types/payment';

export const bookingAPI = {
  // Tạo booking mới
  createBooking: async (bookingData: BookingData): Promise<BookingResponse> => {
    console.log('🔄 Creating booking:', bookingData);
    const response = await api.post('/bookings', bookingData);
    console.log('✅ Booking created:', response.data);
    return response.data;
  },

  // Xử lý thanh toán
  processPayment: async (paymentId: number, paymentData: PaymentProcessData): Promise<PaymentResponse> => {
    console.log('💳 Processing payment:', { paymentId, paymentData });
    const response = await api.post(`/bookings/payment/${paymentId}/process`, paymentData);
    console.log('✅ Payment processed:', response.data);
    return response.data;
  },

  // Lấy danh sách booking của user
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
    console.log('🔄 Getting user bookings:', params);
    const response = await api.get('/bookings/my-bookings', { params });
    console.log('✅ User bookings loaded:', response.data);
    return response.data;
  },

  // Lấy booking theo mã
  getBookingByCode: async (bookingCode: string): Promise<{
    success: boolean;
    data: { booking: UserBooking };
  }> => {
    console.log('🔄 Getting booking by code:', bookingCode);
    const response = await api.get(`/bookings/code/${bookingCode}`);
    console.log('✅ Booking loaded:', response.data);
    return response.data;
  },

  // Hủy booking
  cancelBooking: async (bookingId: number): Promise<{
    success: boolean;
    message: string;
  }> => {
    console.log('❌ Cancelling booking:', bookingId);
    const response = await api.patch(`/bookings/${bookingId}/cancel`);
    console.log('✅ Booking cancelled:', response.data);
    return response.data;
  }
};

export default bookingAPI;