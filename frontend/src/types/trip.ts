// Unified Trip-related types used across the app

export interface Location {
  id: number;
  name: string;
  code?: string;
  province?: string;
}

export interface BusCompanyRef {
  id: number;
  name: string;
  code: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankCode?: string;
}

export interface TripSeat {
  id: number | null;
  seatNumber: string;
  seatType: 'STANDARD' | 'VIP' | 'SLEEPER';
  priceMultiplier?: number;
  isActive?: boolean;
  isBooked?: boolean;
}

export interface Bus {
  id: number;
  busNumber: string;
  busType: string; // e.g., 'SLEEPER' | 'SEAT' | 'LIMOUSINE' | 'VIP'
  capacity: number;
  totalSeats?: number;
  facilities: string[];
  company?: BusCompanyRef;
  seats?: TripSeat[];
}

// export interface TripLocationDetails extends Location {}
export interface TripLocationDetails  {
  id: number;
  name: string;
  province: string;
}

export interface TripRouteMeta {
  id?: number;
  fromLocationId: number;
  toLocationId: number;
  distanceKm?: number;
  basePrice?: number;
  durationMin?: number;
}

export interface Trip {
  id: number;
  departureTime: string; // ISO datetime
  arrivalTime: string; // ISO datetime
  basePrice: number;
  totalSeats: number;
  availableSeats: number;
  companyId?: number;
  busId?: number;
  driverId?: number | null;
  status: string; // e.g., 'SCHEDULED' | 'CANCELLED'
  bus: Bus;
  departureLocation: {
    id: number;
    name: string;
    province: string;
  };
  arrivalLocation: {
    id: number;
    name: string;
    province: string;
  };
  departureLocationDetails?: TripLocationDetails | null;
  arrivalLocationDetails?: TripLocationDetails | null;
  route?: string | null;
  routeMeta?: TripRouteMeta | null;
  company?: BusCompanyRef | null;
  driver?: {
    id: number;
    status?: string;
    user?: {
      id: number;
      name: string;
      email?: string;
      phone?: string;
    };
  } | null;
  isAvailable?: boolean;
  bookedSeatNumbers?: string[];
}

export interface TripSearchParams {
  from: string;
  to: string;
  departureDate: string;
  passengerCount?: number;
}
