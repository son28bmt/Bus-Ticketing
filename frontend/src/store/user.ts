import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';
import type { User, LoginResponse, RegisterResponse, RegisterUserData, ApiError } from '../types/user';

interface UserState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterUserData) => Promise<void>;
  logout: () => void;
  initializeUser: () => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        try {
          console.log('🔄 Store: Starting login process...');
          set({ isLoading: true, error: null });
          
          const response: LoginResponse = await authAPI.login(email, password);
          console.log('✅ Store: API response received', response);
          
          if (response.token && response.user) {
            set({ 
              user: response.user, 
              token: response.token, 
              isLoading: false 
            });
            
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            
            console.log('✅ Store: Login successful, user stored');
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error: unknown) {
          console.error('❌ Store: Login error', error);
          
          const apiError = error as ApiError;
          const errorMessage = apiError.response?.data?.message || 
                              apiError.message || 
                              'Đăng nhập thất bại';
          
          set({ 
            isLoading: false, 
            error: errorMessage
          });
          
          throw error;
        }
      },

      register: async (userData: RegisterUserData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response: RegisterResponse = await authAPI.register(userData);
          
          if (response.message === 'Đăng ký thành công') {
            await get().login(userData.email, userData.password);
          }
          
          set({ isLoading: false });
        } catch (error: unknown) {
          const apiError = error as ApiError;
          const errorMessage = apiError.response?.data?.message || 
                              apiError.message || 
                              'Đăng ký thất bại';
          
          set({ 
            isLoading: false, 
            error: errorMessage
          });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      },

      initializeUser: () => {
        set({ isLoading: true });
        
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
          try {
            const parsedUser: unknown = JSON.parse(userStr);
            
            if (isValidUser(parsedUser)) {
              set({ user: parsedUser, token, isLoading: false });
            } else {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              console.warn('Invalid user data in localStorage');
              set({ isLoading: false });
            }
          } catch (error: unknown) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            console.error('Failed to parse user data:', error);
            set({ isLoading: false });
          }
        } else {
          set({ isLoading: false });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'user-store',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token 
      }),
    }
  )
);

// Type guard function
function isValidUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'email' in obj &&
    'phone' in obj &&
    'role' in obj &&
    'status' in obj &&
    typeof (obj as Record<string, unknown>).id === 'number' &&
    typeof (obj as Record<string, unknown>).name === 'string' &&
    typeof (obj as Record<string, unknown>).email === 'string' &&
    typeof (obj as Record<string, unknown>).phone === 'string' &&
    ['ADMIN', 'PASSENGER'].includes((obj as Record<string, unknown>).role as string) &&
    ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes((obj as Record<string, unknown>).status as string)
  );
}

export type { User };