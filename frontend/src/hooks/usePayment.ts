import { useState, useCallback } from 'react';
import { bookingAPI } from '../services/booking';
import type { BookingData, BookingResponse, PaymentProcessData, PaymentResponse } from '../types/payment';

interface UsePaymentReturn {
  booking: BookingResponse['data'] | null;
  payment: PaymentResponse['data'] | null;
  isLoading: boolean;
  error: string | null;
  
  createBooking: (data: BookingData) => Promise<BookingResponse['data']>;
  processPayment: (paymentId: number, data: PaymentProcessData) => Promise<PaymentResponse['data']>;
  clearError: () => void;
  reset: () => void;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export const usePayment = (): UsePaymentReturn => {
  const [booking, setBooking] = useState<BookingResponse['data'] | null>(null);
  const [payment, setPayment] = useState<PaymentResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBooking = useCallback(async (data: BookingData): Promise<BookingResponse['data']> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await bookingAPI.createBooking(data);
      
      if (response.success) {
        setBooking(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Đặt vé thất bại');
      }
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.message || apiError.message || 'Lỗi đặt vé';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processPayment = useCallback(async (paymentId: number, data: PaymentProcessData): Promise<PaymentResponse['data']> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await bookingAPI.processPayment(paymentId, data);
      
      if (response.success) {
        setPayment(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Thanh toán thất bại');
      }
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.message || apiError.message || 'Lỗi thanh toán';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setBooking(null);
    setPayment(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    booking,
    payment,
    isLoading,
    error,
    createBooking,
    processPayment,
    clearError,
    reset
  };
};
