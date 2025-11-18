import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/auth';
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
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setAvatar: (avatarUrl: string) => void;
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
          console.log('ðŸ”„ Store: Starting login process...');
          set({ isLoading: true, error: null });
          
          const response: LoginResponse = await authAPI.login(email, password);
          console.log('âœ… Store: API response received', response);
          
          if (response.token && response.user) {
            set({ 
              user: response.user, 
              token: response.token, 
              isLoading: false 
            });
            
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            
            console.log('âœ… Store: Login successful, user stored');
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error: unknown) {
          console.error('âŒ Store: Login error', error);
          
          const apiError = error as ApiError;
          const errorMessage = apiError.response?.data?.message || 
                              apiError.message || 
                              'ÄÄƒng nháº­p tháº¥t báº¡i';
          
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
          
          if (response.message === 'ÄÄƒng kÃ½ thÃ nh cÃ´ng') {
            await get().login(userData.email, userData.password);
          }
          
          set({ isLoading: false });
        } catch (error: unknown) {
          const apiError = error as ApiError;
          const errorMessage = apiError.response?.data?.message || 
                              apiError.message || 
                              'ÄÄƒng kÃ½ tháº¥t báº¡i';
          
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

      updateProfile: async (data: { name?: string; phone?: string }) => {
        try {
          set({ isLoading: true, error: null });
          const res = await authAPI.updateProfile(data);
          if (res.success && res.user) {
            const updated = res.user;
            set((state) => ({ user: { ...state.user!, ...updated }, isLoading: false }));
            localStorage.setItem('user', JSON.stringify({ ...get().user, ...updated }));
          } else {
            set({ isLoading: false, error: res.message || 'Cáº­p nháº­t tháº¥t báº¡i' });
          }
        } catch (error: unknown) {
          const apiError = error as ApiError;
          set({ isLoading: false, error: apiError.response?.data?.message || apiError.message || 'Cáº­p nháº­t tháº¥t báº¡i' });
          throw error;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        try {
          set({ isLoading: true, error: null });
          const res = await authAPI.changePassword({ currentPassword, newPassword });
          if (!res.success) {
            set({ isLoading: false, error: res.message || 'Đổi mật khẩu thất bại' });
            throw new Error(res.message || 'Đổi mật khẩu thất bại');
          }
          set({ isLoading: false });
        } catch (error: unknown) {
          const apiError = error as ApiError;
          set({ isLoading: false, error: apiError.response?.data?.message || apiError.message || 'Đổi mật khẩu thất bại' });
          throw error;
        }
      },

      setAvatar: (avatarUrl: string) => {
        set((state) => {
          const updated = state.user ? { ...state.user, avatarUrl } : null;
          if (updated) {
            localStorage.setItem('user', JSON.stringify(updated));
          }
          return { user: updated } as Partial<UserState> as UserState;
        });
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
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const record = obj as Record<string, unknown>;
  const { id, name, email, phone, role, status } = record;

  if (typeof id !== 'number' || typeof name !== 'string' || typeof email !== 'string' || typeof phone !== 'string') {
    return false;
  }

  if (typeof role !== 'string' || !['admin', 'company', 'driver', 'passenger'].includes(role.toLowerCase())) {
    return false;
  }

  if (typeof status !== 'string' || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    return false;
  }

  if ('companyId' in record) {
    const companyId = record.companyId;
    if (companyId !== null && typeof companyId !== 'number') {
      return false;
    }
  }

  if ('driverId' in record) {
    const driverId = record.driverId;
    if (driverId !== null && driverId !== undefined && typeof driverId !== 'number') {
      return false;
    }
  }

  if ('driverProfile' in record) {
    const profile = record.driverProfile;
    if (profile !== null && profile !== undefined) {
      if (typeof profile !== 'object') {
        return false;
      }
      const profileRecord = profile as Record<string, unknown>;
      if (typeof profileRecord.id !== 'number' || typeof profileRecord.companyId !== 'number') {
        return false;
      }
      if ('status' in profileRecord && typeof profileRecord.status !== 'string') {
        return false;
      }
    }
  }

  return true;
}
export default useUserStore;
export type { User };



