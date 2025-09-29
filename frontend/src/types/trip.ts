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
}

export interface Bus {
  id: number;
  busNumber: string;
  busType: string; // e.g., 'SLEEPER' | 'SEAT' | 'LIMOUSINE' | 'VIP'
  capacity: number;
  totalSeats?: number;
  facilities: string[];
  company?: BusCompanyRef;
}

export interface Trip {
  id: number;
  departureTime: string; // ISO datetime
  arrivalTime: string; // ISO datetime
  basePrice: number;
  totalSeats: number;
  availableSeats: number;
  status: string; // e.g., 'SCHEDULED' | 'CANCELLED'
  bus: Bus;
  departureLocation?: Location;
  arrivalLocation?: Location;
  company?: { id: number; name: string };
  isAvailable?: boolean;
}

export interface TripSearchParams {
  from: string;
  to: string;
  departureDate: string;
  passengerCount?: number;
}