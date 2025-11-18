import type { Trip as BaseTrip, TripLocationDetails, TripRouteMeta } from './trip';
import type { Voucher } from './voucher';

export interface Seat {
  id: number;
  seatNumber: string;
  seatType: 'STANDARD' | 'VIP' | 'SLEEPER';
  isBooked?: boolean;
  priceMultiplier?: number;
}

export interface BookingSeatItem {
  id: number;
  bookingId: number;
  seatId: number;
  price: number;
  seat?: Seat;
}

export interface Trip extends Omit<BaseTrip, 'departureLocation' | 'arrivalLocation' | 'route' | 'routeMeta'> {
  route?: string | null;
  routeMeta?: TripRouteMeta | null;
  departureLocation: string;
  arrivalLocation: string;
  departureLocationDetails?: TripLocationDetails | null;
  arrivalLocationDetails?: TripLocationDetails | null;
  duration?: number | null;
  distance?: number | null;
  bus: BaseTrip['bus'] & { seats?: Seat[] };
}

export interface BookingData {
  tripId: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  seatNumbers: string[];
  totalPrice: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'E_WALLET' | 'VNPAY';
  notes?: string;
  voucherCode?: string;
  guestNotes?: Record<string, unknown> | string;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  data: {
    booking: UserBooking;
    payment: {
      id: number;
      paymentCode: string;
      amount: number;
      discountAmount: number;
      paymentMethod: string;
      paymentStatus: string;
      voucherId?: number | null;
      qrImageUrl?: string;
      vietqr?: {
        bankCode: string;
        accountNo: string;
        accountName: string;
        amount: number;
        addInfo: string;
      };
    };
    trip: Trip | null;
    voucher?: Voucher | null;
  };
}

export interface PaymentProcessData {
  transactionId: string;
  amount?: number;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'E_WALLET' | 'VNPAY';
  paymentDetails?: Record<string, unknown>;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment: {
      id: number;
      paymentCode: string;
      amount: number;
      discountAmount: number;
      paymentStatus: string;
      paidAt: string;
    };
    booking: UserBooking;
  };
}

export interface UserBooking {
  id: number;
  bookingCode: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  seatNumbers: string[];
  totalPrice: number;
  discountAmount: number;
  payableAmount?: number;
  voucherId?: number | null;
  voucher?: Voucher | null;
  paymentStatus: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'REFUND_PENDING';
  bookingStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'CANCEL_REQUESTED';
  paymentMethod: string;
  notes?: string;
  cancelReason?: string | null;
  refundAmount?: number | null;
  createdAt: string;
  updatedAt: string;
  trip: Trip;
  items?: BookingSeatItem[];
  payments: Array<{
    id: number;
    paymentCode: string;
    amount: number;
    discountAmount?: number;
    voucherId?: number | null;
    paymentMethod: string;
    paymentStatus: string;
    paidAt?: string;
  }>;
}

// API Error interface để tái sử dụng
export interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

