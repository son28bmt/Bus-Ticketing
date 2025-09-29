export interface Seat {
  id: number;
  seatNumber: string;
  seatType: 'STANDARD' | 'VIP' | 'SLEEPER';
  isBooked?: boolean;
  priceMultiplier?: number;
}

export interface Trip {
  id: number;
  route: string;
  departureLocation: string;
  arrivalLocation: string;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
  totalSeats: number;
  availableSeats: number;
  status: string;
  duration: number;
  distance: number;
  bus: {
    id: number;
    busNumber: string;
    busType: string;
    capacity: number;
    facilities: string[];
    seats?: Seat[];
  };
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
}

export interface BookingResponse {
  success: boolean;
  message: string;
  data: {
    booking: {
      id: number;
      bookingCode: string;
      passengerName: string;
      passengerPhone: string;
      seatNumbers: string[];
      totalPrice: number;
      paymentStatus: string;
      bookingStatus: string;
      createdAt: string;
    };
    payment: {
      id: number;
      paymentCode: string;
      amount: number;
      paymentMethod: string;
      paymentStatus: string;
    };
    trip: {
      id: number;
      route: string;
      departureLocation: string;
      arrivalLocation: string;
      departureTime: string;
      arrivalTime: string;
    };
  };
}

export interface PaymentProcessData {
  transactionId: string;
  paymentDetails?: Record<string, unknown>;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment: {
      id: number;
      paymentCode: string;
      paymentStatus: string;
      paidAt: string;
    };
    booking: {
      bookingCode: string;
      paymentStatus: string;
    };
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
  paymentStatus: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  bookingStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  trip: Trip;
  payments: Array<{
    id: number;
    paymentCode: string;
    amount: number;
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