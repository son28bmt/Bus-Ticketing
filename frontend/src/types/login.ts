import type { User } from './user';

export interface LoginRequest {
  email: string;
  password: string;
}

// Note: Renamed to avoid conflict with User.LoginResponse
export interface AuthLoginResponseAlt {
  user: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role' | 'companyId' | 'status'>;
  token: string;
  message?: string;
}
