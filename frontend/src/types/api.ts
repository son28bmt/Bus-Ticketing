import axios from "axios";
import type { AxiosResponse } from 'axios';

// User type matching với store
interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'PASSENGER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt?: string;
  updatedAt?: string;
}

interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

interface RegisterResponse {
  message: string;
  user: User;
}

interface RegisterUserData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

// Trip types...
interface Trip {
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
  };
}

interface TripSearchResponse {
  trips: Trip[];
  total: number;
  searchParams?: {
    from: string;
    to: string;
    date: string;
    passengers: number;
  };
}

interface LocationsResponse {
  locations: string[];
  departures: string[];
  arrivals: string[];
  routes: Array<{
    from: string;
    to: string;
  }>;
}

interface TripSearchParams {
  from: string;
  to: string;
  date: string;
  passengers: number;
}

// Axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Type guard để kiểm tra error có response không
    if (isAxiosError(error) && error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
      
      if (!isAuthRequest && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Type guard for Axios error
function isAxiosError(error: unknown): error is { response?: { status?: number }; config?: { url?: string } } {
  return typeof error === 'object' && error !== null && 'response' in error;
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    console.log('🔄 API: Sending login request...');
    const response: AxiosResponse<LoginResponse> = await api.post('/auth/login', { 
      email, 
      password 
    });
    console.log('✅ API: Login response received');
    return response.data;
  },
  
  register: async (userData: RegisterUserData): Promise<RegisterResponse> => {
    const response: AxiosResponse<RegisterResponse> = await api.post('/auth/register', userData);
    return response.data;
  },

  profile: async (): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.get('/auth/profile');
    return response.data;
  }
};

// Trip API
export const tripAPI = {
  search: async (params: TripSearchParams): Promise<TripSearchResponse> => {
    const response: AxiosResponse<TripSearchResponse> = await api.get('/trips/search', { params });
    return response.data;
  },

  getFeatured: async (): Promise<TripSearchResponse> => {
    const response: AxiosResponse<TripSearchResponse> = await api.get('/trips/featured');
    return response.data;
  },

  getLocations: async (): Promise<LocationsResponse> => {
    const response: AxiosResponse<LocationsResponse> = await api.get('/trips/locations');
    return response.data;
  },

  getById: async (id: string): Promise<{ trip: Trip }> => {
    const response: AxiosResponse<{ trip: Trip }> = await api.get(`/trips/${id}`);
    return response.data;
  }
};

export default api;