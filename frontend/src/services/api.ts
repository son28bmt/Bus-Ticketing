import axios, { AxiosError } from "axios";
import type { AxiosResponse } from 'axios';
import type { User, LoginResponse, RegisterResponse, RegisterUserData} from '../types/user';
import type { Trip, TripSearchParams as SearchParams } from '../types/trip';

// Using unified Trip type from types/trip

// ✅ API Response types
interface TripSearchResponse {
  success: boolean;
  message?: string;
  trips: Trip[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

interface LocationsResponse {
  success: boolean;
  message?: string;
  locations: {
    departure: Array<{
      id: number;
      name: string;
      code: string;
      province?: string;
    }>;
    arrival: Array<{
      id: number;
      name: string;
      code: string;
      province?: string;
    }>;
  };
}

type TripSearchParams = SearchParams;

// ✅ Compute base URL and ensure it includes `/api`
const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const BASE_URL = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`;

// ✅ Axios instance with proper error handling
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error: unknown) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ✅ Response interceptor with proper error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.status);
    return response;
  },
  (error: unknown) => {
    console.error('❌ API Error:', error);
    
    // ✅ Type-safe error handling
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Handle 401 errors
      if (axiosError.response?.status === 401) {
        const requestUrl = axiosError.config?.url || '';
        const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
        
        if (!isAuthRequest && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
      
      // Handle network errors
      if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNREFUSED') {
        console.error('❌ Network Error: Cannot connect to server');
        // You can show a toast notification here
      }
    }
    
    return Promise.reject(error);
  }
);

// ✅ Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    console.log('🔄 API: Sending login request...');
    try {
      const response: AxiosResponse<LoginResponse> = await api.post('/auth/login', { 
        email, 
        password 
      });
      console.log('✅ API: Login response received');
      return response.data;
    } catch (error) {
      console.error('❌ Login API Error:', error);
      throw error;
    }
  },
  
  register: async (userData: RegisterUserData): Promise<RegisterResponse> => {
    try {
      const response: AxiosResponse<RegisterResponse> = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('❌ Register API Error:', error);
      throw error;
    }
  },

  profile: async (): Promise<{ user: User }> => {
    try {
      const response: AxiosResponse<{ user: User }> = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      console.error('❌ Profile API Error:', error);
      throw error;
    }
  }
};

// ✅ Trip API with proper error handling
export const tripAPI = {
  // ✅ Search trips with proper typing
  searchTrips: async (params: TripSearchParams): Promise<TripSearchResponse> => {
    console.log('🔄 API Request: GET /trips/search', params);
    
    try {
      const response = await api.get<TripSearchResponse>('/trips/search', { params });
      console.log('✅ Search trips response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Search trips error:', error);
      
      // ✅ Return fallback structure with proper typing
      const fallbackResponse: TripSearchResponse = {
        success: false,
        message: axios.isAxiosError(error) ? 
          (error.response?.data?.message || error.message || 'Lỗi tìm kiếm chuyến xe') : 
          'Lỗi tìm kiếm chuyến xe',
        trips: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          limit: 10
        }
      };
      
      return fallbackResponse;
    }
  },

  // ✅ Get locations with proper typing
  getLocations: async (): Promise<LocationsResponse> => {
    console.log('🔄 Getting locations...');
    
    try {
      const response = await api.get<LocationsResponse>('/trips/locations');
      console.log('✅ Locations response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Get locations error:', error);
      
      // ✅ Return fallback structure with proper typing
      const fallbackResponse: LocationsResponse = {
        success: false,
        message: axios.isAxiosError(error) ? 
          (error.response?.data?.message || error.message || 'Lỗi lấy danh sách địa điểm') : 
          'Lỗi lấy danh sách địa điểm',
        locations: {
          departure: [],
          arrival: []
        }
      };
      
      return fallbackResponse;
    }
  },

  // ✅ Get featured trips
  getFeatured: async (): Promise<TripSearchResponse> => {
    console.log('🔄 Getting featured trips...');
    
    try {
      const response = await api.get<TripSearchResponse>('/trips/featured');
      console.log('✅ Featured trips:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Get featured trips error:', error);
      
      const fallbackResponse: TripSearchResponse = {
        success: false,
        message: axios.isAxiosError(error) ? 
          (error.response?.data?.message || error.message || 'Lỗi lấy chuyến xe nổi bật') : 
          'Lỗi lấy chuyến xe nổi bật',
        trips: []
      };
      
      return fallbackResponse;
    }
  },

  // ✅ Get trip by ID
  getById: async (id: string): Promise<{ success: boolean; trip?: Trip; message?: string }> => {
    try {
      const response = await api.get(`/trips/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Get trip by ID error:', error);
      throw error;
    }
  }
};

export default api;