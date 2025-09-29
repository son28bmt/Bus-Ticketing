import { useState } from 'react';
import { useUserStore } from '../store/user';

// Types
interface VNPayBank {
  code: string;
  name: string;
}

interface VNPayTransaction {
  id: number;
  orderId: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  transactionNo?: string;
  responseCode?: string;
  responseMessage?: string;
  paidAt?: string;
  createdAt: string;
}

interface CreateVNPayUrlParams {
  bookingId: number;
  bankCode?: string;
}

interface CreateVNPayUrlResponse {
  paymentUrl: string;
  orderId: string;
  amount: number;
  paymentId: number;
  vnpayTransactionId: number;
}

// Invoice types
export interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
}

export interface InvoiceData {
  receiptNo: string;
  issuedAt: string;
  method: string;
  status: string;
  transactionId?: string;
  amount: number;
  items: InvoiceItem[];
  booking?: {
    id: number;
    code: string;
    seats: string[];
    totalPrice: number;
    paymentStatus: string;
  };
  trip?: {
    id: number;
    departureTime: string;
    arrivalTime: string;
    from?: string;
    to?: string;
  };
  customer?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  vnpay?: {
    orderId: string;
    transactionNo?: string;
    responseCode?: string;
    responseMessage?: string;
    status: string;
    paidAt?: string;
  };
}

export const useVNPay = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useUserStore();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Tạo URL thanh toán VNPay
  const createPaymentUrl = async (params: CreateVNPayUrlParams): Promise<CreateVNPayUrlResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/payment/vnpay/create-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Không thể tạo URL thanh toán VNPay');
      }

      console.log('✅ VNPay payment URL created:', data.data);

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(errorMessage);
      console.error('❌ Create VNPay URL error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách ngân hàng hỗ trợ
  const getSupportedBanks = async (): Promise<VNPayBank[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/payment/vnpay/banks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Không thể lấy danh sách ngân hàng');
      }

      console.log('✅ VNPay banks loaded:', data.data.length);

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(errorMessage);
      console.error('❌ Get banks error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Tra cứu trạng thái giao dịch VNPay
  const queryTransaction = async (orderId: string): Promise<VNPayTransaction> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/payment/vnpay/transaction/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Không thể tra cứu giao dịch');
      }

      console.log('✅ VNPay transaction queried:', data.data);

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(errorMessage);
      console.error('❌ Query transaction error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Lấy lịch sử giao dịch VNPay
  const getTransactionHistory = async (page: number = 1, limit: number = 10): Promise<{
    transactions: VNPayTransaction[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/payment/vnpay/transactions?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Không thể lấy lịch sử giao dịch');
      }

      console.log('✅ VNPay transaction history loaded:', data.data);

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(errorMessage);
      console.error('❌ Get transaction history error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Thanh toán qua VNPay
  const payWithVNPay = async (bookingId: number, bankCode?: string): Promise<void> => {
    try {
      console.log('🔄 Starting VNPay payment:', { bookingId, bankCode });

      // Tạo URL thanh toán
      const paymentData = await createPaymentUrl({ bookingId, bankCode });

      // Chuyển hướng user tới VNPay
      window.location.href = paymentData.paymentUrl;
    } catch (err) {
      console.error('❌ Pay with VNPay error:', err);
      throw err;
    }
  };

  // Lấy hóa đơn thanh toán
  const getInvoice = async (paymentId: number): Promise<InvoiceData> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/payment/invoice/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Không thể lấy hóa đơn');
      }

      return data.data as InvoiceData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(errorMessage);
      console.error('❌ Get invoice error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Helper function để lấy tên ngân hàng từ code
  const getBankName = (bankCode: string, banks: VNPayBank[]): string => {
    const bank = banks.find(b => b.code === bankCode);
    return bank ? bank.name : bankCode;
  };

  // Helper function để format số tiền VNPay (VND)
  const formatVNPayAmount = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Helper function để lấy màu trạng thái
  const getStatusColor = (status: string): string => {
    const colors = {
      PENDING: '#f59e0b', // amber
      SUCCESS: '#10b981', // green
      FAILED: '#ef4444',  // red
      CANCELLED: '#6b7280' // gray
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  // Helper function để lấy tên trạng thái
  const getStatusText = (status: string): string => {
    const texts = {
      PENDING: 'Đang chờ',
      SUCCESS: 'Thành công',
      FAILED: 'Thất bại',
      CANCELLED: 'Đã hủy'
    };
    return texts[status as keyof typeof texts] || status;
  };

  return {
    // States
    loading,
    error,

    // Actions
    createPaymentUrl,
    getSupportedBanks,
    queryTransaction,
    getTransactionHistory,
    payWithVNPay,
  getInvoice,

    // Helpers
    getBankName,
    formatVNPayAmount,
    getStatusColor,
    getStatusText
  };
};